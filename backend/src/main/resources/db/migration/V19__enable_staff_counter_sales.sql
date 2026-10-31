-- PROPOSAL: isolated-test location only. NOT installed by normal Flyway startup.
-- PRIMARY installation requires separate approval. V1-V18 remain unchanged.
ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN selling_staff_id bigint REFERENCES users(id),
 ADD COLUMN owner_id bigint GENERATED ALWAYS AS (coalesce(customer_id,selling_staff_id)) STORED,
 ADD CONSTRAINT chk_bookings_sale_owner CHECK ((customer_id IS NOT NULL) <> (selling_staff_id IS NOT NULL)),
 ADD CONSTRAINT uq_bookings_sale_owner UNIQUE(id,showtime_id,owner_id);
ALTER TABLE seat_holds DROP CONSTRAINT fk_seat_holds_booking_owner;
ALTER TABLE seat_holds ADD CONSTRAINT fk_seat_holds_booking_owner FOREIGN KEY(booking_id,showtime_id,user_id)
 REFERENCES bookings(id,showtime_id,owner_id);
CREATE INDEX idx_bookings_counter_owner ON bookings(selling_staff_id,id) WHERE selling_staff_id IS NOT NULL;

DO $upgrade$
DECLARE ns text:=current_schema(); f record; source text; old text; replacement text;
BEGIN
 -- Share the original locking/pricing/expiry/freeze machinery, not a second POS lifecycle.
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname=ns AND p.proname IN ('guard_seat_hold','guard_booking_seat','assert_booking',
 'booking_composition_eligible','payment_settlement_eligible','create_booking','cancel_booking',
 'initiate_payment','bind_vnpay_submission','edit_booking_promotion') LOOP
  source:=pg_get_functiondef(f.oid);
  IF position('customer_id' IN source)=0 THEN RAISE EXCEPTION 'Missing ownership anchor: %',f.proname; END IF;
  source:=replace(source,'customer_id','owner_id');
  IF f.proname='create_booking' THEN
   source:=replace(source,'booking_code,owner_id,showtime_id','booking_code,customer_id,selling_staff_id,showtime_id');
   old:='p_user,p_showtime,v_price*cardinality(p_holds)';
   replacement:=format('(SELECT id FROM %1$I.users WHERE id=p_user AND role=''CUSTOMER''),(SELECT id FROM %1$I.users WHERE id=p_user AND role=''STAFF''),p_showtime,v_price*cardinality(p_holds)',ns);
   IF position(old IN source)=0 THEN RAISE EXCEPTION 'Missing creation anchor'; END IF;
   source:=replace(source,old,replacement);
  END IF;
  IF f.proname IN ('guard_seat_hold','booking_composition_eligible') THEN
   old:='u.role=''CUSTOMER''';
   replacement:=format('(u.role=''CUSTOMER'' OR (u.role=''STAFF'' AND EXISTS(SELECT 1 FROM %1$I.cinema_assignments a WHERE a.user_id=u.id AND a.cinema_id=h.cinema_id AND a.assignment_type=''STAFF'' AND a.status=''ACTIVE'' AND a.effective_at<=clock_timestamp())))',ns);
   IF position(old IN source)=0 THEN RAISE EXCEPTION 'Missing role anchor'; END IF;
   source:=replace(source,old,replacement);
  END IF;
  EXECUTE source;
 END LOOP;
 -- Stored generated values are computed AFTER BEFORE triggers. Compare their
 -- immutable input columns, not NEW.owner_id (temporarily null in that trigger).
 source:=pg_get_functiondef(format('%I.guard_booking()',ns)::regprocedure);
 IF position('to_jsonb(NEW)' IN source)=0 THEN RAISE EXCEPTION 'Missing Booking immutability anchor'; END IF;
 source:=replace(replace(source,'to_jsonb(NEW)','(to_jsonb(NEW)-''owner_id'')'),'to_jsonb(OLD)','(to_jsonb(OLD)-''owner_id'')');
 EXECUTE source;
 source:=pg_get_functiondef(format('%I.lock_hold_context(bigint,bigint)',ns)::regprocedure);
 old:='role=''CUSTOMER'' AND status=''ACTIVE''';
 IF position(old IN source)=0 THEN RAISE EXCEPTION 'Missing context role anchor'; END IF;
 source:=replace(source,old,'role IN (''CUSTOMER'',''STAFF'') AND status=''ACTIVE''');
 old:='-- Publication is part of eligibility too; catalog-only writers take no later locks.';
 IF position(old IN source)=0 THEN RAISE EXCEPTION 'Missing context scope anchor'; END IF;
 source:=replace(source,old,format($scope$
 IF EXISTS(SELECT 1 FROM %1$I.users WHERE id=p_user AND role='STAFF') AND NOT EXISTS(
 SELECT 1 FROM %1$I.cinema_assignments WHERE user_id=p_user AND cinema_id=v_cinema
 AND assignment_type='STAFF' AND status='ACTIVE' AND effective_at<=clock_timestamp()) THEN
 RAISE EXCEPTION USING ERRCODE='P0004',MESSAGE='Staff scope unavailable'; END IF;
 -- Publication is part of eligibility too;
 $scope$,ns)); EXECUTE source;
 -- Holding User SHARE above serializes account/assignment administration (User UPDATE).
 EXECUTE format('GRANT SELECT ON %I.cinema_assignments TO smart_cinema_hold_owner',ns);
END $upgrade$;

-- Keep all existing VNPAY binding checks verbatim; add a disjoint CASH binding.
DO $cash_binding$
DECLARE ns text:=current_schema(); original text;
BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO original FROM pg_constraint
 WHERE conrelid=format('%I.payment_transactions',ns)::regclass AND conname='chk_payment_transactions_binding';
 IF original IS NULL THEN RAISE EXCEPTION 'Missing VNPAY binding'; END IF;
 EXECUTE format('ALTER TABLE %I.payment_transactions DROP CONSTRAINT chk_payment_transactions_binding',ns);
 EXECUTE format($sql$ALTER TABLE %I.payment_transactions ADD CONSTRAINT chk_payment_transactions_binding CHECK (
 (%s) OR (provider='CASH' AND currency='VND' AND environment='COUNTER' AND status='SUCCESS'
 AND merchant_code IS NULL AND merchant_reference IS NULL AND submitted_amount IS NULL
 AND provider_created_at IS NULL AND provider_expires_at IS NULL AND return_url IS NULL AND client_ip IS NULL
 AND external_reference IS NULL AND NOT reconciliation_required) IS TRUE)$sql$,ns,original);
 EXECUTE format('ALTER TABLE %I.payment_evidence DROP CONSTRAINT payment_evidence_source_check',ns);
 EXECUTE format('ALTER TABLE %I.payment_evidence ADD CONSTRAINT payment_evidence_source_check CHECK(source IN (''IPN'',''QUERY'',''CASH''))',ns);
END $cash_binding$;

DO $definitions$
DECLARE ns text:=current_schema(); ddl text:=$ddl$
-- Read-only proof oracle for reporting: no audit rows, actor IDs or metadata leave
-- this protected boundary. Account blocking later does not erase historical sales.
CREATE FUNCTION app.cash_payment_confirmed(p_payment bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $b$
 SELECT EXISTS(SELECT 1 FROM app.payment_transactions p JOIN app.bookings b ON b.id=p.booking_id
 WHERE p.id=p_payment AND p.provider='CASH' AND p.currency='VND' AND p.environment='COUNTER'
 AND p.status='SUCCESS' AND p.completed_at IS NOT NULL AND NOT p.reconciliation_required
 AND p.amount=b.final_amount AND b.selling_staff_id IS NOT NULL
 AND EXISTS(SELECT 1 FROM app.payment_evidence e WHERE e.payment_id=p.id AND e.source='CASH' AND e.result='SUCCESS')
 AND EXISTS(SELECT 1 FROM app.audit_records a WHERE a.resource_type='PAYMENT' AND a.resource_id=p.id
 AND a.action='CASH_RECEIVED' AND a.actor_user_id=b.selling_staff_id
 AND a.metadata->>'amount'=p.amount::text AND a.metadata->>'currency'='VND'
 AND a.occurred_at>=p.initiated_at AND a.occurred_at<=p.completed_at))
$b$;
-- A single issuance implementation for verified VNPAY and authorized CASH.
CREATE FUNCTION app.finalize_sale(p_booking bigint,p_payment bigint,p_evidence bigint,p_actor bigint) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $b$
DECLARE v_now timestamptz:=clock_timestamp();
BEGIN
 IF NOT EXISTS(SELECT 1 FROM app.payment_transactions p JOIN app.payment_evidence e ON e.payment_id=p.id
 WHERE p.id=p_payment AND p.booking_id=p_booking AND p.status='SUCCESS' AND e.id=p_evidence AND e.result='SUCCESS'
 AND ((p.provider='VNPAY' AND e.source IN ('IPN','QUERY') AND p_actor IS NULL)
 OR (p.provider='CASH' AND e.source='CASH' AND p_actor IS NOT NULL AND EXISTS(SELECT 1 FROM app.audit_records a
 WHERE a.resource_type='PAYMENT' AND a.resource_id=p.id AND a.actor_user_id=p_actor AND a.action='CASH_RECEIVED'))))
 OR NOT app.payment_settlement_eligible(p_booking) THEN
 RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Sale requires authoritative confirmation'; END IF;
 UPDATE app.bookings SET status='PAID',paid_at=v_now,booking_qr_token=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','') WHERE id=p_booking;
 UPDATE app.booking_seats SET sold_at=v_now WHERE booking_id=p_booking;
 UPDATE app.seat_holds SET status='CONSUMED' WHERE booking_id=p_booking;
 INSERT INTO app.tickets(booking_seat_id,ticket_code,status,issued_at)
 SELECT id,'T-'||replace(gen_random_uuid()::text,'-',''),'VALID',v_now FROM app.booking_seats WHERE booking_id=p_booking;
 INSERT INTO app.audit_records(actor_user_id,action,resource_type,resource_id,metadata)
 VALUES(p_actor,'SALE_FINALIZED','BOOKING',p_booking,
 CASE WHEN p_actor IS NULL THEN jsonb_build_object('system_actor','VNPAY','payment_id',p_payment::text,'evidence_id',p_evidence::text)
 ELSE jsonb_build_object('payment_method','CASH','payment_id',p_payment::text,'evidence_id',p_evidence::text) END);
END $b$;

CREATE FUNCTION app.staff_confirm_cash(p_booking bigint,p_payment bigint,p_actor bigint,p_amount numeric) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $b$
DECLARE b app.bookings%ROWTYPE; p app.payment_transactions%ROWTYPE; v_evidence bigint; v_limit bigint; v_used bigint;
BEGIN
 SELECT * INTO b FROM app.bookings WHERE id=p_booking AND selling_staff_id=p_actor;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Counter sale unavailable'; END IF;
 PERFORM app.lock_hold_context(b.showtime_id,p_actor);
 PERFORM app.lock_booking_resources(b.showtime_id);
 SELECT usage_limit INTO v_limit FROM app.promotions WHERE id=b.promotion_id FOR UPDATE;
 SELECT * INTO b FROM app.bookings WHERE id=p_booking;
 SELECT * INTO p FROM app.payment_transactions WHERE id=p_payment AND booking_id=b.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Payment unavailable'; END IF;
 IF p_amount IS NULL OR p_amount IS DISTINCT FROM b.final_amount OR p.amount IS DISTINCT FROM b.final_amount THEN
 RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Review authoritative amount'; END IF;
 IF p.status='SUCCESS' AND p.provider='CASH' AND b.status='PAID' THEN RETURN p.id; END IF;
 IF p.status<>'INITIATED' OR p.provider IS NOT NULL OR p.reconciliation_required
 OR NOT app.payment_settlement_eligible(b.id) OR EXISTS(SELECT 1 FROM app.payment_transactions other
 WHERE other.booking_id=b.id AND other.id<>p.id AND (other.status NOT IN ('FAILED','CANCELLED') OR other.reconciliation_required)) THEN
 RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Cash confirmation unavailable'; END IF;
 SELECT count(*) INTO v_used FROM app.bookings WHERE promotion_id=b.promotion_id AND status='PAID';
 IF v_limit IS NOT NULL AND v_used>=v_limit THEN RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Promotion exhausted'; END IF;
 INSERT INTO app.payment_evidence(payment_id,source,digest,result,response_code,transaction_status)
 VALUES(p.id,'CASH',encode(sha256(convert_to('CASH:'||p.id::text||':'||p_actor::text||':'||p.amount::text,'UTF8')),'hex'),'SUCCESS','CASH','00') RETURNING id INTO v_evidence;
 INSERT INTO app.audit_records(actor_user_id,action,resource_type,resource_id,metadata)
 VALUES(p_actor,'CASH_RECEIVED','PAYMENT',p.id,jsonb_build_object('payment_method','CASH','booking_id',b.id::text,'amount',p.amount::text,'currency','VND'));
 UPDATE app.payment_transactions SET provider='CASH',currency='VND',environment='COUNTER',status='SUCCESS',completed_at=clock_timestamp() WHERE id=p.id;
 PERFORM app.finalize_sale(b.id,p.id,v_evidence,p_actor);
 RETURN p.id;
END $b$;
$ddl$;
 source text; start_at integer; end_at integer; segment text;
BEGIN
 EXECUTE replace(ddl,'app.',format('%I.',ns));
 -- Extract exactly the existing VNPAY issuance block; keep result verification/reconciliation unchanged.
 source:=pg_get_functiondef(format('%I.record_vnpay_result(text,text,numeric,text,text,text,text,text,text)',ns)::regprocedure);
 start_at:=position('   v_now:=clock_timestamp();' IN source);
 end_at:=position('  END IF;' IN substring(source FROM start_at));
 IF start_at=0 OR end_at=0 THEN RAISE EXCEPTION 'Missing VNPAY issuance anchors'; END IF;
 segment:=substring(source FROM start_at FOR end_at-1);
 IF position('SALE_FINALIZED' IN segment)=0 OR position('INSERT INTO '||quote_ident(ns)||'.tickets' IN segment)=0 THEN
 RAISE EXCEPTION 'Unexpected VNPAY issuance block'; END IF;
 source:=replace(source,segment,format(E'   PERFORM %I.finalize_sale(b.id,p.id,v_evidence,NULL);\n',ns));
 EXECUTE source;
 EXECUTE format('ALTER FUNCTION %I.finalize_sale(bigint,bigint,bigint,bigint) OWNER TO smart_cinema_hold_owner',ns);
 EXECUTE format('ALTER FUNCTION %I.staff_confirm_cash(bigint,bigint,bigint,numeric) OWNER TO smart_cinema_hold_owner',ns);
 EXECUTE format('ALTER FUNCTION %I.cash_payment_confirmed(bigint) OWNER TO smart_cinema_hold_owner',ns);
 EXECUTE format('REVOKE ALL ON FUNCTION %I.finalize_sale(bigint,bigint,bigint,bigint),%I.staff_confirm_cash(bigint,bigint,bigint,numeric) FROM PUBLIC',ns,ns);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %I.staff_confirm_cash(bigint,bigint,bigint,numeric) TO smart_cinema_hold_runtime',ns);
 EXECUTE format('REVOKE ALL ON FUNCTION %I.cash_payment_confirmed(bigint) FROM PUBLIC',ns);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %I.cash_payment_confirmed(bigint) TO smart_cinema_hold_runtime',ns);
END $definitions$;

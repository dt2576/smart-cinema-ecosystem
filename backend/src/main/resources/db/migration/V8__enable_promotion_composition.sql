-- Approved pre-Payment policy. No Payment, usage consumption, sale or freeze writer.
ALTER TABLE promotions DROP CONSTRAINT chk_promotions_type;
UPDATE promotions SET discount_type='FIXED_AMOUNT' WHERE discount_type='FIXED';
ALTER TABLE promotions ADD CONSTRAINT chk_promotions_type CHECK(discount_type IN ('FIXED_AMOUNT','PERCENTAGE'));
ALTER TABLE promotions ADD COLUMN max_discount_amount numeric(19,4);
ALTER TABLE promotions ADD CONSTRAINT chk_promotions_cap CHECK(max_discount_amount IS NULL OR
    (discount_type='PERCENTAGE' AND max_discount_amount>=0 AND max_discount_amount<1000000000000000));

ALTER TABLE bookings ADD COLUMN promotion_code_snapshot varchar(50),
    ADD COLUMN promotion_type_snapshot varchar(20),
    ADD COLUMN promotion_value_snapshot numeric(19,4),
    ADD COLUMN promotion_minimum_snapshot numeric(19,4),
    ADD COLUMN promotion_cap_snapshot numeric(19,4);
ALTER TABLE bookings DROP CONSTRAINT chk_bookings_pre_payment_stage;
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_pre_payment_stage CHECK(status<>'PAID' AND payment_started_at IS NULL);
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_promotion_snapshot CHECK(
    (promotion_id IS NULL AND promotion_code_snapshot IS NULL AND promotion_type_snapshot IS NULL
        AND promotion_value_snapshot IS NULL AND promotion_minimum_snapshot IS NULL AND promotion_cap_snapshot IS NULL AND discount=0)
    OR (promotion_id IS NOT NULL AND promotion_code_snapshot IS NOT NULL AND btrim(promotion_code_snapshot)<>''
        AND promotion_type_snapshot IS NOT NULL AND promotion_type_snapshot IN ('PERCENTAGE','FIXED_AMOUNT')
        AND promotion_value_snapshot IS NOT NULL AND promotion_value_snapshot>=0 AND promotion_value_snapshot<1000000000000000
        AND (promotion_type_snapshot<>'PERCENTAGE' OR promotion_value_snapshot<=100)
        AND promotion_minimum_snapshot IS NOT NULL AND promotion_minimum_snapshot>=0 AND promotion_minimum_snapshot<=subtotal
        AND (promotion_cap_snapshot IS NULL OR (promotion_type_snapshot='PERCENTAGE' AND promotion_cap_snapshot>=0
            AND promotion_cap_snapshot<1000000000000000))
        AND discount=least(subtotal,CASE WHEN promotion_type_snapshot='FIXED_AMOUNT' THEN promotion_value_snapshot
            ELSE floor(least(subtotal*promotion_value_snapshot/100,coalesce(promotion_cap_snapshot,subtotal))) END)));

DO $migration$
DECLARE ns text:=current_schema(); ddl text:=$definitions$
-- Internal policy function: caller locks the Promotion and supplies authoritative paid count.
-- The usage parameter makes exhaustion testable without enabling a fake PAID writer.
CREATE FUNCTION app.promotion_discount(p app.promotions,p_subtotal numeric,p_used bigint) RETURNS numeric
LANGUAGE plpgsql VOLATILE SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_now timestamptz:=clock_timestamp();
BEGIN
    IF p.id IS NULL OR p.status IS DISTINCT FROM 'ACTIVE' OR p.valid_from>v_now OR p.valid_until<=v_now
        OR p_subtotal IS NULL OR p_subtotal<0 OR p_subtotal>=1000000000000000 OR p_subtotal<p.minimum_order
        OR p_used IS NULL OR p_used<0 OR (p.usage_limit IS NOT NULL AND p_used>=p.usage_limit)
        OR p.discount_type NOT IN ('PERCENTAGE','FIXED_AMOUNT') OR p.discount_value<0
        OR p.discount_value>=1000000000000000 OR (p.discount_type='PERCENTAGE' AND p.discount_value>100) THEN
        RAISE EXCEPTION USING ERRCODE='P0005',MESSAGE='Promotion unavailable';
    END IF;
    RETURN least(p_subtotal,CASE WHEN p.discount_type='FIXED_AMOUNT' THEN p.discount_value
        ELSE floor(least(p_subtotal*p.discount_value/100,coalesce(p.max_discount_amount,p_subtotal))) END);
END $body$;

CREATE OR REPLACE FUNCTION app.guard_booking() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $body$
DECLARE p app.promotions%ROWTYPE; v_used bigint;
BEGIN
    IF current_user<>'smart_cinema_hold_owner' OR TG_OP='DELETE' THEN
        RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Protected Booking mutation';
    END IF;
    IF TG_OP='INSERT' THEN
        IF NEW.status<>'PENDING' OR NEW.expires_at<=clock_timestamp() OR NEW.concession_amount<>0 OR NEW.promotion_id IS NOT NULL THEN
            RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Invalid initial Booking';
        END IF;
    ELSIF NEW.status=OLD.status THEN
        IF (to_jsonb(NEW)-ARRAY['concession_amount','subtotal','discount','final_amount','promotion_id',
            'promotion_code_snapshot','promotion_type_snapshot','promotion_value_snapshot','promotion_minimum_snapshot','promotion_cap_snapshot']) IS DISTINCT FROM
            (to_jsonb(OLD)-ARRAY['concession_amount','subtotal','discount','final_amount','promotion_id',
            'promotion_code_snapshot','promotion_type_snapshot','promotion_value_snapshot','promotion_minimum_snapshot','promotion_cap_snapshot'])
            OR NOT app.booking_composition_eligible(OLD.id) THEN
            RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Booking composition unavailable';
        END IF;
        IF NEW.promotion_id IS NULL THEN
            NEW.promotion_code_snapshot:=NULL; NEW.promotion_type_snapshot:=NULL;
            NEW.promotion_value_snapshot:=NULL; NEW.promotion_minimum_snapshot:=NULL; NEW.promotion_cap_snapshot:=NULL;
            NEW.discount:=0;
        ELSE
            -- Last lock in the aggregate protocol; catalog administration must not lock Bookings.
            SELECT * INTO p FROM app.promotions WHERE id=NEW.promotion_id FOR UPDATE;
            IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0005',MESSAGE='Promotion unavailable'; END IF;
            -- PENDING applications reserve/consume nothing. Payment SUCCESS must serialize on this row.
            SELECT count(*) INTO v_used FROM app.bookings WHERE promotion_id=p.id AND status='PAID';
            NEW.discount:=app.promotion_discount(p,NEW.subtotal,v_used);
            NEW.promotion_code_snapshot:=p.code; NEW.promotion_type_snapshot:=p.discount_type;
            NEW.promotion_value_snapshot:=p.discount_value; NEW.promotion_minimum_snapshot:=p.minimum_order;
            NEW.promotion_cap_snapshot:=p.max_discount_amount;
        END IF;
        NEW.final_amount:=NEW.subtotal-NEW.discount;
        IF NOT app.booking_composition_eligible(OLD.id) THEN
            RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Booking composition expired';
        END IF;
    ELSE
        IF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status')
            OR OLD.status<>'PENDING' OR NEW.status NOT IN ('CANCELLED','EXPIRED')
            OR (NEW.status='EXPIRED' AND NEW.expires_at>clock_timestamp()) THEN
            RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Immutable Booking history';
        END IF;
    END IF;
    RETURN NEW;
END $body$;

CREATE FUNCTION app.edit_booking_promotion(p_booking bigint,p_user bigint,p_code text,p_operation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_showtime bigint; v_promotion bigint;
BEGIN
    IF p_operation IS NULL OR p_operation NOT IN ('APPLY','REMOVE')
        OR (p_operation='APPLY' AND (p_code IS NULL OR btrim(p_code)='' OR length(p_code)>50))
        OR (p_operation='REMOVE' AND p_code IS NOT NULL) THEN
        RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid Promotion command';
    END IF;
    SELECT showtime_id INTO v_showtime FROM app.bookings WHERE id=p_booking AND customer_id=p_user;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Booking unavailable'; END IF;
    PERFORM app.lock_hold_context(v_showtime,p_user);
    PERFORM app.lock_booking_resources(v_showtime);
    PERFORM app.expire_booking_aggregates(v_showtime);
    IF NOT app.booking_composition_eligible(p_booking) THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Booking composition unavailable';
    END IF;
    IF p_operation='APPLY' THEN
        SELECT id INTO v_promotion FROM app.promotions WHERE code=p_code;
        IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0005',MESSAGE='Promotion unavailable'; END IF;
    END IF;
    -- The guard locks/revalidates the master, snapshots and recalculates atomically.
    UPDATE app.bookings SET promotion_id=v_promotion WHERE id=p_booking;
END $body$;

CREATE FUNCTION app.guard_promotion_catalog() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $body$
BEGIN
    IF current_user<>'smart_cinema_hold_owner' OR TG_OP='DELETE' THEN
        RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Protected Promotion catalog';
    END IF;
    IF TG_OP='UPDATE' AND (NEW.id,NEW.code) IS DISTINCT FROM (OLD.id,OLD.code) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Immutable Promotion identity';
    END IF;
    RETURN NEW;
END $body$;
CREATE TRIGGER trg_promotions_guard BEFORE INSERT OR UPDATE OR DELETE ON app.promotions
    FOR EACH ROW EXECUTE FUNCTION app.guard_promotion_catalog();

-- Deployment-only writer; never a runtime/Admin HTTP endpoint.
CREATE FUNCTION app.configure_promotion(p_id bigint,p_code text,p_type text,p_value numeric,p_from timestamptz,p_until timestamptz,
    p_minimum numeric,p_limit integer,p_status text,p_cap numeric) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_id bigint;
BEGIN
    IF p_value IS NULL OR p_minimum IS NULL OR p_value<>round(p_value,4) OR p_minimum<>round(p_minimum,4)
        OR (p_cap IS NOT NULL AND p_cap<>round(p_cap,4)) THEN
        RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid Promotion precision';
    END IF;
    IF p_id IS NULL THEN
        INSERT INTO app.promotions(code,discount_type,discount_value,valid_from,valid_until,minimum_order,usage_limit,status,max_discount_amount)
            VALUES(p_code,p_type,p_value,p_from,p_until,p_minimum,p_limit,p_status,p_cap) RETURNING id INTO v_id;
    ELSE
        UPDATE app.promotions SET code=p_code,discount_type=p_type,discount_value=p_value,valid_from=p_from,valid_until=p_until,
            minimum_order=p_minimum,usage_limit=p_limit,status=p_status,max_discount_amount=p_cap WHERE id=p_id RETURNING id INTO v_id;
        IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Promotion unavailable'; END IF;
    END IF;
    RETURN v_id;
END $body$;

ALTER FUNCTION app.promotion_discount(app.promotions,numeric,bigint) OWNER TO smart_cinema_hold_owner;
ALTER FUNCTION app.edit_booking_promotion(bigint,bigint,text,text) OWNER TO smart_cinema_hold_owner;
ALTER FUNCTION app.guard_promotion_catalog() OWNER TO smart_cinema_hold_owner;
ALTER FUNCTION app.configure_promotion(bigint,text,text,numeric,timestamptz,timestamptz,numeric,integer,text,numeric) OWNER TO smart_cinema_hold_owner;
REVOKE ALL ON FUNCTION app.promotion_discount(app.promotions,numeric,bigint),app.edit_booking_promotion(bigint,bigint,text,text),
    app.guard_promotion_catalog(),app.configure_promotion(bigint,text,text,numeric,timestamptz,timestamptz,numeric,integer,text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.edit_booking_promotion(bigint,bigint,text,text) TO smart_cinema_hold_runtime;
$definitions$;
BEGIN
    EXECUTE replace(ddl,'app.',format('%I.',ns));
END $migration$;

-- Additive ADMIN master commands. Existing discount/freeze/finalization functions remain unchanged.
DO $migration$
DECLARE ns text:=current_schema(); ddl text:=$definitions$
CREATE FUNCTION app.admin_configure_promotion(p_actor bigint,p_id bigint,p_operation text,
 p_code text,p_type text,p_value numeric,p_from timestamptz,p_until timestamptz,
 p_minimum numeric,p_limit integer,p_status text,p_cap numeric) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE old_p app.promotions%ROWTYPE; new_p app.promotions%ROWTYPE;
 v_id bigint; v_fields text[]:=ARRAY[]::text[]; v_action text;
BEGIN
 PERFORM id FROM app.users WHERE id=p_actor AND role='ADMIN' AND status='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0004',MESSAGE='Active Admin required'; END IF;
 IF p_operation IS NULL OR p_operation NOT IN ('CREATE','UPDATE','STATUS')
 OR (p_operation='CREATE' AND p_id IS NOT NULL)
 OR (p_operation<>'CREATE' AND (p_id IS NULL OR p_id<=0)) THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid Promotion command'; END IF;
 IF p_operation IN ('CREATE','UPDATE') THEN
  IF p_type IS NULL OR p_type NOT IN ('PERCENTAGE','FIXED_AMOUNT')
  OR p_value IS NULL OR p_value::text IN ('NaN','Infinity','-Infinity') OR p_value<0 OR p_value>=1000000000000000 OR scale(p_value)>4
  OR (p_type='PERCENTAGE' AND p_value>100)
  OR p_minimum IS NULL OR p_minimum::text IN ('NaN','Infinity','-Infinity') OR p_minimum<0 OR p_minimum>=1000000000000000 OR scale(p_minimum)>4
  OR (p_cap IS NOT NULL AND (p_type<>'PERCENTAGE' OR p_cap::text IN ('NaN','Infinity','-Infinity') OR p_cap<0 OR p_cap>=1000000000000000 OR scale(p_cap)>4))
  OR p_from IS NULL OR p_until IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_until) OR p_until<=p_from
  OR (p_limit IS NOT NULL AND p_limit<=0) THEN
   RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid Promotion terms'; END IF;
 END IF;
 IF (p_operation='CREATE' AND (p_code IS NULL OR btrim(p_code)='' OR char_length(p_code)>50 OR p_code<>upper(btrim(p_code))))
 OR (p_operation<>'CREATE' AND p_code IS NOT NULL)
 OR (p_operation IN ('CREATE','STATUS') AND (p_status IS NULL OR p_status NOT IN ('ACTIVE','INACTIVE')))
 OR (p_operation='UPDATE' AND p_status IS NOT NULL)
 OR (p_operation='STATUS' AND (p_type IS NOT NULL OR p_value IS NOT NULL OR p_from IS NOT NULL OR p_until IS NOT NULL OR p_minimum IS NOT NULL OR p_limit IS NOT NULL OR p_cap IS NOT NULL)) THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid Promotion command fields'; END IF;
 IF p_operation<>'CREATE' THEN
  -- Never reverse-lock Booking aggregates. Customer composition/finalization already serialize on this row.
  SELECT * INTO old_p FROM app.promotions WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Promotion unavailable'; END IF;
 END IF;
 IF p_operation='CREATE' THEN
  v_id:=app.configure_promotion(NULL,p_code,p_type,p_value,p_from,p_until,p_minimum,p_limit,p_status,p_cap);
  v_action:='PROMOTION_CREATED';
  v_fields:=ARRAY['code','discountType','discountValue','validFrom','validUntil','minimumOrderAmount','usageLimit','maxDiscountAmount','status'];
 ELSIF p_operation='UPDATE' THEN
  IF (old_p.discount_type,old_p.discount_value,old_p.valid_from,old_p.valid_until,old_p.minimum_order,old_p.usage_limit,old_p.max_discount_amount)
    IS NOT DISTINCT FROM (p_type,p_value,p_from,p_until,p_minimum,p_limit,p_cap) THEN RETURN old_p.id; END IF;
  IF old_p.discount_type IS DISTINCT FROM p_type THEN v_fields:=array_append(v_fields,'discountType'); END IF;
  IF old_p.discount_value IS DISTINCT FROM p_value THEN v_fields:=array_append(v_fields,'discountValue'); END IF;
  IF old_p.valid_from IS DISTINCT FROM p_from THEN v_fields:=array_append(v_fields,'validFrom'); END IF;
  IF old_p.valid_until IS DISTINCT FROM p_until THEN v_fields:=array_append(v_fields,'validUntil'); END IF;
  IF old_p.minimum_order IS DISTINCT FROM p_minimum THEN v_fields:=array_append(v_fields,'minimumOrderAmount'); END IF;
  IF old_p.usage_limit IS DISTINCT FROM p_limit THEN v_fields:=array_append(v_fields,'usageLimit'); END IF;
  IF old_p.max_discount_amount IS DISTINCT FROM p_cap THEN v_fields:=array_append(v_fields,'maxDiscountAmount'); END IF;
  v_id:=app.configure_promotion(p_id,old_p.code,p_type,p_value,p_from,p_until,p_minimum,p_limit,old_p.status,p_cap);
  v_action:='PROMOTION_UPDATED';
 ELSE
  IF old_p.status=p_status THEN RETURN old_p.id; END IF;
  v_id:=app.configure_promotion(p_id,old_p.code,old_p.discount_type,old_p.discount_value,old_p.valid_from,old_p.valid_until,
   old_p.minimum_order,old_p.usage_limit,p_status,old_p.max_discount_amount);
  v_fields:=ARRAY['status']; v_action:='PROMOTION_STATUS_CHANGED';
 END IF;
 SELECT * INTO STRICT new_p FROM app.promotions WHERE id=v_id;
 INSERT INTO app.audit_records(actor_user_id,action,resource_type,resource_id,metadata)
 VALUES(p_actor,v_action,'PROMOTION',v_id,jsonb_build_object('changedFields',v_fields,
   'previousTerms',CASE WHEN old_p.id IS NULL THEN NULL ELSE to_jsonb(old_p)-'id' END,'terms',to_jsonb(new_p)-'id'));
 RETURN v_id;
END $body$;
ALTER FUNCTION app.admin_configure_promotion(bigint,bigint,text,text,text,numeric,timestamptz,timestamptz,numeric,integer,text,numeric) OWNER TO smart_cinema_hold_owner;
REVOKE ALL ON FUNCTION app.admin_configure_promotion(bigint,bigint,text,text,text,numeric,timestamptz,timestamptz,numeric,integer,text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.admin_configure_promotion(bigint,bigint,text,text,text,numeric,timestamptz,timestamptz,numeric,integer,text,numeric) TO smart_cinema_hold_runtime;
GRANT SELECT ON app.promotions TO smart_cinema_hold_runtime;
$definitions$;
BEGIN
 EXECUTE replace(ddl,'app.',format('%I.',ns));
END $migration$;

-- ADMIN-only audited master configuration. No Booking/financial mutation or new table.
DO $migration$
DECLARE ns text:=current_schema(); ddl text:=$definitions$
CREATE FUNCTION app.admin_configure_concession_item(p_actor bigint,p_id bigint,p_operation text,
 p_name text,p_description text,p_category text,p_price numeric,p_status text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE old_item app.concession_items%ROWTYPE; new_item app.concession_items%ROWTYPE;
 v_id bigint; v_fields text[]:=ARRAY[]::text[]; v_action text;
BEGIN
 PERFORM id FROM app.users WHERE id=p_actor AND role='ADMIN' AND status='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0004',MESSAGE='Active Admin required'; END IF;
 IF p_operation IS NULL OR p_operation NOT IN ('CREATE','UPDATE','STATUS')
 OR (p_operation='CREATE' AND p_id IS NOT NULL)
 OR (p_operation<>'CREATE' AND (p_id IS NULL OR p_id<=0)) THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid catalog command'; END IF;
 IF p_operation IN ('CREATE','UPDATE') THEN
  IF p_name IS NULL OR btrim(p_name)='' OR char_length(p_name)>150
  OR (p_description IS NOT NULL AND btrim(p_description)='')
  OR p_category IS NULL OR p_category NOT IN ('POPCORN','DRINK','COMBO')
  OR p_price IS NULL OR p_price::text IN ('NaN','Infinity','-Infinity')
  OR p_price<0 OR p_price>=1000000000000000 OR scale(p_price)>4 THEN
   RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid catalog content'; END IF;
 END IF;
 IF (p_operation IN ('CREATE','STATUS') AND (p_status IS NULL OR p_status NOT IN ('ACTIVE','INACTIVE')))
 OR (p_operation='UPDATE' AND p_status IS NOT NULL)
 OR (p_operation='STATUS' AND (p_name IS NOT NULL OR p_description IS NOT NULL OR p_category IS NOT NULL OR p_price IS NOT NULL)) THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid catalog status command'; END IF;
 IF p_operation<>'CREATE' THEN
  SELECT * INTO old_item FROM app.concession_items WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Concession item unavailable'; END IF;
 END IF;
 IF p_operation='CREATE' THEN
  v_id:=app.configure_concession_item(NULL,p_name,p_description,p_category,p_price,NULL,p_status);
  v_fields:=ARRAY['name','description','category','sellingPrice','status']; v_action:='CONCESSION_CREATED';
 ELSIF p_operation='UPDATE' THEN
  IF (old_item.name,old_item.description,old_item.category,old_item.selling_price)
    IS NOT DISTINCT FROM (p_name,p_description,p_category,p_price) THEN RETURN old_item.id; END IF;
  IF old_item.name IS DISTINCT FROM p_name THEN v_fields:=array_append(v_fields,'name'); END IF;
  IF old_item.description IS DISTINCT FROM p_description THEN v_fields:=array_append(v_fields,'description'); END IF;
  IF old_item.category IS DISTINCT FROM p_category THEN v_fields:=array_append(v_fields,'category'); END IF;
  IF old_item.selling_price IS DISTINCT FROM p_price THEN v_fields:=array_append(v_fields,'sellingPrice'); END IF;
  v_id:=app.configure_concession_item(p_id,p_name,p_description,p_category,p_price,old_item.image,old_item.status);
  v_action:='CONCESSION_UPDATED';
 ELSE
  IF old_item.status=p_status THEN RETURN old_item.id; END IF;
  v_id:=app.configure_concession_item(p_id,old_item.name,old_item.description,old_item.category,
    old_item.selling_price,old_item.image,p_status);
  v_fields:=ARRAY['status']; v_action:='CONCESSION_STATUS_CHANGED';
 END IF;
 SELECT * INTO STRICT new_item FROM app.concession_items WHERE id=v_id;
 INSERT INTO app.audit_records(actor_user_id,action,resource_type,resource_id,metadata)
 VALUES(p_actor,v_action,'CONCESSION_ITEM',v_id,jsonb_build_object('changedFields',v_fields,
   'previousSellingPrice',old_item.selling_price::text,'sellingPrice',new_item.selling_price::text,
   'previousStatus',old_item.status,'status',new_item.status));
 RETURN v_id;
END $body$;
ALTER FUNCTION app.admin_configure_concession_item(bigint,bigint,text,text,text,text,numeric,text) OWNER TO smart_cinema_hold_owner;
REVOKE ALL ON FUNCTION app.admin_configure_concession_item(bigint,bigint,text,text,text,text,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.admin_configure_concession_item(bigint,bigint,text,text,text,text,numeric,text) TO smart_cinema_hold_runtime;
$definitions$;
BEGIN
 EXECUTE replace(ddl,'app.',format('%I.',ns));
END $migration$;

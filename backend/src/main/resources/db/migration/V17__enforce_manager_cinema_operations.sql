-- Operator-installed extension of V11/V12 authorization; domain writer bodies/guards are reused.
-- No new role, business table, financial transition, runtime DML or owner membership.
DO $migration$
DECLARE ns text:=current_schema(); q text:=format('%I.',current_schema()); ddl text:=$definitions$
CREATE FUNCTION app.lock_cinema_configuration(p_actor bigint,p_cinema bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_role text;
BEGIN
 SELECT role INTO v_role FROM app.users WHERE id=p_actor AND status='ACTIVE' AND role IN ('ADMIN','MANAGER') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0004',MESSAGE='Active operator required'; END IF;
 IF p_cinema IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Configuration unavailable'; END IF;
 IF v_role='ADMIN' THEN RETURN; END IF;
 PERFORM id FROM app.cinema_assignments WHERE user_id=p_actor AND cinema_id=p_cinema
  AND assignment_type='MANAGER' AND status='ACTIVE' AND effective_at<=clock_timestamp() ORDER BY id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Configuration unavailable'; END IF;
END $body$;
CREATE FUNCTION app.record_manager_configuration(p_actor bigint,p_cinema bigint,p_resource text,p_id bigint,p_action text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
BEGIN
 -- Existing ADMIN logging remains unchanged; Manager commands gain atomic durable audit.
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=p_actor AND role='MANAGER' AND status='ACTIVE') THEN RETURN; END IF;
 IF NOT ((p_resource='HALL' AND p_action IN ('HALL_CREATED','HALL_UPDATED','SEAT_LAYOUT_INITIALIZED'))
  OR (p_resource='SEAT' AND p_action='SEAT_UPDATED')
  OR (p_resource='SHOWTIME' AND p_action IN ('SHOWTIME_CREATED','SHOWTIME_UPDATED','SHOWTIME_CANCELLED'))) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unsupported operation audit';
 END IF;
 INSERT INTO app.audit_records(actor_user_id,action,resource_type,resource_id,metadata)
 VALUES(p_actor,'MANAGER_'||p_action,p_resource,p_id,jsonb_build_object('cinema_id',p_cinema::text));
END $body$;
CREATE FUNCTION app.admin_assign_manager(p_actor bigint,p_user bigint,p_cinema bigint,p_effective timestamptz,p_assignment bigint,p_status text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_id bigint; v_old app.cinema_assignments%ROWTYPE;
BEGIN
 PERFORM id FROM app.users WHERE id IN (p_actor,p_user) ORDER BY id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=p_actor AND role='ADMIN' AND status='ACTIVE') THEN
  RAISE EXCEPTION USING ERRCODE='P0004',MESSAGE='Active Admin required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=p_user AND role='MANAGER') THEN
  RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Manager unavailable'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('ACTIVE','INACTIVE') THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid assignment status'; END IF;
 IF p_assignment IS NOT NULL THEN
  SELECT * INTO v_old FROM app.cinema_assignments WHERE id=p_assignment AND user_id=p_user AND assignment_type='MANAGER';
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Assignment unavailable'; END IF;
  IF p_cinema IS NOT NULL OR p_effective IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Immutable assignment identity'; END IF;
  p_cinema:=v_old.cinema_id;
 ELSE
  IF p_status<>'ACTIVE' OR p_effective IS NULL OR NOT isfinite(p_effective) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid effective instant'; END IF;
 END IF;
 IF NOT app.lock_staff_assignment_cinema(p_cinema) THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Cinema unavailable'; END IF;
 IF p_assignment IS NULL THEN
  INSERT INTO app.cinema_assignments(user_id,cinema_id,assignment_type,status,effective_at)
  VALUES(p_user,p_cinema,'MANAGER','ACTIVE',p_effective) RETURNING id INTO v_id;
 ELSE
  SELECT * INTO v_old FROM app.cinema_assignments WHERE id=p_assignment AND user_id=p_user AND assignment_type='MANAGER' FOR UPDATE;
  IF v_old.status=p_status THEN RETURN v_old.id; END IF;
  UPDATE app.cinema_assignments SET status=p_status WHERE id=v_old.id RETURNING id INTO v_id;
 END IF;
 INSERT INTO app.audit_records(actor_user_id,action,resource_type,resource_id,metadata)
 VALUES(p_actor,CASE WHEN p_assignment IS NULL THEN 'ASSIGNMENT_GRANTED' ELSE 'ASSIGNMENT_'||p_status END,
  'CINEMA_ASSIGNMENT',v_id,jsonb_build_object('user_id',p_user::text,'cinema_id',p_cinema::text,'assignment_type','MANAGER'));
 RETURN v_id;
END $body$;
ALTER FUNCTION app.lock_cinema_configuration(bigint,bigint) OWNER TO smart_cinema_staff_owner;
ALTER FUNCTION app.record_manager_configuration(bigint,bigint,text,bigint,text) OWNER TO smart_cinema_staff_owner;
ALTER FUNCTION app.admin_assign_manager(bigint,bigint,bigint,timestamptz,bigint,text) OWNER TO smart_cinema_staff_owner;
REVOKE ALL ON FUNCTION app.lock_cinema_configuration(bigint,bigint),app.record_manager_configuration(bigint,bigint,text,bigint,text),
 app.admin_assign_manager(bigint,bigint,bigint,timestamptz,bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.lock_cinema_configuration(bigint,bigint),app.record_manager_configuration(bigint,bigint,text,bigint,text) TO smart_cinema_configuration_owner;
GRANT EXECUTE ON FUNCTION app.admin_assign_manager(bigint,bigint,bigint,timestamptz,bigint,text) TO smart_cinema_hold_runtime;
$definitions$;
 definition text; needle text; replacement text; signature text; name text; audit text;
BEGIN
 EXECUTE replace(ddl,'app.',q);
 -- Only append a nonfinancial Manager whitelist; retain every existing audit guard branch.
 SELECT pg_get_functiondef((q||'staff_guard_audit()')::regprocedure) INTO definition;
 needle:='RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''Protected audit event'';';
 IF (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 THEN RAISE EXCEPTION 'Unexpected audit guard definition'; END IF;
 replacement:=replace($audit$
 IF current_user='smart_cinema_staff_owner' AND NEW.actor_user_id IS NOT NULL
 AND ((NEW.resource_type='HALL' AND NEW.action IN ('MANAGER_HALL_CREATED','MANAGER_HALL_UPDATED','MANAGER_SEAT_LAYOUT_INITIALIZED'))
 OR (NEW.resource_type='SEAT' AND NEW.action='MANAGER_SEAT_UPDATED')
 OR (NEW.resource_type='SHOWTIME' AND NEW.action IN ('MANAGER_SHOWTIME_CREATED','MANAGER_SHOWTIME_UPDATED','MANAGER_SHOWTIME_CANCELLED')))
 AND EXISTS(SELECT 1 FROM app.users WHERE id=NEW.actor_user_id AND role='MANAGER' AND status='ACTIVE')
 AND NEW.metadata->>'cinema_id' ~ '^[1-9][0-9]*$' THEN RETURN NEW; END IF;
 $audit$,'app.',q)||needle;
 EXECUTE replace(definition,needle,replacement);
 -- Assert unique anchors before rewriting. No copied lifecycle/layout logic can drift from V11/V12.
 FOREACH name IN ARRAY ARRAY['configure_hall','configure_hall_layout','configure_seat','configure_showtime'] LOOP
  signature:=CASE name WHEN 'configure_hall' THEN '(bigint,bigint,bigint,text,integer,text,text)'
    WHEN 'configure_hall_layout' THEN '(bigint,bigint,jsonb)' WHEN 'configure_seat' THEN '(bigint,bigint,text,text,text,text)'
    ELSE '(bigint,bigint,bigint,bigint,timestamptz,numeric,text)' END;
  SELECT pg_get_functiondef((q||name||signature)::regprocedure) INTO definition;
  needle:='PERFORM '||q||'lock_admin_configuration(p_actor);';
  IF (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 THEN RAISE EXCEPTION 'Unexpected configuration definition: %',name; END IF;
  replacement:='PERFORM '||q||'lock_cinema_configuration(p_actor,'||CASE name
    WHEN 'configure_hall' THEN 'p_cinema'
    WHEN 'configure_hall_layout' THEN '(SELECT cinema_id FROM '||q||'halls WHERE id=p_hall)'
    WHEN 'configure_seat' THEN '(SELECT h.cinema_id FROM '||q||'seats s JOIN '||q||'halls h ON h.id=s.hall_id WHERE s.id=p_id)'
    ELSE '(SELECT h.cinema_id FROM '||q||'halls h WHERE h.id=CASE WHEN p_id IS NULL THEN p_hall ELSE (SELECT hall_id FROM '||q||'showtimes WHERE id=p_id) END)' END||');';
  definition:=replace(definition,needle,replacement);
  IF name='configure_hall' THEN
   needle:='RETURN v_id;';audit:='PERFORM '||q||'record_manager_configuration(p_actor,p_cinema,''HALL'',v_id,CASE WHEN p_id IS NULL THEN ''HALL_CREATED'' ELSE ''HALL_UPDATED'' END);';
  ELSIF name='configure_hall_layout' THEN
   needle:='PERFORM '||q||'initialize_hall_seats(p_hall,p_units);';audit:='PERFORM '||q||'record_manager_configuration(p_actor,v_cinema,''HALL'',p_hall,''SEAT_LAYOUT_INITIALIZED'');';
  ELSIF name='configure_seat' THEN
   needle:='UPDATE '||q||'seats SET row=btrim(p_row),number=btrim(p_number),seat_type=p_type,physical_status=p_status WHERE id=p_id;';
   audit:='PERFORM '||q||'record_manager_configuration(p_actor,v_cinema,''SEAT'',p_id,''SEAT_UPDATED'');';
  ELSE
   needle:='RETURN p_id;';audit:='PERFORM '||q||'record_manager_configuration(p_actor,v_cinema,''SHOWTIME'',p_id,''SHOWTIME_CANCELLED'');';
   IF (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 THEN RAISE EXCEPTION 'Unexpected cancellation definition'; END IF;
   definition:=replace(definition,needle,audit||needle);
   needle:='RETURN v_id;';audit:='PERFORM '||q||'record_manager_configuration(p_actor,v_cinema,''SHOWTIME'',v_id,CASE WHEN p_id IS NULL THEN ''SHOWTIME_CREATED'' ELSE ''SHOWTIME_UPDATED'' END);';
  END IF;
  IF (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 THEN RAISE EXCEPTION 'Unexpected operation definition: %',name; END IF;
  EXECUTE replace(definition,needle,CASE WHEN name IN ('configure_hall_layout','configure_seat') THEN needle||audit ELSE audit||needle END);
 END LOOP;
END $migration$;

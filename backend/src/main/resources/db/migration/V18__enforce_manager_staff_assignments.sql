-- Operator installation required. Reuse the V13 assignment domain writer; no account/invitation authority.
DO $migration$
DECLARE ns text:=current_schema(); q text:=format('%I.',current_schema()); definition text; original text;
 anchor text; ddl text:=$definitions$
CREATE FUNCTION app.manager_assign_staff(p_actor bigint,p_source bigint,p_user bigint,p_cinema bigint,p_effective timestamptz,p_assignment bigint,p_status text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_cinema bigint;
BEGIN
 -- Same sorted actor/target User lock order as existing Staff and Manager administration.
 PERFORM id FROM app.users WHERE id IN (p_actor,p_user) ORDER BY id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=p_actor AND role='MANAGER' AND status='ACTIVE') THEN
  RAISE EXCEPTION USING ERRCODE='P0004',MESSAGE='Current Manager unavailable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM app.cinema_assignments WHERE user_id=p_actor AND assignment_type='MANAGER'
  AND status='ACTIVE' AND effective_at<=clock_timestamp()) THEN
  RAISE EXCEPTION USING ERRCODE='P0004',MESSAGE='Current Manager scope unavailable'; END IF;
 IF p_source IS NULL OR NOT EXISTS(SELECT 1 FROM app.cinema_assignments WHERE user_id=p_actor AND cinema_id=p_source
  AND assignment_type='MANAGER' AND status='ACTIVE' AND effective_at<=clock_timestamp()) THEN
  RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Scoped Staff unavailable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM app.users u JOIN app.staff_onboarding o ON o.user_id=u.id WHERE u.id=p_user AND u.role='STAFF')
  OR NOT EXISTS(SELECT 1 FROM app.cinema_assignments WHERE user_id=p_user AND cinema_id=p_source AND assignment_type='STAFF') THEN
  RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Scoped Staff unavailable'; END IF;
 IF p_assignment IS NOT NULL THEN
  IF p_cinema IS NOT NULL OR p_effective IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Immutable assignment identity'; END IF;
  SELECT cinema_id INTO v_cinema FROM app.cinema_assignments WHERE id=p_assignment AND user_id=p_user AND assignment_type='STAFF' AND cinema_id=p_source;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Scoped assignment unavailable'; END IF;
 ELSE
  IF p_status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid initial assignment'; END IF;
  v_cinema:=p_cinema;
 END IF;
 IF v_cinema IS NULL OR NOT EXISTS(SELECT 1 FROM app.cinema_assignments WHERE user_id=p_actor AND cinema_id=v_cinema
  AND assignment_type='MANAGER' AND status='ACTIVE' AND effective_at<=clock_timestamp()) THEN
  RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Scoped assignment unavailable'; END IF;
 -- Locks persist through the shared writer/audit/commit. User lock also serializes ADMIN revocation.
 PERFORM id FROM app.cinema_assignments WHERE user_id=p_actor AND cinema_id IN (p_source,v_cinema)
  AND assignment_type='MANAGER' AND status='ACTIVE' AND effective_at<=clock_timestamp() ORDER BY id FOR SHARE;
 RETURN app.staff_apply_assignment(p_actor,p_user,v_cinema,p_effective,p_assignment,p_status);
END $body$;
ALTER FUNCTION app.manager_assign_staff(bigint,bigint,bigint,bigint,timestamptz,bigint,text) OWNER TO smart_cinema_staff_owner;
REVOKE ALL ON FUNCTION app.manager_assign_staff(bigint,bigint,bigint,bigint,timestamptz,bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.manager_assign_staff(bigint,bigint,bigint,bigint,timestamptz,bigint,text) TO smart_cinema_hold_runtime;
CREATE OR REPLACE FUNCTION app.staff_assign_cinema(p_actor bigint,p_user bigint,p_cinema bigint,p_effective timestamptz,p_assignment bigint,p_status text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
BEGIN
 PERFORM app.staff_lock_admin(p_actor,p_user);
 RETURN app.staff_apply_assignment(p_actor,p_user,p_cinema,p_effective,p_assignment,p_status);
END $body$;
$definitions$;
BEGIN
 SELECT pg_get_functiondef((q||'staff_assign_cinema(bigint,bigint,bigint,timestamptz,bigint,text)')::regprocedure) INTO original;
 anchor:='PERFORM '||q||'staff_lock_admin(p_actor,p_user);';
 IF (length(original)-length(replace(original,anchor,'')))/length(anchor)<>1
  OR position('INSERT INTO '||q||'cinema_assignments' IN original)=0
  OR position('INSERT INTO '||q||'audit_records' IN original)=0 THEN
  RAISE EXCEPTION 'Unexpected protected Staff assignment writer'; END IF;
 definition:=replace(original,q||'staff_assign_cinema(',q||'staff_apply_assignment(');
 definition:=replace(definition,anchor,'-- Internal domain core: callable only by the protected Staff owner.');
 EXECUTE definition;
 EXECUTE format('ALTER FUNCTION %I.staff_apply_assignment(bigint,bigint,bigint,timestamptz,bigint,text) OWNER TO smart_cinema_staff_owner',ns);
 EXECUTE format('REVOKE ALL ON FUNCTION %I.staff_apply_assignment(bigint,bigint,bigint,timestamptz,bigint,text) FROM PUBLIC,smart_cinema_hold_runtime',ns);
 EXECUTE replace(ddl,'app.',q);
 -- CREATE OR REPLACE preserves the historical ADMIN wrapper owner and ACL.
END $migration$;

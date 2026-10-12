-- V13's durable limiter reserved only invitation scopes. Add the approved
-- operational bounds without changing Ticket/financial writers or old checksums.
ALTER TABLE staff_rate_limits DROP CONSTRAINT staff_rate_limits_scope_check;
ALTER TABLE staff_rate_limits ADD CONSTRAINT staff_rate_limits_scope_check
 CHECK(scope IN ('REDEMPTION','REISSUE','STAFF_READ','CHECKIN'));
DO $migration$ DECLARE ns text:=current_schema(); ddl text:=$definitions$
CREATE OR REPLACE FUNCTION app.staff_rate_limit(p_scope text,p_key text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $b$
DECLARE v_limit integer; v_span interval; v_now timestamptz:=clock_timestamp(); v_hits integer;
BEGIN
 IF p_scope='REDEMPTION' THEN v_limit:=10;v_span:=interval '1 minute';
 ELSIF p_scope='REISSUE' THEN v_limit:=3;v_span:=interval '1 hour';
 ELSIF p_scope='STAFF_READ' THEN v_limit:=60;v_span:=interval '1 minute';
 ELSIF p_scope='CHECKIN' THEN v_limit:=30;v_span:=interval '1 minute'; ELSE RETURN false; END IF;
 IF p_key IS NULL OR p_key !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
 DELETE FROM app.staff_rate_limits WHERE window_at<v_now-interval '7 days';
 INSERT INTO app.staff_rate_limits(scope,key_digest,window_at,hits) VALUES(p_scope,p_key,v_now,1)
 ON CONFLICT(scope,key_digest) DO UPDATE SET hits=CASE WHEN app.staff_rate_limits.window_at+v_span<=v_now THEN 1 ELSE least(app.staff_rate_limits.hits+1,v_limit+1) END,
 window_at=CASE WHEN app.staff_rate_limits.window_at+v_span<=v_now THEN v_now ELSE app.staff_rate_limits.window_at END RETURNING hits INTO v_hits;
 RETURN v_hits<=v_limit;
END $b$;
$definitions$;
BEGIN
 EXECUTE replace(ddl,'app.',format('%I.',ns));
 -- CREATE OR REPLACE retains V13's owner and ACL. Fail closed if not intact.
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname=ns AND p.proname='staff_rate_limit'
  AND r.rolname='smart_cinema_staff_owner' AND p.prosecdef) THEN
  RAISE EXCEPTION 'Protected Staff limiter owner unavailable';
 END IF;
END $migration$;

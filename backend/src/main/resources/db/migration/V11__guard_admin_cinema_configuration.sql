-- Admin configuration is a separate NOLOGIN definer, never runtime ownership.
DO $roles$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='smart_cinema_configuration_owner') THEN
        CREATE ROLE smart_cinema_configuration_owner NOLOGIN;
    END IF;
    -- Managed PostgreSQL migration users are not superusers. Ownership transfer
    -- needs temporary SET membership, removed in this same Flyway transaction.
    EXECUTE format('GRANT smart_cinema_configuration_owner TO %I WITH SET TRUE',current_user);
END $roles$;

DO $migration$
DECLARE target_schema text:=current_schema(); ddl text:=$definitions$
CREATE FUNCTION app.seat_number_span(p_label text) RETURNS numrange
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_start numeric; v_end numeric;
BEGIN
    IF btrim(p_label) !~ '^[0-9]+(-[0-9]+)?$' THEN RETURN NULL; END IF;
    v_start:=split_part(btrim(p_label),'-',1)::numeric;
    v_end:=CASE WHEN strpos(p_label,'-')>0 THEN split_part(btrim(p_label),'-',2)::numeric ELSE v_start END;
    IF v_end<v_start THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid Seat number range'; END IF;
    RETURN numrange(v_start,v_end,'[]');
END $body$;

CREATE FUNCTION app.lock_admin_configuration(p_actor bigint) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $body$
BEGIN
    PERFORM id FROM app.users WHERE id=p_actor AND role='ADMIN' AND status='ACTIVE' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0004',MESSAGE='Active Admin required'; END IF;
END $body$;

CREATE FUNCTION app.configure_cinema(p_actor bigint,p_id bigint,p_name text,p_address text,
    p_contact text,p_operating text,p_status text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_id bigint;
BEGIN
    PERFORM app.lock_admin_configuration(p_actor);
    IF p_id IS NULL THEN
        INSERT INTO app.cinemas(name,address,contact,operating_information,status)
            VALUES(btrim(p_name),btrim(p_address),p_contact,p_operating,p_status) RETURNING id INTO v_id;
    ELSE
        PERFORM id FROM app.cinemas WHERE id=p_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Cinema unavailable'; END IF;
        UPDATE app.cinemas SET name=btrim(p_name),address=btrim(p_address),contact=p_contact,
            operating_information=p_operating,status=p_status WHERE id=p_id RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END $body$;

CREATE FUNCTION app.configure_hall(p_actor bigint,p_cinema bigint,p_id bigint,p_name text,
    p_capacity integer,p_type text,p_status text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_id bigint;
BEGIN
    PERFORM app.lock_admin_configuration(p_actor);
    PERFORM id FROM app.cinemas WHERE id=p_cinema FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Cinema unavailable'; END IF;
    IF p_id IS NULL THEN
        INSERT INTO app.halls(cinema_id,name,capacity,type,status)
            VALUES(p_cinema,btrim(p_name),p_capacity,btrim(p_type),p_status) RETURNING id INTO v_id;
    ELSE
        PERFORM id FROM app.halls WHERE id=p_id AND cinema_id=p_cinema FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Hall unavailable'; END IF;
        IF EXISTS(SELECT 1 FROM app.seats WHERE hall_id=p_id)
            AND p_capacity<>(SELECT capacity FROM app.halls WHERE id=p_id) THEN
            RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Initialized layout prevents capacity changes';
        END IF;
        UPDATE app.halls SET name=btrim(p_name),capacity=p_capacity,type=btrim(p_type),status=p_status
            WHERE id=p_id RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END $body$;

CREATE FUNCTION app.configure_hall_layout(p_actor bigint,p_hall bigint,p_units jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_cinema bigint;
BEGIN
    PERFORM app.lock_admin_configuration(p_actor);
    SELECT cinema_id INTO v_cinema FROM app.halls WHERE id=p_hall;
    PERFORM id FROM app.cinemas WHERE id=v_cinema FOR SHARE;
    PERFORM id FROM app.halls WHERE id=p_hall AND cinema_id=v_cinema FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Hall unavailable'; END IF;
    IF p_units IS NULL OR jsonb_typeof(p_units)<>'array' OR jsonb_array_length(p_units)=0 THEN
        RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Complete layout required';
    END IF;
    PERFORM app.seat_number_span(unit->>'number') FROM jsonb_array_elements(p_units) unit;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_units) WITH ORDINALITY a(unit,position)
        JOIN jsonb_array_elements(p_units) WITH ORDINALITY b(unit,position) ON a.position<b.position
        WHERE btrim(a.unit->>'row')=btrim(b.unit->>'row')
        AND app.seat_number_span(a.unit->>'number') && app.seat_number_span(b.unit->>'number')) THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Overlapping Seat number ranges';
    END IF;
    -- Reuse the deployment initializer: one complete, capacity-checked transaction.
    PERFORM app.initialize_hall_seats(p_hall,p_units);
END $body$;

CREATE OR REPLACE FUNCTION app.guard_seat_configuration() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $body$
BEGIN
    IF current_user='smart_cinema_hold_owner' AND TG_OP='INSERT' THEN RETURN NEW; END IF;
    IF current_user<>'smart_cinema_configuration_owner' OR TG_TABLE_NAME<>'seats' OR TG_OP<>'UPDATE' THEN
        RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Protected Seat configuration';
    END IF;
    IF (NEW.id,NEW.hall_id) IS DISTINCT FROM (OLD.id,OLD.hall_id) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Seat identity is permanent';
    END IF;
    IF (NEW.row,NEW.number,NEW.seat_type) IS DISTINCT FROM (OLD.row,OLD.number,OLD.seat_type) THEN
        IF EXISTS(SELECT 1 FROM app.showtime_seats WHERE seat_id=OLD.id)
            OR EXISTS(SELECT 1 FROM app.seat_holds WHERE seat_id=OLD.id)
            OR EXISTS(SELECT 1 FROM app.booking_seats WHERE seat_id=OLD.id) THEN
            RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Referenced Seat structure is permanent';
        END IF;
        IF (CASE WHEN NEW.seat_type='COUPLE' THEN 2 ELSE 1 END)
            <> (CASE WHEN OLD.seat_type='COUPLE' THEN 2 ELSE 1 END) THEN
            RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Seat edit must preserve initialized guest capacity';
        END IF;
    END IF;
    RETURN NEW;
END $body$;

CREATE FUNCTION app.configure_seat(p_actor bigint,p_id bigint,p_row text,p_number text,
    p_type text,p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_hall bigint; v_cinema bigint;
BEGIN
    PERFORM app.lock_admin_configuration(p_actor);
    SELECT s.hall_id,h.cinema_id INTO v_hall,v_cinema FROM app.seats s JOIN app.halls h ON h.id=s.hall_id WHERE s.id=p_id;
    PERFORM id FROM app.cinemas WHERE id=v_cinema FOR SHARE;
    PERFORM id FROM app.halls WHERE id=v_hall AND cinema_id=v_cinema FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Seat unavailable'; END IF;
    PERFORM app.seat_number_span(p_number);
    IF EXISTS(SELECT 1 FROM app.seats WHERE hall_id=v_hall AND id<>p_id AND row=btrim(p_row)
        AND app.seat_number_span(number) && app.seat_number_span(p_number)) THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Overlapping Seat number ranges';
    END IF;
    PERFORM id FROM app.seats WHERE id=p_id AND hall_id=v_hall FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Seat unavailable'; END IF;
    UPDATE app.seats SET row=btrim(p_row),number=btrim(p_number),seat_type=p_type,physical_status=p_status WHERE id=p_id;
END $body$;

REVOKE ALL ON FUNCTION app.seat_number_span(text),app.lock_admin_configuration(bigint),
    app.configure_cinema(bigint,bigint,text,text,text,text,text),
    app.configure_hall(bigint,bigint,bigint,text,integer,text,text),
    app.configure_hall_layout(bigint,bigint,jsonb),app.configure_seat(bigint,bigint,text,text,text,text) FROM PUBLIC;
ALTER FUNCTION app.lock_admin_configuration(bigint) OWNER TO smart_cinema_configuration_owner;
ALTER FUNCTION app.seat_number_span(text) OWNER TO smart_cinema_configuration_owner;
ALTER FUNCTION app.configure_cinema(bigint,bigint,text,text,text,text,text) OWNER TO smart_cinema_configuration_owner;
ALTER FUNCTION app.configure_hall(bigint,bigint,bigint,text,integer,text,text) OWNER TO smart_cinema_configuration_owner;
ALTER FUNCTION app.configure_hall_layout(bigint,bigint,jsonb) OWNER TO smart_cinema_configuration_owner;
ALTER FUNCTION app.configure_seat(bigint,bigint,text,text,text,text) OWNER TO smart_cinema_configuration_owner;
GRANT SELECT,UPDATE ON app.users TO smart_cinema_configuration_owner;
GRANT SELECT,INSERT,UPDATE ON app.cinemas,app.halls TO smart_cinema_configuration_owner;
GRANT USAGE ON SEQUENCE app.cinemas_id_seq,app.halls_id_seq TO smart_cinema_configuration_owner;
GRANT SELECT ON app.seats,app.showtime_seats,app.seat_holds,app.booking_seats TO smart_cinema_configuration_owner;
GRANT UPDATE(row,number,seat_type,physical_status) ON app.seats TO smart_cinema_configuration_owner;
GRANT EXECUTE ON FUNCTION app.initialize_hall_seats(bigint,jsonb) TO smart_cinema_configuration_owner;
GRANT EXECUTE ON FUNCTION app.configure_cinema(bigint,bigint,text,text,text,text,text),
    app.configure_hall(bigint,bigint,bigint,text,integer,text,text),
    app.configure_hall_layout(bigint,bigint,jsonb),app.configure_seat(bigint,bigint,text,text,text,text)
    TO smart_cinema_hold_runtime;
$definitions$;
BEGIN
    EXECUTE format('GRANT USAGE,CREATE ON SCHEMA %I TO smart_cinema_configuration_owner',target_schema);
    EXECUTE replace(ddl,'app.',format('%I.',target_schema));
    EXECUTE format('REVOKE CREATE ON SCHEMA %I FROM smart_cinema_configuration_owner',target_schema);
    EXECUTE format('REVOKE smart_cinema_configuration_owner FROM %I',current_user);
END $migration$;

-- One controlled Admin boundary; historical schedule snapshots are not rewritten.
DO $roles$
BEGIN
    EXECUTE format('GRANT smart_cinema_configuration_owner TO %I WITH SET TRUE',current_user);
END $roles$;

DO $migration$
DECLARE target_schema text:=current_schema(); ddl text:=$definitions$
CREATE FUNCTION app.guard_admin_showtime_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
BEGIN
    IF TG_OP='DELETE' THEN
        RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Showtime deletion is not supported';
    END IF;
    IF NEW.id<>OLD.id THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Showtime identity is permanent'; END IF;
    IF NEW.hall_id<>OLD.hall_id AND EXISTS(SELECT 1 FROM app.showtime_seats WHERE showtime_id=OLD.id) THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Initialized Showtime Hall is permanent';
    END IF;
    IF (NEW.movie_id,NEW.hall_id,NEW.start_time,NEW.end_time,NEW.occupied_until,NEW.booking_cut_off,NEW.base_price,NEW.status)
        IS DISTINCT FROM (OLD.movie_id,OLD.hall_id,OLD.start_time,OLD.end_time,OLD.occupied_until,OLD.booking_cut_off,OLD.base_price,OLD.status)
        AND (EXISTS(SELECT 1 FROM app.seat_holds WHERE showtime_id=OLD.id)
            OR EXISTS(SELECT 1 FROM app.bookings WHERE showtime_id=OLD.id)) THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Showtime history prevents schedule, price or lifecycle changes';
    END IF;
    RETURN NEW;
END $body$;
CREATE TRIGGER trg_showtimes_admin_history BEFORE UPDATE OR DELETE ON app.showtimes
FOR EACH ROW EXECUTE FUNCTION app.guard_admin_showtime_history();

CREATE FUNCTION app.configure_showtime(p_actor bigint,p_id bigint,p_movie bigint,p_hall bigint,
    p_start timestamptz,p_price numeric,p_status text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $body$
DECLARE v_cinema bigint; v_hall bigint; v_capacity integer; v_duration integer;
    v_now timestamptz; v_end timestamptz; v_occupied timestamptz; v_cutoff timestamptz;
    v_old app.showtimes%ROWTYPE; v_id bigint; v_sellable bigint[];
BEGIN
    PERFORM app.lock_admin_configuration(p_actor);
    IF p_id IS NOT NULL THEN
        SELECT * INTO v_old FROM app.showtimes WHERE id=p_id;
        IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Showtime unavailable'; END IF;
        v_hall:=v_old.hall_id;
    ELSE v_hall:=p_hall; END IF;
    SELECT cinema_id INTO v_cinema FROM app.halls WHERE id=v_hall;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Hall unavailable'; END IF;
    PERFORM id FROM app.cinemas WHERE id=v_cinema FOR SHARE;
    SELECT capacity INTO v_capacity FROM app.halls WHERE id=v_hall AND cinema_id=v_cinema FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Hall changed; reload'; END IF;
    IF p_id IS NOT NULL THEN
        SELECT * INTO v_old FROM app.showtimes WHERE id=p_id AND hall_id=v_hall FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Showtime changed; reload'; END IF;
    END IF;
    v_now:=clock_timestamp();
    IF p_hall IS NULL OR p_hall<>v_hall THEN RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Showtime Hall is permanent'; END IF;
    IF p_start IS NULL OR NOT isfinite(p_start) OR p_start<=v_now THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='A future Showtime is required';
    END IF;
    IF p_price IS NULL OR NOT (p_price>=0 AND p_price<1000000000000000) OR p_price<>trunc(p_price,4) THEN
        RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid exact Showtime price';
    END IF;
    IF p_status IS NULL OR p_status NOT IN ('DRAFT','SCHEDULED','OPEN_FOR_BOOKING','CANCELLED') THEN
        RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Unsupported Admin lifecycle value';
    END IF;
    IF p_id IS NULL AND p_status='CANCELLED' THEN
        RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Invalid initial Showtime status';
    END IF;
    IF p_id IS NOT NULL THEN
        IF v_old.start_time<=v_now OR v_old.status IN ('CANCELLED','STARTED','ENDED')
            OR EXISTS(SELECT 1 FROM app.seat_holds WHERE showtime_id=p_id)
            OR EXISTS(SELECT 1 FROM app.bookings WHERE showtime_id=p_id) THEN
            RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Showtime is no longer editable';
        END IF;
        IF NOT (p_status=v_old.status
            OR (v_old.status='DRAFT' AND p_status IN ('SCHEDULED','OPEN_FOR_BOOKING','CANCELLED'))
            OR (v_old.status='SCHEDULED' AND p_status IN ('OPEN_FOR_BOOKING','CANCELLED'))
            OR (v_old.status='OPEN_FOR_BOOKING' AND p_status='CANCELLED')) THEN
            RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Unsupported Showtime transition';
        END IF;
        IF p_status='CANCELLED' THEN
            IF (p_movie,p_start,p_price) IS DISTINCT FROM (v_old.movie_id,v_old.start_time,v_old.base_price) THEN
                RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Cancellation cannot change Showtime content';
            END IF;
            UPDATE app.showtimes SET status='CANCELLED' WHERE id=p_id;
            RETURN p_id;
        END IF;
    END IF;
    SELECT duration INTO v_duration FROM app.movies WHERE id=p_movie AND status='PUBLISHED' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='A PUBLISHED Movie is required'; END IF;
    IF NOT EXISTS(SELECT 1 FROM app.cinemas WHERE id=v_cinema AND status='ACTIVE')
        OR NOT EXISTS(SELECT 1 FROM app.halls WHERE id=v_hall AND status='ACTIVE') THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Cinema and Hall must be active';
    END IF;
    PERFORM id FROM app.seats WHERE hall_id=v_hall ORDER BY id FOR SHARE;
    IF NOT EXISTS(SELECT 1 FROM app.seats WHERE hall_id=v_hall)
        OR v_capacity<>(SELECT coalesce(sum(CASE WHEN seat_type='COUPLE' THEN 2 ELSE 1 END),0) FROM app.seats WHERE hall_id=v_hall) THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Complete Hall guest capacity is required';
    END IF;
    SELECT coalesce(array_agg(id ORDER BY id) FILTER (WHERE physical_status='ACTIVE'),ARRAY[]::bigint[])
        INTO v_sellable FROM app.seats WHERE hall_id=v_hall;
    IF p_id IS NOT NULL THEN
        PERFORM id FROM app.showtime_seats WHERE showtime_id=p_id ORDER BY seat_id FOR UPDATE;
        IF (SELECT count(*) FROM app.showtime_seats WHERE showtime_id=p_id)
            <>(SELECT count(*) FROM app.seats WHERE hall_id=v_hall) THEN
            RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Complete Showtime membership is required';
        END IF;
        IF p_status='OPEN_FOR_BOOKING' AND NOT EXISTS(SELECT 1 FROM app.showtime_seats ss JOIN app.seats s ON s.id=ss.seat_id
            WHERE ss.showtime_id=p_id AND ss.is_sellable AND s.physical_status='ACTIVE') THEN
            RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Selectable membership is required to open';
        END IF;
    ELSIF p_status='OPEN_FOR_BOOKING' AND cardinality(v_sellable)=0 THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Selectable membership is required to open';
    END IF;
    -- Recheck after waiting for Movie/Seat/pair locks. Never authorize from stale time.
    v_now:=clock_timestamp();
    IF p_start<=v_now OR (p_id IS NOT NULL AND v_old.start_time<=v_now) THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Showtime has started';
    END IF;
    IF p_id IS NOT NULL AND p_movie=v_old.movie_id AND p_start=v_old.start_time THEN
        v_end:=v_old.end_time; v_occupied:=v_old.occupied_until; v_cutoff:=v_old.booking_cut_off;
    ELSE
        v_end:=p_start+make_interval(mins=>v_duration); v_occupied:=v_end; v_cutoff:=p_start;
    END IF;
    IF p_status='OPEN_FOR_BOOKING' AND v_cutoff<=v_now THEN
        RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='Showtime booking cutoff has passed';
    END IF;
    IF p_id IS NULL THEN
        INSERT INTO app.showtimes(movie_id,hall_id,start_time,end_time,occupied_until,booking_cut_off,base_price,status)
            VALUES(p_movie,v_hall,p_start,v_end,v_occupied,v_cutoff,p_price,p_status) RETURNING id INTO v_id;
        PERFORM app.initialize_showtime_seats(v_id,v_sellable);
    ELSE
        UPDATE app.showtimes SET movie_id=p_movie,start_time=p_start,end_time=v_end,occupied_until=v_occupied,
            booking_cut_off=v_cutoff,base_price=p_price,status=p_status WHERE id=p_id RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END $body$;

REVOKE ALL ON FUNCTION app.guard_admin_showtime_history(),
    app.configure_showtime(bigint,bigint,bigint,bigint,timestamptz,numeric,text) FROM PUBLIC;
ALTER FUNCTION app.guard_admin_showtime_history() OWNER TO smart_cinema_configuration_owner;
ALTER FUNCTION app.configure_showtime(bigint,bigint,bigint,bigint,timestamptz,numeric,text) OWNER TO smart_cinema_configuration_owner;
GRANT SELECT,INSERT ON app.showtimes TO smart_cinema_configuration_owner;
GRANT UPDATE(movie_id,hall_id,start_time,end_time,occupied_until,booking_cut_off,base_price,status) ON app.showtimes TO smart_cinema_configuration_owner;
GRANT SELECT ON app.movies,app.bookings TO smart_cinema_configuration_owner;
GRANT UPDATE(id) ON app.movies TO smart_cinema_configuration_owner;
GRANT UPDATE(id) ON app.showtime_seats TO smart_cinema_configuration_owner;
GRANT USAGE ON SEQUENCE app.showtimes_id_seq TO smart_cinema_configuration_owner;
GRANT EXECUTE ON FUNCTION app.initialize_showtime_seats(bigint,bigint[]) TO smart_cinema_configuration_owner;
GRANT EXECUTE ON FUNCTION app.configure_showtime(bigint,bigint,bigint,bigint,timestamptz,numeric,text) TO smart_cinema_hold_runtime;
$definitions$;
BEGIN
    EXECUTE format('GRANT USAGE,CREATE ON SCHEMA %I TO smart_cinema_configuration_owner',target_schema);
    EXECUTE replace(ddl,'app.',format('%I.',target_schema));
    EXECUTE format('REVOKE CREATE ON SCHEMA %I FROM smart_cinema_configuration_owner',target_schema);
    EXECUTE format('REVOKE smart_cinema_configuration_owner FROM %I',current_user);
END $migration$;

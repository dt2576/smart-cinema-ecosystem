-- Run with psql -X -v ON_ERROR_STOP=1 -f test/backend/movie-domain-migration.sql.
-- All fixture rows and the temporary assertion function are rolled back.
-- PostgreSQL identity sequences may advance. TEST_VALUE is synthetic, not a business state.
BEGIN;

CREATE FUNCTION pg_temp.expect_movie_error(statement TEXT, expected_state TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    actual_state TEXT;
BEGIN
    BEGIN
        EXECUTE statement;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE;
        IF actual_state = expected_state THEN
            RETURN;
        END IF;
        RAISE EXCEPTION 'Expected SQLSTATE %, got % for %', expected_state, actual_state, statement;
    END;
    RAISE EXCEPTION 'Expected SQLSTATE %, but statement succeeded: %', expected_state, statement;
END;
$$;

DO $$
DECLARE
    movie_id_value BIGINT;
    genre_id_value BIGINT;
    column_name TEXT;
BEGIN
    INSERT INTO movies (title, duration, status)
        VALUES ('Migration verification', 1, 'TEST_VALUE') RETURNING id INTO movie_id_value;
    INSERT INTO movies (title, duration, status)
        VALUES ('Migration verification', 120, 'TEST_VALUE');
    INSERT INTO genres (name) VALUES ('Migration verification') RETURNING id INTO genre_id_value;
    INSERT INTO genres (name) VALUES ('Migration verification');
    INSERT INTO movie_genres (movie_id, genre_id) VALUES (movie_id_value, genre_id_value);

    FOREACH column_name IN ARRAY ARRAY['title', 'description', 'age_rating', 'language', 'poster', 'trailer', 'status'] LOOP
        PERFORM pg_temp.expect_movie_error(format('UPDATE movies SET %I = %L WHERE id = %s', column_name, '   ', movie_id_value), '23514');
    END LOOP;
    FOREACH column_name IN ARRAY ARRAY['title', 'duration', 'status'] LOOP
        PERFORM pg_temp.expect_movie_error(format('UPDATE movies SET %I = NULL WHERE id = %s', column_name, movie_id_value), '23502');
    END LOOP;
    PERFORM pg_temp.expect_movie_error(format('UPDATE movies SET duration = 0 WHERE id = %s', movie_id_value), '23514');
    PERFORM pg_temp.expect_movie_error(format('UPDATE movies SET duration = -1 WHERE id = %s', movie_id_value), '23514');
    PERFORM pg_temp.expect_movie_error(format('UPDATE movies SET release_date = %L WHERE id = %s', 'infinity', movie_id_value), '23514');
    PERFORM pg_temp.expect_movie_error(format('UPDATE movies SET release_date = %L WHERE id = %s', '-infinity', movie_id_value), '23514');
    PERFORM pg_temp.expect_movie_error(format('UPDATE movies SET status = %L WHERE id = %s', 'invalid-status', movie_id_value), '23514');
    PERFORM pg_temp.expect_movie_error(format('UPDATE movies SET title = repeat(%L,256) WHERE id = %s', 'x', movie_id_value), '22001');
    PERFORM pg_temp.expect_movie_error('INSERT INTO genres (name) VALUES ('' '')', '23514');
    PERFORM pg_temp.expect_movie_error('INSERT INTO genres (name) VALUES (NULL)', '23502');
    PERFORM pg_temp.expect_movie_error(format('INSERT INTO movie_genres (movie_id, genre_id) VALUES (%s,%s)', movie_id_value, genre_id_value), '23505');
    PERFORM pg_temp.expect_movie_error(format('INSERT INTO movie_genres (movie_id, genre_id) VALUES (NULL,%s)', genre_id_value), '23502');
    PERFORM pg_temp.expect_movie_error(format('INSERT INTO movie_genres (movie_id, genre_id) VALUES (%s,NULL)', movie_id_value), '23502');
    -- Parent deletes and key updates must not cascade through associations.
    PERFORM pg_temp.expect_movie_error(format('DELETE FROM movies WHERE id = %s', movie_id_value), '23503');
    PERFORM pg_temp.expect_movie_error(format('DELETE FROM genres WHERE id = %s', genre_id_value), '23503');
    PERFORM pg_temp.expect_movie_error(format('UPDATE movies SET id = -id WHERE id = %s', movie_id_value), '23503');
    PERFORM pg_temp.expect_movie_error(format('UPDATE genres SET id = -id WHERE id = %s', genre_id_value), '23503');

    UPDATE movies SET description = 'Synopsis', release_date = DATE '2026-09-25',
        age_rating = 'Test rating', language = 'Test language', poster = 'poster-reference',
        trailer = 'trailer-reference' WHERE id = movie_id_value;
    DELETE FROM movie_genres WHERE movie_id = movie_id_value AND genre_id = genre_id_value;
    DELETE FROM movies WHERE id = movie_id_value;
    DELETE FROM genres WHERE id = genre_id_value;
    PERFORM pg_temp.expect_movie_error(format('INSERT INTO movie_genres (movie_id, genre_id) VALUES (%s,%s)', movie_id_value, genre_id_value), '23503');
    RAISE NOTICE 'Movie migration integrity checks passed';
END;
$$;

ROLLBACK;

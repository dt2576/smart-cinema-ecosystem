package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import com.smartcinema.movie.InvalidMovieRequestException;

class AdminMovieRequestTests {
    private Map<String,Object> content() { return new HashMap<>(Map.of("title"," Film ","duration",120,"genreIds",List.of("9007199254740993","2"))); }
    @Test void draftMayOmitPublicationFieldsAndIdsRemainExact() {
        var request=AdminMovieRequest.parse(content());
        assertThat(request.title()).isEqualTo("Film");
        assertThat(request.releaseDate()).isNull();
        assertThat(request.genreIds()).containsExactly(2L,9007199254740993L);
    }
    @Test void rejectsUnknownFieldsAndNumericOrDuplicateIds() {
        for(Object ids:List.of(List.of(1),List.of("1","01"),List.of("9223372036854775808"),List.of("0"))) {
            var body=content(); body.put("genreIds",ids);
            assertThatThrownBy(() -> AdminMovieRequest.parse(body)).isInstanceOf(InvalidMovieRequestException.class);
        }
        var body=content(); body.put("status","PUBLISHED");
        assertThatThrownBy(() -> AdminMovieRequest.parse(body)).isInstanceOf(InvalidMovieRequestException.class);
    }
    @Test void rejectsInvalidDatesBlankAndOverlongValuesAndNonIntegerDuration() {
        for(var entry:Map.<String,Object>of("title"," ","language","x".repeat(101),"releaseDate","2026-02-30","duration",120.5).entrySet()) {
            var body=content(); body.put(entry.getKey(),entry.getValue());
            assertThatThrownBy(() -> AdminMovieRequest.parse(body)).isInstanceOf(InvalidMovieRequestException.class);
        }
    }
}

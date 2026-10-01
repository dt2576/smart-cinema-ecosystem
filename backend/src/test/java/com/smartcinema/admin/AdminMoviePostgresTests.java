package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import com.smartcinema.movie.*;
import com.smartcinema.movie.dto.MovieDetail;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties="seat-hold.cleanup-enabled=false")
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="MOVIE_DB_TESTS",matches="true")
class AdminMoviePostgresTests {
    private static final String SCHEMA="admin_suite_"+UUID.randomUUID().toString().replace("-","");
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.flyway.default-schema",()->SCHEMA);
        properties.add("spring.flyway.schemas",()->SCHEMA+",public");
        properties.add("spring.jpa.properties.hibernate.default_schema",()->SCHEMA);
        properties.add("spring.datasource.url",()->{ String url=System.getenv("DB_URL"); return url+(url.contains("?")?"&":"?")+"currentSchema="+SCHEMA+",public"; });
    }
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AdminMovieService service;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    @Autowired PlatformTransactionManager transactions;
    private long admin;
    private long customer;
    private long genre;
    private String prefix;
    private String password;
    private String email;

    @BeforeEach void fixtures() {
        prefix="Admin verification "+UUID.randomUUID();
        password=UUID.randomUUID().toString(); email=UUID.randomUUID()+"@example.test";
        admin=account(email,"ADMIN","ACTIVE"); customer=account(UUID.randomUUID()+"@example.test","CUSTOMER","ACTIVE");
        genre=jdbc.queryForObject("INSERT INTO genres(name) VALUES (?) RETURNING id",Long.class,prefix);
    }
    @AfterEach void cleanup() {
        jdbc.update("DELETE FROM movie_genres WHERE movie_id IN (SELECT id FROM movies WHERE title LIKE ?)",prefix+"%");
        jdbc.update("DELETE FROM movies WHERE title LIKE ?",prefix+"%");
        jdbc.update("DELETE FROM genres WHERE id=?",genre);
        jdbc.update("DELETE FROM refresh_tokens WHERE user_id IN (?,?)",admin,customer);
        jdbc.update("DELETE FROM users WHERE id IN (?,?)",admin,customer);
    }
    private long account(String email,String role,String status) {
        return jdbc.queryForObject("INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,?,'Test actor','0901234567',?,?) RETURNING id",
                Long.class,email,passwords.encode(password),role,status);
    }
    private RequestPostProcessor actor(long id,String role) { return jwt().jwt(builder->builder.subject(Long.toString(id)).claim("role",role)).authorities(()->"ROLE_"+role); }
    private RequestPostProcessor admin() { return actor(admin,"ADMIN"); }
    private Map<String,Object> body(String suffix) {
        return new HashMap<>(Map.of("title",prefix+suffix,"duration",120,"releaseDate","2026-10-01","ageRating","T13","language","Vietnamese",
                "posterUrl","https://example.test/poster.jpg","genreIds",List.of(Long.toString(genre))));
    }
    private MovieDetail create(String suffix) { return service.create(admin,AdminMovieRequest.parse(body(suffix))); }

    @Test void realLoginTokenAndCommittedApiFlowSharesCustomerSourceOfTruth() throws Exception {
        String login=mvc.perform(post("/api/v1/auth/tokens").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email",email,"password",password))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token=json.readTree(login).get("accessToken").asText();
        String result=mvc.perform(post("/api/v1/admin/movies").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body(" created"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT")).andExpect(header().string("Cache-Control","no-store"))
                .andReturn().getResponse().getContentAsString();
        String id=json.readTree(result).get("id").asText();
        mvc.perform(get("/api/v1/admin/movies").header("Authorization","Bearer "+token).param("q",prefix)).andExpect(jsonPath("$.items[0].id").value(id));
        mvc.perform(get("/api/v1/movies/"+id)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/movies").param("q",prefix)).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(put("/api/v1/admin/movies/"+id+"/publication").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/movies").param("q",prefix)).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(put("/api/v1/admin/movies/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body(" edited"))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/movies/"+id)).andExpect(jsonPath("$.title").value(prefix+" edited"));
        mvc.perform(put("/api/v1/admin/movies/"+id+"/publication").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"UNPUBLISHED\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/movies/"+id)).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT status FROM movies WHERE id=?",String.class,Long.valueOf(id))).isEqualTo("UNPUBLISHED");
    }
    @Test void everyAdminResourceRequiresAuthenticationAndAdminJwtRole() throws Exception {
        for(String path:List.of("/api/v1/admin","/api/v1/admin/movies","/api/v1/admin/movies/1")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
            for(String role:List.of("CUSTOMER","STAFF","MANAGER")) mvc.perform(get(path).with(actor(customer,role))).andExpect(status().isForbidden());
        }
        for(var request:List.of(post("/api/v1/admin/movies"),put("/api/v1/admin/movies/1"),put("/api/v1/admin/movies/1/publication"))) {
            mvc.perform(request.contentType(MediaType.APPLICATION_JSON).content("{}" )).andExpect(status().isUnauthorized());
            mvc.perform(request.with(actor(customer,"CUSTOMER")).contentType(MediaType.APPLICATION_JSON).content("{}" )).andExpect(status().isForbidden());
        }
    }
    @Test void currentDatabaseRoleAndStatusOverrideStaleAdminTokens() throws Exception {
        mvc.perform(get("/api/v1/admin").with(admin())).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(Long.toString(admin)));
        jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?",admin);
        mvc.perform(get("/api/v1/admin").with(admin())).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/movies").with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body(" blocked")))).andExpect(status().isForbidden());
        jdbc.update("UPDATE users SET status='ACTIVE',role='CUSTOMER' WHERE id=?",admin);
        mvc.perform(get("/api/v1/admin/movies").with(admin())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin").with(actor(Long.MAX_VALUE,"ADMIN"))).andExpect(status().isForbidden());
    }
    @Test void invalidDraftCannotPublishAndPublishedEditMustRemainComplete() throws Exception {
        var draftBody=body(" incomplete"); draftBody.remove("posterUrl");
        var movie=service.create(admin,AdminMovieRequest.parse(draftBody));
        mvc.perform(put("/api/v1/admin/movies/"+movie.id()+"/publication").with(admin()).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.posterUrl").exists());
        service.update(admin,Long.valueOf(movie.id()),AdminMovieRequest.parse(body(" complete")));
        service.publication(admin,Long.valueOf(movie.id()),MovieStatus.PUBLISHED);
        mvc.perform(put("/api/v1/admin/movies/"+movie.id()).with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(draftBody)))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/movies/"+movie.id())).andExpect(jsonPath("$.title").value(prefix+" complete"));
    }
    @Test void genreReplacementIsAtomicAndRejectsMissingOrDuplicateGenres() throws Exception {
        var movie=create(" genres");
        var missing=body(" invalid"); missing.put("genreIds",List.of(Long.toString(Long.MAX_VALUE)));
        mvc.perform(put("/api/v1/admin/movies/"+movie.id()).with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(missing))).andExpect(status().isBadRequest());
        assertThat(service.detail(admin,Long.valueOf(movie.id())).title()).isEqualTo(prefix+" genres");
        var empty=body(" emptygenres"); empty.put("genreIds",List.of());
        assertThat(service.update(admin,Long.valueOf(movie.id()),AdminMovieRequest.parse(empty)).genres()).isEmpty();
        var duplicate=body(" duplicate"); duplicate.put("genreIds",List.of(Long.toString(genre),Long.toString(genre)));
        mvc.perform(post("/api/v1/admin/movies").with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(duplicate))).andExpect(status().isBadRequest());
    }
    @Test void strictInputsMissingIdsAndDeleteAreHandledWithoutSchemaChanges() throws Exception {
        var movie=create(" input");
        for(String id:List.of("0","abc","9223372036854775808")) mvc.perform(get("/api/v1/admin/movies/"+id).with(admin())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/admin/movies/9223372036854775807").with(admin())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/admin/movies").with(admin()).param("status","DRAFT")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/admin/movies/"+movie.id()).with(admin()).param("q","x")).andExpect(status().isBadRequest());
        var unknown=body(" status"); unknown.put("status","PUBLISHED");
        mvc.perform(post("/api/v1/admin/movies").with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(unknown))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/admin/movies").with(admin()).contentType(MediaType.APPLICATION_JSON).content("[]")).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/v1/admin/movies/"+movie.id()).with(admin()).with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())).andExpect(status().isMethodNotAllowed());
        assertThat(jdbc.queryForObject("SELECT max(version::integer) FROM flyway_schema_history WHERE success",Integer.class)).isEqualTo(10);
    }
    @Test void approvedTransitionsAndUnknownStoredStatusFailClosed() {
        var movie=create(" transitions"); long id=Long.valueOf(movie.id());
        assertThatThrownBy(()->service.publication(admin,id,MovieStatus.UNPUBLISHED)).isInstanceOf(InvalidMovieRequestException.class);
        service.publication(admin,id,MovieStatus.PUBLISHED); service.publication(admin,id,MovieStatus.PUBLISHED);
        service.publication(admin,id,MovieStatus.UNPUBLISHED); service.publication(admin,id,MovieStatus.PUBLISHED);
        assertThatThrownBy(()->service.publication(admin,id,MovieStatus.DRAFT)).isInstanceOf(InvalidMovieRequestException.class);
        jdbc.update("UPDATE movies SET status='UNKNOWN' WHERE id=?",id);
        assertThat(service.detail(admin,id).status()).isEqualTo("UNKNOWN");
        assertThatThrownBy(()->service.publication(admin,id,MovieStatus.PUBLISHED)).isInstanceOf(InvalidMovieRequestException.class);
    }
    @Test void adminListFiltersPaginationAndStringIdsIncludeHiddenMovies() throws Exception {
        var one=create(" 100%_"); create(" second");
        jdbc.update("INSERT INTO movies(id,title,duration,status) VALUES (9007199254740993,?,120,'DRAFT')",prefix+" largeid");
        mvc.perform(get("/api/v1/admin/movies/9007199254740993").with(admin())).andExpect(status().isOk()).andExpect(jsonPath("$.id").value("9007199254740993"));
        mvc.perform(get("/api/v1/admin/movies").with(admin()).param("q",prefix).param("size","2").param("sort","id,desc"))
                .andExpect(jsonPath("$.totalElements").value(3)).andExpect(jsonPath("$.totalPages").value(2)).andExpect(jsonPath("$.items[0].id").value("9007199254740993"));
        mvc.perform(get("/api/v1/admin/movies").with(admin()).param("q","100%_").param("genreId",Long.toString(genre)))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].id").value(one.id()));
        mvc.perform(get("/api/v1/movies/9007199254740993")).andExpect(status().isNotFound());
    }
    @Test void concurrentPublishAndInvalidEditSerializeWithoutInvalidPublishedRecord() throws Exception {
        var movie=create(" race"); long id=Long.valueOf(movie.id());
        var incomplete=body(" raceedited"); incomplete.remove("posterUrl");
        CountDownLatch start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var publish=pool.submit(()->{ start.await(); try { service.publication(admin,id,MovieStatus.PUBLISHED); return true; } catch(InvalidMovieRequestException exception) { return false; } });
            var edit=pool.submit(()->{ start.await(); try { service.update(admin,id,AdminMovieRequest.parse(incomplete)); return true; } catch(InvalidMovieRequestException exception) { return false; } });
            start.countDown();
            assertThat(List.of(publish.get(10,TimeUnit.SECONDS),edit.get(10,TimeUnit.SECONDS))).contains(true,false);
            var persisted=service.detail(admin,id);
            assertThat(persisted.status().equals("PUBLISHED") && persisted.posterUrl()==null).isFalse();
        }
    }
    @Test void movieRowLockBlocksOtherWritesUntilCommit() throws Exception {
        var movie=create(" lock"); long id=Long.valueOf(movie.id());
        CountDownLatch locked=new CountDownLatch(1); CountDownLatch release=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var owner=pool.submit(()->new TransactionTemplate(transactions).execute(status->{ jdbc.queryForObject("SELECT id FROM movies WHERE id=? FOR UPDATE",Long.class,id); locked.countDown(); try { release.await(10,TimeUnit.SECONDS); } catch(InterruptedException exception) { throw new IllegalStateException(exception); } return true; }));
            assertThat(locked.await(5,TimeUnit.SECONDS)).isTrue();
            var writer=pool.submit(()->service.publication(admin,id,MovieStatus.PUBLISHED));
            try { assertThatThrownBy(()->writer.get(200,TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class); }
            finally { release.countDown(); }
            owner.get(5,TimeUnit.SECONDS); assertThat(writer.get(5,TimeUnit.SECONDS).status()).isEqualTo("PUBLISHED");
        }
    }
}

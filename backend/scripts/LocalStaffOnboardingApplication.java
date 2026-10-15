import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.net.*;
import java.net.http.*;
import java.util.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;
import com.smartcinema.SmartCinemaApplication;

/** Source-launched local test infrastructure; excluded from production application/build. */
public final class LocalStaffOnboardingApplication {
    private static final Path BASE = Path.of(".env.local-test");
    private static final Path CONFIG = Path.of(".env.local-test-onboarding");
    private static final String URL = "jdbc:postgresql://127.0.0.1:5432/smartcinema_phase4e_test?sslmode=disable&connectTimeout=5&socketTimeout=15";
    private static Properties read(Path path) throws IOException {
        var p = new Properties(); try (var in = Files.newBufferedReader(path, StandardCharsets.UTF_8)) { p.load(in); } return p;
    }
    private static void require(boolean condition) { if (!condition) throw new IllegalStateException("Local onboarding safeguard failed; details withheld."); }
    private static Properties configuration() throws Exception {
        var base = read(BASE); var p = read(CONFIG);
        require(p.keySet().equals(base.keySet()));
        for (String key : base.stringPropertyNames()) {
            String expected = key.equals("staff.invitations.delivery-enabled") ? "true" : key.equals("spring.profiles.active") ? "local-test,local-onboarding" : base.getProperty(key);
            require(expected.equals(p.getProperty(key)));
        }
        require(URL.equals(p.getProperty("spring.datasource.url")) && URL.equals(p.getProperty("spring.flyway.url")));
        require("smartcinema_phase4e_app".equals(p.getProperty("spring.datasource.username")) && "smartcinema_phase4e_migrator".equals(p.getProperty("spring.flyway.user")));
        require("".equals(p.getProperty("spring.config.import")) && "127.0.0.1".equals(p.getProperty("server.address")));
        require("false".equals(p.getProperty("seat-hold.cleanup-enabled")) && "false".equals(p.getProperty("vnpay.enabled")));
        require("".equals(p.getProperty("vnpay.system-db-url")));
        require("127.0.0.1".equals(p.getProperty("spring.mail.host")) && "1027".equals(p.getProperty("spring.mail.port")));
        require("".equals(p.getProperty("spring.mail.username")) && "".equals(p.getProperty("spring.mail.password")));
        require("false".equals(p.getProperty("spring.mail.properties.mail.smtp.auth")) && "true".equals(p.getProperty("staff.invitations.allow-local-smtp")));
        require("https://127.0.0.1:8443/staff/activate".equals(p.getProperty("staff.invitations.activation-base-url")));
        return p;
    }
    private static void verify(Properties p) throws Exception {
        var connectionProperties = new Properties();
        connectionProperties.setProperty("user", p.getProperty("spring.datasource.username"));
        connectionProperties.setProperty("password", p.getProperty("spring.datasource.password"));
        connectionProperties.setProperty("readOnly", "true"); connectionProperties.setProperty("readOnlyMode", "always");
        try (var db = DriverManager.getConnection(URL, connectionProperties)) {
            db.setReadOnly(true);
            try (var statement = db.createStatement(); var row = statement.executeQuery("SELECT current_database(),host(inet_server_addr()),inet_server_port(),current_user,current_setting('transaction_read_only')")) {
                require(row.next() && "smartcinema_phase4e_test".equals(row.getString(1)) && "127.0.0.1".equals(row.getString(2)) && row.getInt(3)==5432 && "smartcinema_phase4e_app".equals(row.getString(4)) && "on".equals(row.getString(5)));
            }
        }
        var client = HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(3)).build();
        var response = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:8027/readyz")).timeout(java.time.Duration.ofSeconds(3)).GET().build(), HttpResponse.BodyHandlers.discarding());
        require(response.statusCode()==200);
        try (var smtp = new Socket()) {
            smtp.connect(new InetSocketAddress("127.0.0.1",1027),3000); smtp.setSoTimeout(3000);
            String greeting = new BufferedReader(new InputStreamReader(smtp.getInputStream(), StandardCharsets.US_ASCII)).readLine();
            require(greeting!=null && greeting.startsWith("220") && greeting.toLowerCase(Locale.ROOT).contains("mailpit"));
        }
        System.out.println("ONBOARDING_VERIFIED: dedicated read-only JDBC; SMTP127.0.0.1:1027 Mailpit; HTTP8027 ready; provider/hold cleanup disabled.");
    }
    public static void main(String[] args) {
        try {
            require(args.length==1);
            if (args[0].equals("prepare")) {
                require(Files.exists(CONFIG) && Files.size(CONFIG)==0);
                var p=read(BASE); p.setProperty("staff.invitations.delivery-enabled","true"); p.setProperty("spring.profiles.active","local-test,local-onboarding");
                try(var out=Files.newBufferedWriter(CONFIG,StandardCharsets.UTF_8)) {p.store(out,"Private isolated onboarding capture profile");}
                configuration(); System.out.println("Private onboarding profile prepared; base configuration unchanged."); return;
            }
            var p=configuration(); verify(p);
            if(args[0].equals("verify")) return;
            require(args[0].equals("start"));
            System.setProperty("spring.devtools.restart.enabled","false");
            var app=new SpringApplication(SmartCinemaApplication.class, LocalScheduling.class);
            app.addInitializers(context -> {
                var environment=context.getEnvironment();
                require(Set.of(environment.getActiveProfiles()).equals(Set.of("local-test","local-onboarding")));
                for(String key:p.stringPropertyNames()) {
                    String expected=environment.resolveRequiredPlaceholders(p.getProperty(key));
                    if(!expected.equals(environment.getProperty(key))) throw new IllegalStateException("Local effective property mismatch: "+key+"; values withheld.");
                }
            });
            app.run();
        } catch(Exception failure) {
            System.err.println("BLOCKED: local onboarding configuration/service unavailable; credentials and exception details withheld.");
            System.exit(1);
        }
    }
    @Configuration(proxyBeanMethods=false)
    @Profile("local-onboarding")
    @EnableScheduling
    static class LocalScheduling { }
}

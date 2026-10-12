package com.smartcinema.staff;

import static org.assertj.core.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class StaffInvitationTests {
    private MockEnvironment configured() {
        return new MockEnvironment().withProperty("staff.invitations.active-key-id","test-key")
            .withProperty("staff.invitations.encryption-keys","test-key:"+Base64.getEncoder().encodeToString(new byte[32]))
            .withProperty("staff.invitations.activation-base-url","https://frontend.example.test/staff/activate");
    }
    private StaffInvitationCrypto crypto(MockEnvironment env) {return new StaffInvitationCrypto(new StaffInvitationSettings(env));}
    @Test void tokensHave256BitCanonicalEntropyAndDigestOnly() {
        var c=crypto(configured());var seen=new HashSet<String>();
        for(int i=0;i<100;i++){var t=c.token();assertThat(t.value().length()).isEqualTo(43);assertThat(Base64.getUrlDecoder().decode(t.value()).length).isEqualTo(32);assertThat(seen.add(t.value())).isTrue();assertThat(t.digest().length()).isEqualTo(64);assertThat(t.toString()).isEqualTo("Token[redacted]");}
    }
    @Test void encryptionPreservesTokenAndBindsAccountAndDigest() {
        var c=crypto(configured());var t=c.token();var e=c.encrypt(9007199254740993L,t);
        assertThat(e.ciphertext().length).isEqualTo(59);assertThat(e.nonce().length).isEqualTo(12);
        assertThat(c.decrypt(9007199254740993L,t.digest(),e.keyId(),e.nonce(),e.ciphertext()).equals(t.value())).isTrue();
        assertThatThrownBy(()->c.decrypt(1,t.digest(),e.keyId(),e.nonce(),e.ciphertext())).isInstanceOf(StaffFailure.class).hasMessage("Staff request unavailable");
    }
    @Test void authenticatedCipherTamperAndKeyRemovalFailClosed() {
        var env=configured();var c=crypto(env);var t=c.token();var e=c.encrypt(1,t);e.ciphertext()[0]^=1;
        assertThatThrownBy(()->c.decrypt(1,t.digest(),e.keyId(),e.nonce(),e.ciphertext())).isInstanceOf(StaffFailure.class);
        env.setProperty("staff.invitations.encryption-keys","replacement:"+Base64.getEncoder().encodeToString(new byte[32]));
        assertThatThrownBy(()->c.decrypt(1,t.digest(),e.keyId(),e.nonce(),e.ciphertext())).isInstanceOf(StaffFailure.class);
    }
    @Test void previousKeyCanDecryptAfterRotation() {
        var env=configured();var c=crypto(env);var t=c.token();var e=c.encrypt(1,t);
        env.setProperty("staff.invitations.encryption-keys",env.getProperty("staff.invitations.encryption-keys")+",next:"+Base64.getEncoder().encodeToString(new byte[32]));env.setProperty("staff.invitations.active-key-id","next");
        assertThat(c.decrypt(1,t.digest(),e.keyId(),e.nonce(),e.ciphertext()).equals(t.value())).isTrue();assertThat(c.encrypt(1,c.token()).keyId()).isEqualTo("next");
    }
    @Test void missingKeyAndUnsafeActivationUrlsAreNotFakeSuccess() {
        assertThatThrownBy(()->crypto(new MockEnvironment()).encrypt(1,crypto(configured()).token())).isInstanceOf(StaffFailure.class);
        for(String url:List.of("http://example.test/staff/activate","https://user@example.test/staff/activate","https://example.test/staff/activate?token=x","https://example.test/staff/activate#x")){
            var env=configured().withProperty("staff.invitations.activation-base-url",url);assertThatThrownBy(()->crypto(env).encrypt(1,crypto(configured()).token())).isInstanceOf(StaffFailure.class);
        }
    }
    @Test void strictJsonCanonicalIdsAndRedaction() {
        for(String json:List.of("{\"token\":\"a\",\"token\":\"b\"}","{\"token\":\"a\",\"password\":\"b\",\"role\":\"ADMIN\"}","[]")) assertThatThrownBy(()->StaffRequest.body(new StaffSensitiveBody(json),"token","password")).isInstanceOf(StaffFailure.class);
        for(String id:List.of("0","01","-1","9223372036854775808"))assertThatThrownBy(()->StaffRequest.id(id)).isInstanceOf(StaffFailure.class);
        assertThat(StaffRequest.id("9007199254740993")).isEqualTo(9007199254740993L);assertThat(new StaffSensitiveBody("sensitive").toString()).isEqualTo("StaffSensitiveBody[redacted]");
    }
    @Test void secureMailDefaultsRejectMissingCredentialsAndExternalCleartext() {
        var env=configured().withProperty("staff.invitations.from-address","sender@example.test").withProperty("spring.mail.host","smtp.gmail.com");
        assertThatThrownBy(()->new StaffInvitationSettings(env).requireMail()).isInstanceOf(StaffFailure.class);
        env.setProperty("spring.mail.username","fixture");env.setProperty("spring.mail.password","fixture");env.setProperty("spring.mail.properties.mail.smtp.starttls.required","false");
        assertThatThrownBy(()->new StaffInvitationSettings(env).requireMail()).isInstanceOf(StaffFailure.class);
        assertThat(new StaffInvitationSettings(env).enabled()).isFalse();
    }
    @Test void exponentialBackoffIsFiniteAndDoesNotChangeTokenLifetime() {
        var s=new StaffInvitationSettings(configured());assertThat(s.backoff(1).toSeconds()).isEqualTo(30);assertThat(s.backoff(2).toSeconds()).isEqualTo(60);assertThat(s.backoff(100).toSeconds()).isEqualTo(1800);
        assertThat(s.maxAttempts()).isEqualTo(5);assertThat("é".repeat(37).getBytes(StandardCharsets.UTF_8).length).isGreaterThan(72);
    }
}

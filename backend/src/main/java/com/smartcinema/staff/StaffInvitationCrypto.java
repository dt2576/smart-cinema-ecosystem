package com.smartcinema.staff;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public final class StaffInvitationCrypto {
    private final SecureRandom random = new SecureRandom();
    private final StaffInvitationSettings settings;
    public StaffInvitationCrypto(StaffInvitationSettings settings) { this.settings = settings; }
    public Token token() {
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); return new Token(token, digest(token));
    }
    public static String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (GeneralSecurityException failure) { throw new StaffFailure(503); }
    }
    public static String tokenDigest(String token) {
        try {
            if (token == null || !token.matches("[A-Za-z0-9_-]{43}") || !Base64.getUrlEncoder().withoutPadding().encodeToString(Base64.getUrlDecoder().decode(token)).equals(token)) throw new StaffFailure(400);
            return digest(token);
        } catch (RuntimeException failure) { throw new StaffFailure(400); }
    }
    public Encrypted encrypt(long user, Token token) {
        settings.activationBase(); String kid = settings.value("active-key-id", ""); byte[] key = key(kid);
        byte[] nonce = new byte[12]; random.nextBytes(nonce);
        return new Encrypted(kid, nonce, crypt(Cipher.ENCRYPT_MODE, key, nonce, aad(user, token.digest()), token.value().getBytes(StandardCharsets.UTF_8)));
    }
    public String decrypt(long user, String digest, String kid, byte[] nonce, byte[] ciphertext) {
        String token = new String(crypt(Cipher.DECRYPT_MODE, key(kid), nonce, aad(user, digest), ciphertext), StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(HexFormat.of().parseHex(tokenDigest(token)), HexFormat.of().parseHex(digest))) throw new StaffFailure(503);
        return token;
    }
    private byte[] aad(long user, String digest) { return (user + ":STAFF_PASSWORD_SETUP:" + digest).getBytes(StandardCharsets.UTF_8); }
    private byte[] key(String kid) {
        try {
            if (!kid.matches("[A-Za-z0-9_-]{1,32}")) throw new StaffFailure(503);
            var ring = new HashMap<String, byte[]>();
            for (String entry : settings.value("encryption-keys", "").split(",")) {
                String[] parts = entry.split(":", 2); if (parts.length != 2 || !parts[0].matches("[A-Za-z0-9_-]{1,32}")) throw new StaffFailure(503);
                byte[] key = Base64.getDecoder().decode(parts[1]); if (key.length != 32 || ring.put(parts[0], key) != null) throw new StaffFailure(503);
            }
            if (!ring.containsKey(kid)) throw new StaffFailure(503); return ring.get(kid);
        } catch (RuntimeException failure) { throw new StaffFailure(503); }
    }
    private byte[] crypt(int mode, byte[] key, byte[] nonce, byte[] aad, byte[] input) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(mode, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, nonce)); cipher.updateAAD(aad); return cipher.doFinal(input);
        } catch (GeneralSecurityException failure) { throw new StaffFailure(503); }
    }
    public record Token(String value, String digest) { @Override public String toString() { return "Token[redacted]"; } }
    public record Encrypted(String keyId, byte[] nonce, byte[] ciphertext) { @Override public String toString() { return "Encrypted[redacted]"; } }
}

package com.smartcinema.payment;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.util.MultiValueMap;

public final class VnpayProtocol {
    private VnpayProtocol() {}
    public static String amount(BigDecimal amount) {
        if (amount.signum() <= 0 || amount.stripTrailingZeros().scale() > 0) {
            throw new VnpayConflictException("Sandbox submission requires positive whole-VND amount.");
        }
        String wire = amount.multiply(BigDecimal.valueOf(100)).toBigIntegerExact().toString();
        if (wire.length() > 12) { throw new VnpayConflictException("Amount exceeds VNPAY wire format."); }
        return wire;
    }
    public static Map<String, String> singleValues(MultiValueMap<String, String> input) {
        if (input.size() > 40) { throw new IllegalArgumentException("Invalid provider fields"); }
        Map<String, String> values = new TreeMap<>();
        input.forEach((key, entries) -> {
            if (!key.matches("vnp_[A-Za-z]+") || entries.size() != 1 || entries.getFirst() == null
                    || entries.getFirst().length() > 512) { throw new IllegalArgumentException("Invalid provider fields"); }
            values.put(key, entries.getFirst());
        });
        return values;
    }
    public static String canonical(Map<String, String> values) {
        return new TreeMap<>(values).entrySet().stream()
                .filter(e -> !e.getKey().equals("vnp_SecureHash") && !e.getKey().equals("vnp_SecureHashType"))
                .filter(e -> e.getValue() != null && !e.getValue().isEmpty())
                .map(e -> encode(e.getKey()) + "=" + encode(e.getValue())).collect(Collectors.joining("&"));
    }
    private static String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
    public static String sign(String input, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return HexFormat.of().formatHex(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException exception) { throw new IllegalStateException("Signature unavailable"); }
    }
    public static boolean valid(String canonical, String signature, String secret) {
        if (signature == null || !signature.matches("[0-9a-fA-F]{128}")) { return false; }
        return MessageDigest.isEqual(HexFormat.of().parseHex(sign(canonical, secret)), HexFormat.of().parseHex(signature));
    }
    public static String digest(String canonical) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.GeneralSecurityException exception) { throw new IllegalStateException("Digest unavailable"); }
    }
    public static String queryRequest(Map<String, String> values) {
        return pipe(values, "vnp_RequestId", "vnp_Version", "vnp_Command", "vnp_TmnCode", "vnp_TxnRef",
                "vnp_TransactionDate", "vnp_CreateDate", "vnp_IpAddr", "vnp_OrderInfo");
    }
    public static String queryResponse(Map<String, String> values) {
        return pipe(values, "vnp_ResponseId", "vnp_Command", "vnp_ResponseCode", "vnp_Message", "vnp_TmnCode",
                "vnp_TxnRef", "vnp_Amount", "vnp_BankCode", "vnp_PayDate", "vnp_TransactionNo",
                "vnp_TransactionType", "vnp_TransactionStatus", "vnp_OrderInfo", "vnp_PromotionCode", "vnp_PromotionAmount");
    }
    private static String pipe(Map<String, String> values, String... keys) {
        return java.util.Arrays.stream(keys).map(k -> values.getOrDefault(k, "")).collect(Collectors.joining("|"));
    }
}

package com.smartcinema.payment;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.util.Map;
import java.util.TreeMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.util.LinkedMultiValueMap;

/** Local protocol fixtures only. These are not VNPAY Sandbox certification vectors. */
class VnpayProtocolTests {
    private static final String SECRET="local-only-fixture-secret";
    private MockEnvironment environment;
    private VnpaySystemRepository writer;
    private VnpayService service;
    @BeforeEach void setup() {
        environment=new MockEnvironment().withProperty("vnpay.enabled","true").withProperty("vnpay.merchant-code","TEST0001")
                .withProperty("vnpay.hash-secret",SECRET).withProperty("vnpay.signature-confirmed","true")
                .withProperty("vnpay.ipn-confirmed","true").withProperty("vnpay.success-confirmed","true")
                .withProperty("vnpay.query-confirmed","true").withProperty("vnpay.query-signature-confirmed","true");
        writer=mock(VnpaySystemRepository.class);
        when(writer.record(anyMap(),anyString(),anyString(),anyString())).thenReturn("00");
        service=new VnpayService(new VnpaySettings(environment),mock(VnpayRepository.class),writer);
    }
    private Map<String,String> fields() {
        return new TreeMap<>(Map.of("vnp_TmnCode","TEST0001","vnp_TxnRef","P"+"a".repeat(32),
                "vnp_Amount","1000000","vnp_ResponseCode","00","vnp_TransactionStatus","00","vnp_TransactionNo","1234"));
    }
    private LinkedMultiValueMap<String,String> signed(Map<String,String> values) {
        var result=new LinkedMultiValueMap<String,String>(); values.forEach(result::add);
        result.add("vnp_SecureHash",VnpayProtocol.sign(VnpayProtocol.canonical(values),SECRET)); return result;
    }
    @Test void exactAmountNeverRoundsDomainValue() {
        var amount=new BigDecimal("10000.0000");
        assertThat(VnpayProtocol.amount(amount)).isEqualTo("1000000");
        assertThat(amount.toPlainString()).isEqualTo("10000.0000");
        for(String invalid:new String[]{"0","-1","0.0001","10000.5000","10000.1234","10000000000"}) {
            assertThatThrownBy(()->VnpayProtocol.amount(new BigDecimal(invalid))).isInstanceOf(VnpayConflictException.class);
        }
    }
    @Test void canonicalEncodingSortsAndExcludesSignature() {
        assertThat(VnpayProtocol.canonical(Map.of("vnp_Z","a +%","vnp_A","x","vnp_Empty","","vnp_SecureHash","ignored")))
                .isEqualTo("vnp_A=x&vnp_Z=a+%2B%25");
    }
    @Test void signatureTamperingNeverInvokesWriter() {
        var input=signed(fields()); input.set("vnp_Amount","999");
        assertThat(service.ipn(input)).isEqualTo("97"); verifyNoInteractions(writer);
    }
    @Test void invalidChecksumFormatNeverInvokesWriter() {
        var input=signed(fields()); input.set("vnp_SecureHash","bogus");
        assertThat(service.ipn(input)).isEqualTo("97"); verifyNoInteractions(writer);
    }
    @Test void duplicateKeyIsRejectedBeforeVerification() {
        var input=signed(fields()); input.add("vnp_Amount","1000000");
        assertThatThrownBy(()->service.ipn(input)).isInstanceOf(IllegalArgumentException.class); verifyNoInteractions(writer);
    }
    @Test void normalSuccessRequiresBothCodes() {
        assertThat(service.ipn(signed(fields()))).isEqualTo("00");
        verify(writer).record(anyMap(),eq("IPN"),anyString(),eq("SUCCESS"));
    }
    @Test void oneSuccessCodeDoesNotMakeSuccess() {
        var values=fields(); values.put("vnp_TransactionStatus","07"); service.ipn(signed(values));
        verify(writer).record(anyMap(),eq("IPN"),anyString(),eq("RECONCILE"));
    }
    @Test void returnNeverSettlesEvenWithValidChecksum() {
        assertThat(service.validReturn(signed(fields()))).isTrue(); verifyNoInteractions(writer);
    }
    @Test void wrongMerchantCannotSettle() {
        var values=fields(); values.put("vnp_TmnCode","OTHER001");
        assertThat(service.ipn(signed(values))).isEqualTo("97"); verifyNoInteractions(writer);
    }
    @Test void absentConfirmationFailsClosed() {
        environment.setProperty("vnpay.success-confirmed","false");
        assertThatThrownBy(()->service.ipn(signed(fields()))).isInstanceOf(VnpayUnavailableException.class); verifyNoInteractions(writer);
    }
    @Test void explicitTerminalMappingOnly() {
        var values=fields(); values.put("vnp_ResponseCode","24"); values.put("vnp_TransactionStatus","02");
        service.ipn(signed(values)); verify(writer).record(anyMap(),eq("IPN"),anyString(),eq("RECONCILE"));
        reset(writer); environment.setProperty("vnpay.terminal-confirmed","true");
        environment.setProperty("vnpay.cancelled-pairs","IPN:24:02");
        service.ipn(signed(values)); verify(writer).record(anyMap(),eq("IPN"),anyString(),eq("CANCELLED"));
    }
    @Test void verifiedQueryUsesDistinctCanonicalForm() {
        var values=fields(); values.put("vnp_Command","querydr"); values.put("vnp_TransactionType","01");
        values.put("vnp_SecureHash",VnpayProtocol.sign(VnpayProtocol.queryResponse(values),SECRET));
        assertThat(service.acceptQuery(values)).isEqualTo("00");
        verify(writer).record(anyMap(),eq("QUERY"),anyString(),eq("SUCCESS"));
    }
    @Test void queryNotFoundDoesNotMeanFailed() {
        var values=fields(); values.put("vnp_ResponseCode","91");
        values.put("vnp_SecureHash",VnpayProtocol.sign(VnpayProtocol.queryResponse(values),SECRET));
        assertThat(service.acceptQuery(values)).isEqualTo("99"); verifyNoInteractions(writer);
    }
    @Test void pendingIsNotFailure() {
        var values=fields(); values.put("vnp_TransactionStatus","01"); service.ipn(signed(values));
        verify(writer).record(anyMap(),eq("IPN"),anyString(),eq("PENDING"));
    }
    @Test void sensitiveResponsesDoNotPrintUrlsOrQr() {
        assertThat(new VnpayRedirectResponse("1","2","PENDING","VNPAY","SANDBOX","VND","100",
            java.time.Instant.now(),"https://example.test/?vnp_SecureHash=sensitive").toString()).doesNotContain("sensitive","https");
        assertThat(new VnpayPaymentResponse("1","2","SUCCESS","100","PAID",false,"private-qr",java.util.List.of()).toString()).doesNotContain("private-qr");
    }
    @Test void submissionUsesPersistedBindingAndServerAmountOnly() {
        environment.withProperty("vnpay.amount-window-confirmed","true").withProperty("vnpay.return-url","https://example.test/return")
            .withProperty("vnpay.frontend-result-url","https://example.test/result").withProperty("vnpay.order-type","other")
            .withProperty("vnpay.minimum-amount","1").withProperty("vnpay.maximum-amount","1000000")
            .withProperty("vnpay.minimum-window-seconds","1").withProperty("vnpay.system-db-url","jdbc:postgresql://localhost/fixture")
            .withProperty("vnpay.system-db-username","fixture");
        var repository=mock(VnpayRepository.class);
        var now=java.time.Instant.parse("2026-09-30T00:00:00Z");
        var end=java.time.Instant.now().plusSeconds(300);
        var unbound=new VnpaySubmission("9007199254740993","2","INITIATED",new BigDecimal("10000.0000"),null,null,null,null,null,null,null,false);
        var bound=new VnpaySubmission("9007199254740993","2","PENDING",new BigDecimal("10000.0000"),"TEST0001","P"+"a".repeat(32),"1000000",now,end,"https://example.test/return","127.0.0.1",false);
        when(repository.owned(2,9007199254740993L,3)).thenReturn(unbound,bound);
        when(repository.orderType(9007199254740993L)).thenReturn("other");
        var response=new VnpayService(new VnpaySettings(environment),repository,writer).submit(2,9007199254740993L,3,"127.0.0.1");
        assertThat(response.redirectUrl()).startsWith(VnpayService.PAYMENT_URL).contains("vnp_Amount=1000000","vnp_CreateDate=20260930070000");
        assertThat(response.amount()).isEqualTo("10000.0000");
        verify(repository).bind(9007199254740993L,3,"TEST0001","https://example.test/return","127.0.0.1","other");
        verifyNoInteractions(writer);
    }
}

package com.smartcinema.payment;

import java.math.BigDecimal;
import java.sql.DriverManager;
import java.util.Map;
import org.springframework.stereotype.Repository;

/** Separate credential required: no fallback to the customer datasource or identity. */
@Repository
public class VnpaySystemRepository {
    private final VnpaySettings settings;
    public VnpaySystemRepository(VnpaySettings settings) { this.settings=settings; }
    public java.util.List<VnpaySubmission> claimQueries() {
        String url=settings.value("system-db-url", ""),username=settings.value("system-db-username", "");
        if(url.isBlank() || username.isBlank()) { throw new VnpayUnavailableException(); }
        var result=new java.util.ArrayList<VnpaySubmission>();
        try(var connection=DriverManager.getConnection(url,username,settings.value("system-db-password", ""))) {
            connection.setAutoCommit(false);
            try(var setup=connection.createStatement()) { setup.execute("SET LOCAL ROLE smart_cinema_payment_system"); }
            try(var statement=connection.prepareStatement("SELECT * FROM claim_vnpay_queries(?,CAST(? AS interval),CAST(? AS interval))")) {
                statement.setString(1,settings.merchant()); statement.setString(2,settings.value("query-delay","PT5M"));
                statement.setString(3,settings.value("query-horizon","PT24H"));
                try(var r=statement.executeQuery()) {
                    while(r.next()) { result.add(new VnpaySubmission(r.getString("id"),r.getString("booking_id"),r.getString("status"),
                        r.getBigDecimal("amount"),r.getString("merchant_code"),r.getString("merchant_reference"),r.getString("submitted_amount"),
                        r.getTimestamp("provider_created_at").toInstant(),r.getTimestamp("provider_expires_at").toInstant(),
                        r.getString("return_url"),r.getString("client_ip"),r.getBoolean("reconciliation_required"))); }
                }
                connection.commit();
            }
        } catch(java.sql.SQLException exception) { throw new VnpayUnavailableException(); }
        return result;
    }
    public String record(Map<String,String> fields,String source,String digest,String result) {
        String url=settings.value("system-db-url", "");
        String username=settings.value("system-db-username", "");
        if(url.isBlank() || username.isBlank()) { throw new VnpayUnavailableException(); }
        String external=fields.get("vnp_TransactionNo");
        if(external!=null && external.matches("0*")) { external=null; }
        try(var connection=DriverManager.getConnection(url,username,settings.value("system-db-password", ""))) {
            connection.setAutoCommit(false);
            try(var setup=connection.createStatement()) {
                setup.execute("SET LOCAL ROLE smart_cinema_payment_system");
                setup.execute("SET LOCAL lock_timeout='2s'"); setup.execute("SET LOCAL statement_timeout='5s'");
            }
            try(var statement=connection.prepareStatement("SELECT record_vnpay_result(?,?,?,?,?,?,?,?,?)")) {
                statement.setString(1,fields.get("vnp_TmnCode")); statement.setString(2,fields.get("vnp_TxnRef"));
                statement.setBigDecimal(3,new BigDecimal(fields.get("vnp_Amount"))); statement.setString(4,external);
                statement.setString(5,source); statement.setString(6,digest); statement.setString(7,result);
                statement.setString(8,fields.get("vnp_ResponseCode")); statement.setString(9,fields.get("vnp_TransactionStatus"));
                try(var rows=statement.executeQuery()) {
                    rows.next(); String code=rows.getString(1); connection.commit(); return code;
                }
            }
        } catch(java.sql.SQLException exception) { throw new VnpayUnavailableException(); }
    }
}

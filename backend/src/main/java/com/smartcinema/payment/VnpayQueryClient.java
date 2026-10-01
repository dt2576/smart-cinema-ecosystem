package com.smartcinema.payment;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.json.JsonMapper;

@Component
public class VnpayQueryClient {
    private final VnpaySettings settings;
    private final JsonMapper json=JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
    public VnpayQueryClient(VnpaySettings settings) { this.settings=settings; }
    public Map<String,String> query(VnpaySubmission binding) {
        settings.require("query"); settings.require("query-signature");
        if(!settings.merchant().equals(binding.merchant())) { throw new VnpayUnavailableException(); }
        Map<String,String> fields=new TreeMap<>();
        fields.put("vnp_RequestId",UUID.randomUUID().toString().replace("-",""));
        fields.put("vnp_Version","2.1.0"); fields.put("vnp_Command","querydr");
        fields.put("vnp_TmnCode",binding.merchant()); fields.put("vnp_TxnRef",binding.reference());
        fields.put("vnp_TransactionDate",VnpayService.DATE.format(binding.createdAt()));
        fields.put("vnp_CreateDate",VnpayService.DATE.format(Instant.now()));
        fields.put("vnp_IpAddr",settings.value("query-ip", "127.0.0.1"));
        fields.put("vnp_OrderInfo","Query " + binding.reference());
        fields.put("vnp_SecureHash",VnpayProtocol.sign(VnpayProtocol.queryRequest(fields),settings.secret()));
        try(var client=HttpClient.newBuilder().connectTimeout(Duration.parse(settings.value("connect-timeout","PT3S")))
                .followRedirects(HttpClient.Redirect.NEVER).build()) {
            var request=HttpRequest.newBuilder(URI.create("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"))
                    .timeout(settings.responseTimeout()).header("Content-Type","application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(fields))).build();
            var response=client.send(request,HttpResponse.BodyHandlers.ofInputStream());
            try(var body=response.body()) {
                byte[] bytes=body.readNBytes(16385);
                if(response.statusCode()!=200 || bytes.length>16384) { throw new VnpayUnavailableException(); }
                var tree=json.readTree(bytes); Map<String,String> values=new TreeMap<>();
                if(!tree.isObject() || tree.size()>40) { throw new VnpayUnavailableException(); }
                for(var entry:tree.properties()) {
                    if(!entry.getValue().isString() || entry.getValue().asString().length()>512) { throw new VnpayUnavailableException(); }
                    values.put(entry.getKey(),entry.getValue().asString());
                }
                // Bind the response to this query as well as matching a known submission.
                if(!binding.reference().equals(values.get("vnp_TxnRef")) || !binding.merchant().equals(values.get("vnp_TmnCode"))) {
                    throw new VnpayUnavailableException();
                }
                return values;
            }
        } catch(InterruptedException exception) { Thread.currentThread().interrupt(); throw new VnpayUnavailableException(); }
        catch(java.io.IOException exception) { throw new VnpayUnavailableException(); }
    }
}

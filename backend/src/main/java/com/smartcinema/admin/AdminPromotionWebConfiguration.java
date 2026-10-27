package com.smartcinema.admin;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.*;
import org.springframework.http.converter.*;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AdminPromotionWebConfiguration implements WebMvcConfigurer {
    @Override public void configureMessageConverters(HttpMessageConverters.ServerBuilder builder) {
        builder.addCustomConverter(new AbstractHttpMessageConverter<AdminPromotionBody>(MediaType.APPLICATION_JSON) {
            @Override protected boolean supports(Class<?> type) { return type==AdminPromotionBody.class; }
            @Override protected AdminPromotionBody readInternal(Class<? extends AdminPromotionBody> type,HttpInputMessage input) throws IOException {
                byte[] bytes=input.getBody().readNBytes(AdminPromotionRequest.MAX_BODY_BYTES+1);
                if(bytes.length>AdminPromotionRequest.MAX_BODY_BYTES) throw new AdminPromotionFailure(400);
                try { return new AdminPromotionBody(StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString()); }
                catch(CharacterCodingException failure) { throw new AdminPromotionFailure(400); }
            }
            @Override protected void writeInternal(AdminPromotionBody body,HttpOutputMessage output) { throw new AdminPromotionFailure(503); }
        });
    }
}

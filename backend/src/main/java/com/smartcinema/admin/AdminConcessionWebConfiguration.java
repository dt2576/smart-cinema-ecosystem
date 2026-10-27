package com.smartcinema.admin;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.*;
import org.springframework.http.converter.*;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AdminConcessionWebConfiguration implements WebMvcConfigurer {
    @Override public void configureMessageConverters(HttpMessageConverters.ServerBuilder builder) {
        builder.addCustomConverter(new AbstractHttpMessageConverter<AdminConcessionBody>(MediaType.APPLICATION_JSON) {
            @Override protected boolean supports(Class<?> type) { return type==AdminConcessionBody.class; }
            @Override protected AdminConcessionBody readInternal(Class<? extends AdminConcessionBody> type,HttpInputMessage input) throws IOException {
                byte[] bytes=input.getBody().readNBytes(AdminConcessionRequest.MAX_BODY_BYTES+1);
                if(bytes.length>AdminConcessionRequest.MAX_BODY_BYTES) throw new AdminConcessionFailure(400);
                try { return new AdminConcessionBody(StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString()); }
                catch(CharacterCodingException failure) { throw new AdminConcessionFailure(400); }
            }
            @Override protected void writeInternal(AdminConcessionBody body,HttpOutputMessage output) { throw new AdminConcessionFailure(503); }
        });
    }
}

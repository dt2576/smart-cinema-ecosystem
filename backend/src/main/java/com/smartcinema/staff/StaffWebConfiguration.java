package com.smartcinema.staff;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.*;
import org.springframework.http.converter.*;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaffWebConfiguration implements WebMvcConfigurer {
    @Override public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        converters.addFirst(new AbstractHttpMessageConverter<StaffSensitiveBody>(MediaType.APPLICATION_JSON) {
            @Override protected boolean supports(Class<?> type) { return type==StaffSensitiveBody.class; }
            @Override protected StaffSensitiveBody readInternal(Class<? extends StaffSensitiveBody> type,HttpInputMessage input) throws IOException {
                byte[] bytes=input.getBody().readNBytes(65537); if(bytes.length>65536) throw new StaffFailure(400);
                try { return new StaffSensitiveBody(StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString()); }
                catch(CharacterCodingException failure) { throw new StaffFailure(400); }
            }
            @Override protected void writeInternal(StaffSensitiveBody body,HttpOutputMessage output) { throw new StaffFailure(503); }
        });
    }
}

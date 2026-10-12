package com.smartcinema.staff;

import java.io.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Stream-bound sensitive bodies before binding; peer buckets commit independently. */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class StaffRequestFilter extends OncePerRequestFilter {
    private final StaffRateLimiter limiter;
    public StaffRequestFilter(StaffRateLimiter limiter) { this.limiter=limiter; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        String path=request.getRequestURI();
        return !(path.equals("/api/v1/staff/password-setups") || path.equals("/api/v1/admin/staff") || path.startsWith("/api/v1/admin/staff/"));
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        if (request.getMethod().equals("POST") && request.getRequestURI().equals("/api/v1/staff/password-setups")) {
            try {
                if (!limiter.allow("REDEMPTION",request.getRemoteAddr()==null?"unknown":request.getRemoteAddr())) { reject(response,429); return; }
            } catch (RuntimeException failure) { reject(response,503); return; }
        }
        if (!request.getMethod().equals("POST") && !request.getMethod().equals("PUT")) { chain.doFilter(request,response); return; }
        byte[] body=request.getInputStream().readNBytes(65537); if (body.length>65536) { reject(response,400); return; }
        chain.doFilter(new HttpServletRequestWrapper(request) {
            @Override public ServletInputStream getInputStream() {
                var input=new ByteArrayInputStream(body);
                return new ServletInputStream() {
                    @Override public int read() { return input.read(); }
                    @Override public boolean isFinished() { return input.available()==0; }
                    @Override public boolean isReady() { return true; }
                    @Override public void setReadListener(ReadListener listener) { throw new UnsupportedOperationException("Synchronous request only"); }
                };
            }
            @Override public BufferedReader getReader() { return new BufferedReader(new InputStreamReader(getInputStream(),java.nio.charset.StandardCharsets.UTF_8)); }
        },response);
    }
    private void reject(HttpServletResponse response,int status) throws IOException {
        response.setStatus(status); response.setHeader("Cache-Control","no-store"); response.setContentType("application/problem+json");
        if (status==429) response.setHeader("Retry-After","60");
        response.getWriter().write("{\"title\":\"Staff request unavailable\",\"status\":"+status+",\"detail\":\"Please check the request or try again later.\",\"instance\":\"/api/v1/staff\"}");
    }
}

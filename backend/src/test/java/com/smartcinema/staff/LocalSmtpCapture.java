package com.smartcinema.staff;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

/** Test-only Mailpit equivalent: binds loopback, captures MIME, never relays mail. */
final class LocalSmtpCapture implements AutoCloseable {
    private final ServerSocket server;
    private final List<byte[]> messages=new CopyOnWriteArrayList<>();
    LocalSmtpCapture() {
        try {
            server=new ServerSocket(0,10,InetAddress.getByName("127.0.0.1"));
            Thread thread=new Thread(this::listen,"test-local-smtp-capture"); thread.setDaemon(true); thread.start();
        } catch(IOException failure) { throw new IllegalStateException("Local SMTP capture unavailable"); }
    }
    int port() { return server.getLocalPort(); }
    int count() { return messages.size(); }
    MimeMessage last() throws Exception { return new MimeMessage(Session.getInstance(new java.util.Properties()),new ByteArrayInputStream(messages.getLast())); }
    private void listen() {
        while(!server.isClosed()) {
            try(Socket socket=server.accept()) {
                socket.setSoTimeout(10000); var in=new BufferedReader(new InputStreamReader(socket.getInputStream(),StandardCharsets.ISO_8859_1));
                var out=new PrintWriter(new OutputStreamWriter(socket.getOutputStream(),StandardCharsets.ISO_8859_1),true); out.print("220 local.test SMTP\r\n");out.flush();
                for(String line;(line=in.readLine())!=null;) {
                    String command=line.toUpperCase(java.util.Locale.ROOT);
                    if(command.startsWith("EHLO")) {out.print("250-local.test\r\n250-8BITMIME\r\n250 SIZE 1048576\r\n");out.flush();}
                    else if(command.equals("DATA")) {
                        out.print("354 Continue\r\n");out.flush();var bytes=new ByteArrayOutputStream();
                        while((line=in.readLine())!=null&&!line.equals(".")) {if(line.startsWith(".."))line=line.substring(1);bytes.write((line+"\r\n").getBytes(StandardCharsets.ISO_8859_1));}
                        messages.add(bytes.toByteArray());out.print("250 Accepted locally\r\n");out.flush();
                    } else if(command.equals("QUIT")) {out.print("221 Bye\r\n");out.flush();break;}
                    else {out.print("250 OK\r\n");out.flush();}
                }
            } catch(IOException failure) { if(!server.isClosed()) throw new IllegalStateException("Local SMTP capture failed"); }
        }
    }
    @Override public void close() throws IOException {server.close();}
}

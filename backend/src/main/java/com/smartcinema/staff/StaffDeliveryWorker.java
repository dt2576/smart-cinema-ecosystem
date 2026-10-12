package com.smartcinema.staff;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import jakarta.mail.internet.InternetAddress;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/** At-least-once transport, single-use token. No SMTP call inside a DB transaction. */
@Component
public class StaffDeliveryWorker {
    private final StaffRepository repository;
    private final StaffInvitationCrypto crypto;
    private final StaffInvitationSettings settings;
    private final ObjectProvider<JavaMailSender> senders;
    public StaffDeliveryWorker(StaffRepository repository,StaffInvitationCrypto crypto,StaffInvitationSettings settings,ObjectProvider<JavaMailSender> senders) {
        this.repository=repository; this.crypto=crypto; this.settings=settings; this.senders=senders;
    }
    @Scheduled(fixedDelayString="${staff.invitations.delivery-delay:PT10S}")
    public void scan() {
        if (!settings.enabled()) return;
        try { deliverOne(); }
        catch (RuntimeException failure) { LoggerFactory.getLogger(StaffDeliveryWorker.class).warn("Staff invitation delivery scan unavailable; durable recovery retained"); }
    }
    public boolean deliverOne() {
        var claimed=repository.claim(settings.maxAttempts(),settings.lease()); if (claimed.isEmpty()) return false;
        var delivery=claimed.get(); boolean sent=false;
        try {
            settings.requireMail(); JavaMailSender sender=senders.getIfAvailable(); if (sender==null) throw new StaffFailure(503);
            String token=crypto.decrypt(delivery.user(),delivery.digest(),delivery.keyId(),delivery.nonce(),delivery.ciphertext());
            String url=settings.activationBase()+"#token="+token;
            var message=sender.createMimeMessage(); message.getSession().setDebug(false);
            var helper=new MimeMessageHelper(message,true,StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(settings.sender(),settings.senderName(),StandardCharsets.UTF_8.name()));
            helper.setTo(delivery.email()); helper.setSubject("Smart Cinema — Lời mời kích hoạt tài khoản nhân viên");
            String expires=DateTimeFormatter.ISO_INSTANT.format(delivery.expiresAt());
            String intro="ADMIN đã tạo tài khoản nhân viên Smart Cinema cho bạn. Hãy tự thiết lập mật khẩu qua liên kết bên dưới. Sau khi thiết lập, tài khoản vẫn chờ ADMIN kích hoạt.";
            String notice="Liên kết chỉ dùng một lần, có hiệu lực đúng 24 giờ kể từ khi phát hành, đến "+expires+" (UTC). Nếu bạn không mong đợi lời mời này, hãy bỏ qua và báo cho quản trị viên Smart Cinema qua kênh liên hệ đã biết.";
            helper.setText("Xin chào "+delivery.fullName()+",\n\n"+intro+"\n\n"+url+"\n\n"+notice,
                    "<html lang=\"vi\"><body><h1>Smart Cinema</h1><p>Xin chào "+HtmlUtils.htmlEscape(delivery.fullName())+",</p><p>"+intro+"</p><p><a href=\""+HtmlUtils.htmlEscape(url)+"\">Thiết lập mật khẩu nhân viên</a></p><p>"+notice+"</p></body></html>");
            // Recheck just before transport. Revocation cannot recall an in-flight message;
            // redemption independently refuses superseded/expired/consumed tokens.
            if (!repository.deliverable(delivery.id(),delivery.lease())) throw new StaffFailure(503);
            sender.send(message); sent=true;
        } catch (Exception failure) {
            // Never log mail exception/messages/MIME/token or substitute a successful sender.
            LoggerFactory.getLogger(StaffDeliveryWorker.class).warn("Staff invitation transport failed; bounded durable retry scheduled");
        }
        repository.finish(delivery.id(),delivery.lease(),sent,settings.maxAttempts(),settings.backoff(delivery.attempts()));
        return sent;
    }
}

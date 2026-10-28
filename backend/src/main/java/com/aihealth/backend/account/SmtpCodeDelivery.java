package com.aihealth.backend.account;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;

@Component
@ConditionalOnProperty(name = "AUTH_EMAIL_MODE", havingValue = "smtp")
class SmtpCodeDelivery implements EmailCodeDelivery {
	private static final Logger log = LoggerFactory.getLogger(SmtpCodeDelivery.class);
	private final JavaMailSender sender;
	private final String from;

	SmtpCodeDelivery(JavaMailSender sender, @Value("${AUTH_MAIL_FROM:}") String from) {
		if (from.isBlank()) throw new IllegalArgumentException("AUTH_EMAIL_MODE=smtp requires AUTH_MAIL_FROM");
		this.sender = sender;
		this.from = from;
	}

	@Override
	public void checkRequest(HttpServletRequest request) {
		// A configured mail channel proves address access through a one-time code.
	}

	@Override
	public String deliver(String email, String code) {
		SimpleMailMessage message = new SimpleMailMessage();
		message.setFrom(from);
		message.setTo(email);
		message.setSubject("息刻邮箱验证码");
		message.setText("你的息刻验证码是 " + code + "。五分钟内有效，请勿转发。若非本人操作，请忽略此邮件。");
		try {
			sender.send(message);
		} catch (MailException exception) {
			log.warn("Verification mail delivery failed ({})", exception.getClass().getSimpleName());
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Verification mail unavailable");
		}
		return null;
	}

	@Override
	public boolean demo() {
		return false;
	}
}

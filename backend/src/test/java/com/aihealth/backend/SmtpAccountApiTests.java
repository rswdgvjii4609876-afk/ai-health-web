package com.aihealth.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
		"AUTH_EMAIL_MODE=smtp", "spring.mail.host=localhost", "AUTH_MAIL_FROM=no-reply@example.test" })
class SmtpAccountApiTests {
	@Autowired private WebApplicationContext context;
	@Autowired private JsonMapper mapper;
	@MockitoBean private JavaMailSender sender;
	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		reset(sender);
	}

	@Test
	void sendsCodeWithoutReturningItAndVerifiesTheMailbox() throws Exception {
		String email = "smtp-" + UUID.randomUUID() + "@example.test";
		mvc.perform(post("/api/account/code").contentType("application/json")
				.content(mapper.writeValueAsString(Map.of("email", email))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.demoCode").isEmpty());
		var message = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
		verify(sender).send(message.capture());
		assertThat(message.getValue().getTo()).containsExactly(email);
		assertThat(message.getValue().getFrom()).isEqualTo("no-reply@example.test");
		Matcher code = Pattern.compile("\\b\\d{6}\\b").matcher(message.getValue().getText());
		assertThat(code.find()).isTrue();
		mvc.perform(post("/api/account/verify").contentType("application/json")
				.content(mapper.writeValueAsString(Map.of("email", email, "code", code.group()))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.demoVerification").value(false));
	}

	@Test
	void failedDeliveryDoesNotStartCooldown() throws Exception {
		String email = "smtp-" + UUID.randomUUID() + "@example.test";
		String body = mapper.writeValueAsString(Map.of("email", email));
		doThrow(new MailSendException("unavailable")).when(sender).send(any(SimpleMailMessage.class));
		mvc.perform(post("/api/account/code").contentType("application/json").content(body))
				.andExpect(status().isServiceUnavailable());
		reset(sender);
		mvc.perform(post("/api/account/code").contentType("application/json").content(body))
				.andExpect(status().isOk());
	}
}

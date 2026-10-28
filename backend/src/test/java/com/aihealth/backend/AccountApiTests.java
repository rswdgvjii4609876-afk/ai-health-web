package com.aihealth.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import jakarta.servlet.http.Cookie;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest
class AccountApiTests {
	@Autowired
	private WebApplicationContext context;
	@Autowired
	private JdbcTemplate jdbc;
	@Autowired
	private JsonMapper mapper;
	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
	}

	private String email() {
		return "demo-" + UUID.randomUUID() + "@example.test";
	}

	private String codeFor(String email) throws Exception {
		String json = mvc.perform(post("/api/account/code").contentType(MediaType.APPLICATION_JSON)
				.content(mapper.writeValueAsString(java.util.Map.of("email", email))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.expiresInSeconds").value(300))
				.andReturn().getResponse().getContentAsString();
		return mapper.readTree(json).get("demoCode").asText();
	}

	private Cookie verify(String email, String code) throws Exception {
		return mvc.perform(post("/api/account/verify").contentType(MediaType.APPLICATION_JSON)
				.content(mapper.writeValueAsString(java.util.Map.of("email", email, "code", code))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.profileComplete").value(false))
				.andReturn().getResponse().getCookie("xike_session");
	}

	@Test
	void firstLoginRequiresProfileAndKeepsAccountDataSeparate() throws Exception {
		String email = email();
		Cookie session = verify(email, codeFor(email));
		assertThat(session).isNotNull();
		assertThat(session.isHttpOnly()).isTrue();
		mvc.perform(post("/api/account/code").contentType(MediaType.APPLICATION_JSON)
				.content(mapper.writeValueAsString(java.util.Map.of("email", email))))
				.andExpect(status().isTooManyRequests());
		mvc.perform(get("/api/account/me").cookie(session))
				.andExpect(jsonPath("$.email").value(email));
		mvc.perform(get("/api/dashboard").param("persona", "LEARNER").cookie(session))
				.andExpect(status().isForbidden());
		mvc.perform(put("/api/account/profile").cookie(session).contentType(MediaType.APPLICATION_JSON)
				.content("{\"ageBand\":\"AGE_18_24\",\"persona\":\"LEARNER\",\"healthTags\":[\"MOBILITY\"]}"))
				.andExpect(status().isBadRequest());
		mvc.perform(put("/api/account/profile").cookie(session).contentType(MediaType.APPLICATION_JSON)
				.content("{\"ageBand\":\"AGE_18_24\",\"persona\":\"LEARNER\",\"healthTags\":[\"MOBILITY\"],\"sensitiveConsent\":true}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.profileComplete").value(true))
				.andExpect(jsonPath("$.healthTags[0]").value("MOBILITY"));
		mvc.perform(get("/api/dashboard").param("persona", "LEARNER").cookie(session))
				.andExpect(jsonPath("$.history.length()").value(0))
				.andExpect(jsonPath("$.knowledge[0].id").value("fall"))
				.andExpect(jsonPath("$.review.focusId").value("fall"));
		mvc.perform(put("/api/account/profile").cookie(session).contentType(MediaType.APPLICATION_JSON)
				.content("{\"ageBand\":\"AGE_18_24\",\"persona\":\"LEARNER\",\"healthTags\":[],\"sensitiveConsent\":false}"))
				.andExpect(jsonPath("$.healthTags.length()").value(0));
		mvc.perform(put("/api/checkins/today").param("persona", "LEARNER").cookie(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":7.2,\"activityMinutes\":25,\"mood\":3}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/dashboard").param("persona", "LEARNER"))
				.andExpect(jsonPath("$.history.length()").value(7));
		assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM account_profile WHERE email = ?", Integer.class, email))
				.isEqualTo(1);
		mvc.perform(delete("/api/account").cookie(session)).andExpect(status().isOk());
		mvc.perform(get("/api/account/me").cookie(session)).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/dashboard").param("persona", "LEARNER").cookie(session))
				.andExpect(status().isUnauthorized());
		assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM account_profile WHERE email = ?", Integer.class, email))
				.isZero();
	}

	@Test
	void codeIsOneTimeAndFailuresAreLimited() throws Exception {
		String email = email();
		String code = codeFor(email);
		mvc.perform(post("/api/account/code").contentType(MediaType.APPLICATION_JSON)
				.content(mapper.writeValueAsString(java.util.Map.of("email", email))))
				.andExpect(status().isTooManyRequests());
		for (int attempt = 0; attempt < 4; attempt++) {
			mvc.perform(post("/api/account/verify").contentType(MediaType.APPLICATION_JSON)
				.content(mapper.writeValueAsString(java.util.Map.of("email", email, "code", "999999".equals(code) ? "000000" : "999999"))))
				.andExpect(status().isBadRequest());
		}
		mvc.perform(post("/api/account/verify").contentType(MediaType.APPLICATION_JSON)
				.content(mapper.writeValueAsString(java.util.Map.of("email", email, "code", "999999".equals(code) ? "000000" : "999999"))))
				.andExpect(status().isTooManyRequests());
		mvc.perform(post("/api/account/verify").contentType(MediaType.APPLICATION_JSON)
				.content(mapper.writeValueAsString(java.util.Map.of("email", email, "code", code))))
				.andExpect(status().isBadRequest());
	}

	@Test
	void localDemoCodeRejectsReverseProxyAndPublicHost() throws Exception {
		String body = mapper.writeValueAsString(java.util.Map.of("email", email()));
		mvc.perform(post("/api/account/code").contentType(MediaType.APPLICATION_JSON).content(body)
				.header("X-Forwarded-For", "203.0.113.9"))
				.andExpect(status().isForbidden());
		mvc.perform(post("/api/account/code").contentType(MediaType.APPLICATION_JSON).content(body)
				.header("Host", "health.example.test"))
				.andExpect(status().isForbidden());
	}
}

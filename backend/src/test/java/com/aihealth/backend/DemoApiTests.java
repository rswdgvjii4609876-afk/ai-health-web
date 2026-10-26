package com.aihealth.backend;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DemoApiTests {
	@Autowired
	private MockMvc mvc;

	@Autowired
	private JsonMapper mapper;

	@Test
	void dashboardAndAssistantExposeDemoEvidence() throws Exception {
		mvc.perform(get("/api/dashboard").param("persona", "STUDENT"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.history.length()").value(7))
				.andExpect(jsonPath("$.currentDay").isNotEmpty())
				.andExpect(jsonPath("$.knowledge[0].id").value("sleep"))
				.andExpect(jsonPath("$.review.daysRecorded").value(7))
				.andExpect(jsonPath("$.review.focusId").value("sleep"));

		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"question\":\"睡眠怎么安排\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.mock").value(true))
				.andExpect(jsonPath("$.sources[0].id").value("sleep"))
				.andExpect(jsonPath("$.followUps.length()").value(2))
				.andExpect(jsonPath("$.usedTodayRecord").value(true))
				.andExpect(jsonPath("$.suggestedAction").isNotEmpty());
	}

	@Test
	void checkinAndActionCanBeUpdatedWithoutChangingOtherPersona() throws Exception {
		String workerBefore = mvc.perform(get("/api/dashboard").param("persona", "WORKER"))
				.andReturn().getResponse().getContentAsString();

		mvc.perform(put("/api/checkins/today").param("persona", "STUDENT")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":7.5,\"activityMinutes\":41,\"mood\":4,\"note\":\"demo\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sleepHours").value(7.5));

		mvc.perform(get("/api/dashboard").param("persona", "STUDENT"))
				.andExpect(jsonPath("$.today.sleepHours").value(7.5));
		String workerAfter = mvc.perform(get("/api/dashboard").param("persona", "WORKER"))
				.andReturn().getResponse().getContentAsString();
		assertThat(workerAfter).isEqualTo(workerBefore);

		String response = mvc.perform(post("/api/actions").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"title\":\"demo action\"}"))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		JsonNode action = mapper.readTree(response);
		mvc.perform(patch("/api/actions/" + action.get("id").asText())
				.contentType(MediaType.APPLICATION_JSON).content("{\"completed\":true}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.completed").value(true));
		mvc.perform(delete("/api/actions/" + action.get("id").asText()))
				.andExpect(status().isOk());
		mvc.perform(delete("/api/actions/" + action.get("id").asText()))
				.andExpect(status().isNotFound());
	}

	@Test
	void invalidCheckinIsRejected() throws Exception {
		mvc.perform(put("/api/checkins/today").param("persona", "STUDENT")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":25,\"activityMinutes\":41,\"mood\":4}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void unknownQuestionDoesNotClaimUnrelatedEvidence() throws Exception {
		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"question\":\"天气怎么样\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sources.length()").value(0))
				.andExpect(jsonPath("$.usedTodayRecord").value(false))
				.andExpect(jsonPath("$.suggestedAction").isEmpty());
	}

	@Test
	void combinedQuestionReturnsTwoDistinctSources() throws Exception {
		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"question\":\"睡眠和活动怎么安排\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sources.length()").value(2))
				.andExpect(jsonPath("$.sources[0].id").value("sleep"))
				.andExpect(jsonPath("$.sources[1].id").value("activity"));
	}

	@Test
	void recentDayCanBeEditedButOlderDaysCannot() throws Exception {
		String response = mvc.perform(get("/api/dashboard").param("persona", "SENIOR"))
				.andReturn().getResponse().getContentAsString();
		String day = mapper.readTree(response).get("history").get(0).get("day").asText();
		mvc.perform(put("/api/checkins/" + day).param("persona", "SENIOR")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":7.8,\"activityMinutes\":39,\"mood\":4,\"note\":\"revised\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sleepHours").value(7.8));
		mvc.perform(get("/api/dashboard").param("persona", "SENIOR"))
				.andExpect(jsonPath("$.history[0].sleepHours").value(7.8));
		mvc.perform(put("/api/checkins/2000-01-01").param("persona", "SENIOR")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":7.8,\"activityMinutes\":39,\"mood\":4}"))
				.andExpect(status().isBadRequest());
	}
}

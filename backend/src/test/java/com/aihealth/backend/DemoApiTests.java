package com.aihealth.backend;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class DemoApiTests {
	@Autowired
	private WebApplicationContext context;

	private MockMvc mvc;

	@Autowired
	private JsonMapper mapper;

	@BeforeEach
	void setUp() {
		mvc = workspaceMvc(UUID.randomUUID().toString());
	}

	private MockMvc workspaceMvc(String token) {
		return MockMvcBuilders.webAppContextSetup(context)
				.defaultRequest(get("/").cookie(new Cookie("xike_demo", token))).build();
	}

	@Test
	void dashboardAndAssistantExposeDemoEvidence() throws Exception {
		mvc.perform(get("/api/dashboard").param("persona", "STUDENT"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.history.length()").value(7))
				.andExpect(jsonPath("$.currentDay").isNotEmpty())
				.andExpect(jsonPath("$.knowledge[0].id").value("sleep"))
				.andExpect(jsonPath("$.review.daysRecorded").value(7))
				.andExpect(jsonPath("$.review.focusId").value("sleep"))
				.andExpect(jsonPath("$.monthHistory.length()").value(7))
				.andExpect(jsonPath("$.monthReview.daysRecorded").value(7))
				.andExpect(jsonPath("$.monthReview.focusIds[0]").value("sleep"))
				.andExpect(jsonPath("$.monthReview.observation").value(org.hamcrest.Matchers.containsString("日均睡眠")));

		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"question\":\"睡眠怎么安排\",\"useRecords\":true}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.mock").value(true))
				.andExpect(jsonPath("$.sources[0].id").value("sleep"))
				.andExpect(jsonPath("$.followUps.length()").value(2))
				.andExpect(jsonPath("$.usedTodayRecord").value(true))
				.andExpect(jsonPath("$.recordObservation").isNotEmpty())
				.andExpect(jsonPath("$.suggestedAction").isNotEmpty())
				.andExpect(jsonPath("$.trace.status").value("RELATED"));
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
	void recordContextIsOptInAndFollowUpNeedsAValidTopic() throws Exception {
		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"question\":\"睡眠怎么安排\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.usedTodayRecord").value(false))
				.andExpect(jsonPath("$.recordObservation").isEmpty());

		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"question\":\"具体怎么开始？\"}"))
				.andExpect(jsonPath("$.sources.length()").value(0));

		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"question\":\"具体怎么开始？\",\"contextTopicId\":\"sleep\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sources[0].id").value("sleep"));

		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"question\":\"具体怎么开始？\",\"contextTopicId\":\"not-a-topic\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void emergencyTakesPriorityOverFollowUpContext() throws Exception {
		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"question\":\"有人胸痛，具体怎么做？\",\"contextTopicId\":\"sleep\",\"useRecords\":true}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sources[0].id").value("emergency"))
				.andExpect(jsonPath("$.usedTodayRecord").value(false))
				.andExpect(jsonPath("$.suggestedAction").isEmpty());
	}

	@Test
	void workspacesCannotReadOrChangeEachOthersRecords() throws Exception {
		MockMvc other = workspaceMvc(UUID.randomUUID().toString());
		mvc.perform(put("/api/checkins/today").param("persona", "STUDENT")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":9.1,\"activityMinutes\":41,\"mood\":4}"))
				.andExpect(status().isOk());
		other.perform(get("/api/dashboard").param("persona", "STUDENT"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.today.sleepHours").value(6.3));

		String created = mvc.perform(post("/api/actions").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"title\":\"private demo action\"}"))
				.andReturn().getResponse().getContentAsString();
		String id = mapper.readTree(created).get("id").asText();
		other.perform(patch("/api/actions/" + id).contentType(MediaType.APPLICATION_JSON)
				.content("{\"completed\":true}"))
				.andExpect(status().isNotFound());
		other.perform(delete("/api/actions/" + id)).andExpect(status().isNotFound());
	}

	@Test
	void workspaceCanBeClearedAndSeededAgain() throws Exception {
		mvc.perform(put("/api/checkins/today").param("persona", "WORKER")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":8.8,\"activityMinutes\":41,\"mood\":4}"))
				.andExpect(status().isOk());
		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"WORKER\",\"question\":\"久坐怎么活动\"}"))
				.andExpect(status().isOk());
		mvc.perform(delete("/api/workspace"))
				.andExpect(status().isOk())
				.andExpect(result -> assertThat(result.getResponse().getHeader("Set-Cookie")).contains("Max-Age=0"));
		mvc.perform(get("/api/dashboard").param("persona", "WORKER"))
				.andExpect(jsonPath("$.today.sleepHours").value(6.6));
		mvc.perform(get("/api/questions").param("persona", "WORKER"))
				.andExpect(jsonPath("$.length()").value(0));
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
	void anyDayInTheLastThirtyDaysCanBeRecorded() throws Exception {
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
		String oldestAllowed = LocalDate.now().minusDays(29).toString();
		mvc.perform(put("/api/checkins/" + oldestAllowed).param("persona", "SENIOR")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":7.1,\"activityMinutes\":25,\"mood\":3}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/dashboard").param("persona", "SENIOR"))
				.andExpect(jsonPath("$.monthHistory[0].day").value(oldestAllowed))
				.andExpect(jsonPath("$.monthReview.daysRecorded").value(8));
		mvc.perform(put("/api/checkins/" + LocalDate.now().minusDays(30)).param("persona", "SENIOR")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":7.1,\"activityMinutes\":25,\"mood\":3}"))
				.andExpect(status().isBadRequest());
		mvc.perform(put("/api/checkins/" + LocalDate.now().plusDays(1)).param("persona", "SENIOR")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":7.1,\"activityMinutes\":25,\"mood\":3}"))
				.andExpect(status().isBadRequest());
		mvc.perform(put("/api/checkins/2000-01-01").param("persona", "SENIOR")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepHours\":7.8,\"activityMinutes\":39,\"mood\":4}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void savedQuestionsAreScopedAndCanBeDeleted() throws Exception {
		MockMvc other = workspaceMvc(UUID.randomUUID().toString());
		mvc.perform(post("/api/assistant").contentType(MediaType.APPLICATION_JSON)
				.content("{\"persona\":\"STUDENT\",\"question\":\"睡眠怎么安排\"}"))
				.andExpect(status().isOk());
		String body = mvc.perform(get("/api/questions").param("persona", "STUDENT"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].question").value("睡眠怎么安排"))
				.andExpect(jsonPath("$[0].response.sources[0].id").value("sleep"))
				.andReturn().getResponse().getContentAsString();
		String id = mapper.readTree(body).get(0).get("id").asText();
		other.perform(get("/api/questions").param("persona", "STUDENT"))
				.andExpect(jsonPath("$.length()").value(0));
		mvc.perform(get("/api/questions").param("persona", "WORKER"))
				.andExpect(jsonPath("$.length()").value(0));
		other.perform(delete("/api/questions/" + id).param("persona", "STUDENT"))
				.andExpect(status().isNotFound());
		mvc.perform(delete("/api/questions/" + id).param("persona", "WORKER"))
				.andExpect(status().isNotFound());
		mvc.perform(delete("/api/questions/" + id).param("persona", "STUDENT"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/questions").param("persona", "STUDENT"))
				.andExpect(jsonPath("$.length()").value(0));
	}
}

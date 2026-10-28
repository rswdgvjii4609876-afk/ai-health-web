package com.aihealth.backend;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.aihealth.backend.ai.AiRequest;
import com.aihealth.backend.ai.AiResponse;
import com.aihealth.backend.ai.MockAiService;
import com.aihealth.backend.demo.DemoModels.Persona;
import com.aihealth.backend.demo.KnowledgeCatalog;

import tools.jackson.databind.json.JsonMapper;

class EvidenceEvaluationTests {
	private final MockAiService service = new MockAiService(new KnowledgeCatalog());

	private record Case(String question, String status, String firstSource) {
	}

	@Test
	void curatedQuestionsHaveExpectedEvidenceOrHonestRefusal() {
		List<Case> cases = List.of(
				new Case("熬夜后怎么安排睡眠？", "RELATED", "sleep"),
				new Case("久坐办公如何增加活动？", "RELATED", "activity"),
				new Case("持续焦虑可以向谁求助？", "RELATED", "mood"),
				new Case("老人如何减少跌倒风险？", "RELATED", "fall"),
				new Case("这条健康信息的来源可靠吗？", "RELATED", "literacy"),
				new Case("睡眠和活动怎么安排？", "RELATED", "sleep"),
				new Case("处方药可以自己加量吗？", "CLINICAL", "medicine"),
				new Case("有人胸痛和呼吸困难怎么办？", "URGENT", "emergency"),
				new Case("天气怎么样？", "NOT_FOUND", null),
				new Case("明天的股票价格是多少？", "NOT_FOUND", null));
		for (Case sample : cases) {
			AiResponse response = service.generate(new AiRequest(Persona.STUDENT, sample.question(), null, List.of()));
			assertThat(response.trace().status()).as(sample.question()).isEqualTo(sample.status());
			if (sample.firstSource() == null) {
				assertThat(response.sources()).as(sample.question()).isEmpty();
			} else {
				assertThat(response.sources().getFirst().id()).as(sample.question()).isEqualTo(sample.firstSource());
				assertThat(response.sources()).allSatisfy(source -> {
					assertThat(source.sourceLocator()).isNotBlank();
					assertThat(source.sourceUrl()).startsWith("https://www.nhc.gov.cn/");
				});
			}
		}
	}

	@Test
	void oldSavedAnswersWithoutTraceStillOpen() {
		String legacy = "{\"content\":\"旧回答\",\"sources\":[],\"suggestedAction\":null,"
				+ "\"followUps\":[],\"usedTodayRecord\":false,\"mock\":true,\"recordObservation\":null}";
		AiResponse response = new JsonMapper().readValue(legacy, AiResponse.class);
		assertThat(response.content()).isEqualTo("旧回答");
		assertThat(response.trace()).isNull();
	}

	@Test
	void olderSavedSourceWithoutLocatorStillOpens() {
		String legacy = "{\"content\":\"旧回答\",\"sources\":[{\"id\":\"sleep\",\"title\":\"睡眠\","
				+ "\"category\":\"睡眠\",\"summary\":\"摘要\",\"sourceName\":\"机构\","
				+ "\"sourceDate\":\"2025-03\",\"sourceUrl\":\"https://www.nhc.gov.cn/example\","
				+ "\"action\":null}],\"suggestedAction\":null,\"followUps\":[],"
				+ "\"usedTodayRecord\":false,\"mock\":true,\"recordObservation\":null}";
		AiResponse response = new JsonMapper().readValue(legacy, AiResponse.class);
		assertThat(response.sources().getFirst().sourceLocator()).isNull();
	}
}

package com.aihealth.backend;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.aihealth.backend.ai.AiRequest;
import com.aihealth.backend.ai.CompatibleAiService;
import com.aihealth.backend.ai.MockAiService;
import com.aihealth.backend.demo.DemoModels.Checkin;
import com.aihealth.backend.demo.DemoModels.Persona;
import com.aihealth.backend.demo.KnowledgeCatalog;
import com.sun.net.httpserver.HttpServer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CompatibleAiServiceTests {
	private HttpServer server;
	private final AtomicReference<String> requestBody = new AtomicReference<>();
	private final AtomicReference<String> authorization = new AtomicReference<>();
	private final AtomicReference<String> modelAnswer = new AtomicReference<>("从固定休息时间开始，逐步调整作息。[S1]");
	private final AtomicInteger calls = new AtomicInteger();

	@BeforeEach
	void startServer() throws Exception {
		server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/chat", exchange -> {
			calls.incrementAndGet();
			authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
			requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
			byte[] response = ("{\"choices\":[{\"message\":{\"content\":\"" + modelAnswer.get() + "\"}}]}")
					.getBytes(StandardCharsets.UTF_8);
			exchange.getResponseHeaders().set("Content-Type", "application/json");
			exchange.sendResponseHeaders(200, response.length);
			try (var output = exchange.getResponseBody()) {
				output.write(response);
			}
		});
		server.start();
	}

	@AfterEach
	void stopServer() {
		server.stop(0);
	}

	private CompatibleAiService service() {
		return new CompatibleAiService(new MockAiService(new KnowledgeCatalog()),
				"http://127.0.0.1:" + server.getAddress().getPort() + "/chat", "test-model", "test-key");
	}

	@Test
	void modelUsesOnlyMatchedEvidenceAndOptedInRecordSummary() {
		var response = service().generate(new AiRequest(Persona.STUDENT, "睡眠怎么安排？", null,
				List.of(new Checkin(LocalDate.now(), 7.1, 32, 3, ""))));
		assertThat(response.mock()).isFalse();
		assertThat(response.sources()).extracting("id").containsExactly("sleep");
		assertThat(response.recordObservation()).isNotBlank();
		assertThat(requestBody.get()).contains("规律作息与睡眠", "最近 1 天记录");
		assertThat(authorization.get()).isEqualTo("Bearer test-key");
		assertThat(response.content()).contains("[S1]");
		assertThat(response.trace().method()).contains("模型生成");
	}

	@Test
	void rejectsUnlistedOrMissingCitationAndFallsBackToGroundedMock() {
		modelAnswer.set("未经核对的说法。[S9]");
		var unlisted = service().generate(new AiRequest(Persona.STUDENT, "睡眠怎么安排？", null, List.of()));
		assertThat(unlisted.mock()).isTrue();
		modelAnswer.set("没有任何编号的回答。");
		var missing = service().generate(new AiRequest(Persona.STUDENT, "睡眠怎么安排？", null, List.of()));
		assertThat(missing.mock()).isTrue();
	}

	@Test
	void recordSummaryIsNotSentWithoutOptInAndUrgentQuestionBypassesProvider() {
		service().generate(new AiRequest(Persona.STUDENT, "睡眠怎么安排？", null, List.of()));
		assertThat(requestBody.get()).doesNotContain("用户授权的演示记录汇总");
		var urgent = service().generate(new AiRequest(Persona.STUDENT, "有人胸痛怎么办？", null, List.of()));
		assertThat(urgent.mock()).isTrue();
		assertThat(calls.get()).isEqualTo(1);
	}

	@Test
	void rejectsUnsafeOrIncompleteConfiguration() {
		var mock = new MockAiService(new KnowledgeCatalog());
		assertThatThrownBy(() -> new CompatibleAiService(mock, "http://example.com/chat", "test-model", "test-key"))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> new CompatibleAiService(mock, "https://example.com/chat", "", "test-key"))
				.isInstanceOf(IllegalArgumentException.class);
	}
}

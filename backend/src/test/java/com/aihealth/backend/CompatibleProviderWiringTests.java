package com.aihealth.backend;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.aihealth.backend.ai.AiService;
import com.aihealth.backend.ai.CompatibleAiService;
import com.aihealth.backend.demo.DemoController;

@SpringBootTest(properties = {
		"AI_PROVIDER=compatible",
		"AI_CHAT_URL=http://127.0.0.1:1/v1/chat/completions",
		"AI_MODEL=test-model",
		"AI_API_KEY=test-only-key"
})
class CompatibleProviderWiringTests {
	@Autowired
	private AiService aiService;

	@Autowired
	private DemoController controller;

	@Test
	void selectsCompatibleProvider() {
		assertThat(aiService).isInstanceOf(CompatibleAiService.class);
		assertThat(controller.health()).containsEntry("aiMode", "compatible");
	}
}

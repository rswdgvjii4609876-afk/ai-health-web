package com.aihealth.backend;

import com.aihealth.backend.ai.AiRequest;
import com.aihealth.backend.ai.AiService;
import com.aihealth.backend.demo.DemoModels.Persona;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class AiHealthBackendApplicationTests {
	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private AiService aiService;

	@Test
	void contextLoads() {
		assertThat(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).isEqualTo(1);
		assertThat(aiService.generate(new AiRequest(Persona.STUDENT, "睡眠", null)).mock()).isTrue();
	}

}

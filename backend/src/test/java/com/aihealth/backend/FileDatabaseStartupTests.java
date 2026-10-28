package com.aihealth.backend;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:file:./target/aihealth-schema-test;AUTO_SERVER=TRUE")
class FileDatabaseStartupTests {
	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void createsSchemaForFileBackedDatabase() {
		assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM checkin", Integer.class)).isZero();
		assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM action_item", Integer.class)).isZero();
		assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM assistant_turn", Integer.class)).isZero();
		assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM account_profile", Integer.class)).isZero();
		assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM account_session", Integer.class)).isZero();
	}
}

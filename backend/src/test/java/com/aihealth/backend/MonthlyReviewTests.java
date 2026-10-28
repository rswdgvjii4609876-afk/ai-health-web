package com.aihealth.backend;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.aihealth.backend.demo.DemoModels.Checkin;
import com.aihealth.backend.demo.DemoModels.Persona;
import com.aihealth.backend.demo.ReviewService;

class MonthlyReviewTests {
	private final ReviewService service = new ReviewService();

	@Test
	void sparseRecordsAreDescribedWithoutAHealthJudgment() {
		var review = service.summarizeMonth(Persona.WORKER,
				List.of(new Checkin(LocalDate.now(), 6.5, 20, 3, "")));
		assertThat(review.daysRecorded()).isEqualTo(1);
		assertThat(review.observation()).contains("数据还较少");
		assertThat(review.focusIds()).containsExactly("activity", "sleep");
	}

	@Test
	void repeatedLowMoodPrioritizesSupportInformationWithoutDiagnosis() {
		var review = service.summarizeMonth(Persona.STUDENT, List.of(
				new Checkin(LocalDate.now().minusDays(2), 7.5, 25, 2, ""),
				new Checkin(LocalDate.now().minusDays(1), 7.8, 30, 2, ""),
				new Checkin(LocalDate.now(), 7.7, 35, 4, "")));
		assertThat(review.focusIds()).containsExactly("mood", "sleep");
		assertThat(review.observation()).doesNotContain("诊断");
	}
}

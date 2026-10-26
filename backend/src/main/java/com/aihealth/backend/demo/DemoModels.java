package com.aihealth.backend.demo;

import java.time.LocalDate;
import java.util.List;

public final class DemoModels {
	private DemoModels() {
	}

	public enum Persona {
		STUDENT, WORKER, SENIOR
	}

	public record Checkin(LocalDate day, double sleepHours, int activityMinutes, int mood, String note) {
	}

	public record CheckinInput(double sleepHours, int activityMinutes, int mood, String note) {
	}

	public record ActionItem(String id, String title, boolean completed) {
	}

	public record ActionInput(Persona persona, String title) {
	}

	public record ActionUpdate(boolean completed) {
	}

	public record KnowledgeItem(String id, String title, String category, String summary,
			String sourceName, String sourceDate, String sourceUrl, String action) {
	}

	public record Dashboard(Persona persona, LocalDate currentDay, Checkin today, List<Checkin> history,
			List<ActionItem> actions, List<KnowledgeItem> knowledge, WeeklyReview review) {
	}

	public record WeeklyReview(int daysRecorded, double averageSleepHours, int averageActivityMinutes,
			double sleepChangeHours, int activityChangeMinutes, String focusId, String observation) {
	}

	public record AskInput(Persona persona, String question) {
	}
}

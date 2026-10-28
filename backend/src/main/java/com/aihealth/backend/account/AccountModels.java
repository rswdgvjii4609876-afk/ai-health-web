package com.aihealth.backend.account;

import java.util.List;

import com.aihealth.backend.demo.DemoModels.Persona;

public final class AccountModels {
	private AccountModels() {
	}

	public enum AgeBand {
		AGE_18_24, AGE_25_44, AGE_45_59, AGE_60_PLUS
	}

	public enum HealthTag {
		SLEEP, MOBILITY, CARDIOVASCULAR, METABOLIC
	}

	public record EmailInput(String email) {
	}

	public record CodeInput(String email, String code) {
	}

	public record ProfileInput(AgeBand ageBand, Persona persona, List<HealthTag> healthTags,
			Boolean sensitiveConsent) {
	}

	public record CodeResponse(String demoCode, int expiresInSeconds) {
	}

	public record AccountInfo(String email, AgeBand ageBand, Persona persona, List<HealthTag> healthTags,
			boolean profileComplete, boolean demoVerification) {
	}
}

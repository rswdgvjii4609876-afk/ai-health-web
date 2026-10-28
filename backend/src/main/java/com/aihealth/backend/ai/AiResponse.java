package com.aihealth.backend.ai;

import java.util.List;

import com.aihealth.backend.demo.DemoModels.KnowledgeItem;

public record AiResponse(String content, List<KnowledgeItem> sources, String suggestedAction,
		List<String> followUps, boolean usedTodayRecord, boolean mock, String recordObservation,
		EvidenceTrace trace) {
	public record EvidenceTrace(String status, String method, List<String> matchedTerms, String explanation) {
	}
}

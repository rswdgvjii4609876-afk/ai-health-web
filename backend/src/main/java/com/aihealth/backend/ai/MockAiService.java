package com.aihealth.backend.ai;

import org.springframework.stereotype.Service;

@Service
public class MockAiService implements AiService {
	@Override
	public AiResponse generate(AiRequest request) {
		return new AiResponse("AI service is not configured.", true);
	}
}

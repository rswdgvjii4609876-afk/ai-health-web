package com.aihealth.backend.ai;

import java.time.LocalDateTime;

public record SavedQuestion(String id, LocalDateTime askedAt, String question, AiResponse response) {
}

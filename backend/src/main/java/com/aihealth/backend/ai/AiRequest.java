package com.aihealth.backend.ai;

import com.aihealth.backend.demo.DemoModels.Checkin;
import com.aihealth.backend.demo.DemoModels.Persona;

import java.util.List;

public record AiRequest(Persona persona, String question, String contextTopicId, List<Checkin> recent) {
}

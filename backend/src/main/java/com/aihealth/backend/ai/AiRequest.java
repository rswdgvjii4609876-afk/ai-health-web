package com.aihealth.backend.ai;

import com.aihealth.backend.demo.DemoModels.Checkin;
import com.aihealth.backend.demo.DemoModels.Persona;

public record AiRequest(Persona persona, String question, Checkin latest) {
}

package com.aihealth.backend.ai;

import java.util.List;

import com.aihealth.backend.demo.DemoModels.KnowledgeItem;

public record AiResponse(String content, List<KnowledgeItem> sources, String suggestedAction, boolean mock) {
}

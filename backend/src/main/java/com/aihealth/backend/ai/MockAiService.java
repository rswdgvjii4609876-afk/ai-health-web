package com.aihealth.backend.ai;

import org.springframework.stereotype.Service;

import com.aihealth.backend.demo.DemoModels.KnowledgeItem;
import com.aihealth.backend.demo.KnowledgeCatalog;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MockAiService implements AiService {
	private final KnowledgeCatalog catalog;

	public MockAiService(KnowledgeCatalog catalog) {
		this.catalog = catalog;
	}

	@Override
	public AiResponse generate(AiRequest request) {
		String question = request.question();
		if (KnowledgeCatalog.containsAny(question, "胸痛", "呼吸困难", "昏迷", "意识不清", "自杀", "自伤")) {
			KnowledgeItem source = catalog.get("emergency");
			return new AiResponse("如果本人或身边的人正出现严重或紧急状况，请立即拨打 120 或就近急诊，不要等待在线回答。", List.of(source), null,
					List.of(), false, true);
		}

		List<KnowledgeItem> items = catalog.search(question, request.persona());
		if (items.isEmpty()) {
			return new AiResponse("目前的演示资料没有覆盖这个问题，我不能据此给出可靠回答。请尝试询问睡眠、日常活动、情绪、防跌倒或健康信息来源；涉及具体诊疗时请咨询专业人员。",
					List.of(), null, List.of("睡眠怎么安排？", "如何增加日常活动？"), false, true);
		}
		KnowledgeItem item = items.get(0);
		if ("medicine".equals(item.id())) {
			return new AiResponse("具体药物是否适合、如何调整剂量，需要医生或药师结合个人情况判断。" + item.summary(),
					List.of(item), null, List.of(), false, true);
		}

		String context = request.latest() == null ? "" : String.format(
				" 你今天记录了 %.1f 小时睡眠和 %d 分钟活动；单次记录不能用于判断健康状况。",
				request.latest().sleepHours(), request.latest().activityMinutes());
		String evidence = items.stream().map(source -> source.title() + "：" + source.summary())
				.collect(Collectors.joining(" "));
		String answer = "根据已整理的健康科普资料，" + evidence + context
				+ " 你可以选择一个适合自己的小行动。此处是演示回答，不代替专业医疗意见。";
		return new AiResponse(answer, items, item.action(), followUps(item.id()),
				request.latest() != null, true);
	}

	private List<String> followUps(String topic) {
		return switch (topic) {
			case "sleep" -> List.of("压力影响生活怎么办？", "久坐时怎样增加活动？");
			case "activity" -> List.of("睡眠怎么安排？", "如何核对健康信息来源？");
			case "mood" -> List.of("睡前习惯怎么调整？", "如何增加日常活动？");
			case "fall" -> List.of("日常活动要注意什么？", "用药应该向谁确认？");
			default -> List.of("睡眠怎么安排？", "如何核对健康信息来源？");
		};
	}
}

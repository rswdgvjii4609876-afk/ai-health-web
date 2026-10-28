package com.aihealth.backend.ai;

import org.springframework.stereotype.Service;

import com.aihealth.backend.demo.DemoModels.Checkin;
import com.aihealth.backend.demo.DemoModels.KnowledgeItem;
import com.aihealth.backend.demo.KnowledgeCatalog;
import com.aihealth.backend.ai.AiResponse.EvidenceTrace;
import com.aihealth.backend.demo.KnowledgeCatalog.EvidenceMatch;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
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
					List.of(), false, true, null, new EvidenceTrace("URGENT", "安全规则优先", List.of(),
							"紧急情况不使用模型推断；页面只能提供就医提示。"));
		}

		List<EvidenceMatch> matches = catalog.retrieve(question, request.persona());
		List<KnowledgeItem> items = matches.stream().map(EvidenceMatch::item).toList();
		boolean continued = items.isEmpty() && isFollowUp(question) && request.contextTopicId() != null
				&& !"emergency".equals(request.contextTopicId());
		if (continued) {
			items = List.of(catalog.get(request.contextTopicId()));
		}
		if (items.isEmpty()) {
			return new AiResponse("目前的演示资料没有覆盖这个问题，我不能据此给出可靠回答。请尝试询问睡眠、日常活动、情绪、防跌倒或健康信息来源；涉及具体诊疗时请咨询专业人员。",
					List.of(), null, List.of("睡眠怎么安排？", "如何增加日常活动？"), false, true, null,
					new EvidenceTrace("NOT_FOUND", "人工资料检索", List.of(), "没有命中当前收录的资料主题，因此没有生成事实性结论。"));
		}
		KnowledgeItem item = items.get(0);
		if ("medicine".equals(item.id())) {
			return new AiResponse("具体药物是否适合、如何调整剂量，需要医生或药师结合个人情况判断。" + item.summary(),
					List.of(item), null, List.of(), false, true, null,
					new EvidenceTrace("CLINICAL", "安全规则优先", List.of("用药话题"),
							"资料用于提示专业求助，不支持判断具体药物和剂量。"));
		}

		List<KnowledgeItem> answerItems = items;
		String answer = continued && item.action() != null
				? "可以从一件小事开始：" + item.action() + "。" + item.summary() + " [S1]"
				: java.util.stream.IntStream.range(0, answerItems.size())
						.mapToObj(index -> answerItems.get(index).summary() + " [S" + (index + 1) + "]")
						.collect(Collectors.joining(" "));
		boolean recordRelevant = List.of("sleep", "activity", "mood").contains(item.id());
		String recordObservation = recordRelevant ? summarizeRecords(request.recent()) : null;
		boolean usedTodayRecord = recordRelevant && request.recent().stream()
				.anyMatch(record -> record.day().equals(LocalDate.now()));
		return new AiResponse(answer, items, item.action(), followUps(item.id()),
				usedTodayRecord, true, recordObservation,
				new EvidenceTrace("RELATED", "人工资料关键词匹配",
						matches.stream().flatMap(match -> match.matchedTerms().stream()).distinct().toList(),
						continued ? "沿用上轮资料主题；相关摘要不能直接证明新问题中的所有说法。"
								: "找到相关资料摘要；匹配只说明主题相关，不能自动证明问题中的说法。"));
	}

	private boolean isFollowUp(String question) {
		return KnowledgeCatalog.containsAny(question, "具体怎么", "怎么开始", "再说说", "为什么", "第一步", "从哪里开始");
	}

	private String summarizeRecords(List<Checkin> recent) {
		if (recent.isEmpty()) return null;
		double sleep = recent.stream().mapToDouble(Checkin::sleepHours).average().orElse(0);
		int activity = (int) Math.round(recent.stream().mapToInt(Checkin::activityMinutes).average().orElse(0));
		return String.format(Locale.CHINA, "最近 %d 天记录：日均睡眠 %.1f 小时、日均活动 %d 分钟。仅是记录汇总，不代表健康判断。",
				recent.size(), sleep, activity);
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

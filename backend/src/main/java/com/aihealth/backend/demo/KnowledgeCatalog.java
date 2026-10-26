package com.aihealth.backend.demo;

import java.util.List;
import java.util.Map;
import java.util.Comparator;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.aihealth.backend.demo.DemoModels.KnowledgeItem;
import com.aihealth.backend.demo.DemoModels.Persona;

@Component
public class KnowledgeCatalog {
	private static final String HEALTH_LITERACY_URL =
			"https://www.nhc.gov.cn/xcs/c100123/202405/73a4927142f34152abed875634a3c13b.shtml";
	private static final List<KnowledgeItem> ITEMS = List.of(
			new KnowledgeItem("sleep", "规律作息与睡眠", "睡眠", "规律安排工作、学习和休息，留意睡眠环境与睡前习惯。",
					"国家卫生健康委员会", "2025-03", "https://www.nhc.gov.cn/guihuaxxs/c100133/202503/70d5836afe804a858b899ee951a24a13.shtml",
					"今晚为休息预留一段固定时间"),
			new KnowledgeItem("activity", "把活动放回日常", "活动", "科学健身贵在坚持，也可以从减少连续久坐、增加日常活动开始。",
					"国家卫生健康委员会", "2024-05", HEALTH_LITERACY_URL,
					"在日程里安排一次轻松活动"),
			new KnowledgeItem("mood", "留意心理感受", "心理", "重视心理健康；当压力或情绪问题持续影响生活时，主动寻求支持。",
					"国家卫生健康委员会", "2024-05", HEALTH_LITERACY_URL,
					"给自己留出一次放松或交流的时间"),
			new KnowledgeItem("fall", "老年人防跌倒", "安全", "了解跌倒风险，学习防跌常识，并留意可能增加跌倒风险的生活环境。",
					"国家卫生健康委员会", "2019-08", "https://www.nhc.gov.cn/lljks/c100158/201908/434ad204c8cd4972bb4c9eb42f748f43.shtml",
					"检查常走动的地方是否容易绊倒"),
			new KnowledgeItem("medicine", "合理用药", "就医", "用药应遵循医嘱，不自行调整处方或抗微生物药物。",
					"国家卫生健康委员会", "2024-05", HEALTH_LITERACY_URL, null),
			new KnowledgeItem("literacy", "识别可靠健康信息", "素养", "获取健康信息时，核对发布机构、发布时间与原始出处。",
					"国家卫生健康委员会", "2024-05", HEALTH_LITERACY_URL,
					"核对一条健康信息的原始来源"),
			new KnowledgeItem("emergency", "紧急医疗救助", "急救", "需要紧急医疗救助时，及时拨打 120 急救电话。",
					"国家卫生健康委员会", "2024-05", HEALTH_LITERACY_URL, null));
	private final Map<String, KnowledgeItem> byId = ITEMS.stream()
			.collect(Collectors.toUnmodifiableMap(KnowledgeItem::id, Function.identity()));
	private static final Map<String, List<String>> TERMS = Map.of(
			"sleep", List.of("睡", "熬夜", "作息", "失眠", "休息"),
			"activity", List.of("久坐", "运动", "活动", "锻炼", "走路"),
			"mood", List.of("焦虑", "压力", "情绪", "心情", "心理"),
			"fall", List.of("跌", "摔", "绊", "平衡"),
			"medicine", List.of("药", "处方", "抗生素"),
			"literacy", List.of("健康信息", "来源", "科普", "谣言"));

	public KnowledgeItem get(String id) {
		return byId.get(id);
	}

	public List<KnowledgeItem> forPersona(Persona persona) {
		List<String> order = switch (persona) {
			case STUDENT -> List.of("sleep", "mood", "activity", "literacy", "fall", "medicine", "emergency");
			case WORKER -> List.of("activity", "sleep", "mood", "literacy", "fall", "medicine", "emergency");
			case SENIOR -> List.of("fall", "activity", "sleep", "literacy", "mood", "medicine", "emergency");
		};
		return order.stream().map(this::get).toList();
	}

	public List<KnowledgeItem> search(String question, Persona persona) {
		if (containsAny(question, "药", "处方", "抗生素")) return List.of(get("medicine"));
		return forPersona(persona).stream()
				.filter(item -> TERMS.containsKey(item.id()))
				.map(item -> new Match(item, (int) TERMS.get(item.id()).stream()
						.filter(question::contains).count()))
				.filter(match -> match.score() > 0)
				.sorted(Comparator.comparingInt(Match::score).reversed())
				.limit(2)
				.map(Match::item)
				.toList();
	}

	private record Match(KnowledgeItem item, int score) { }

	public static boolean containsAny(String value, String... terms) {
		for (String term : terms) {
			if (value.contains(term)) return true;
		}
		return false;
	}
}

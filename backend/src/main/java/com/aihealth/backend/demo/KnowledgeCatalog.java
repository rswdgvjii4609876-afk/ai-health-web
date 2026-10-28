package com.aihealth.backend.demo;

import java.util.List;
import java.util.Map;
import java.util.Comparator;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.aihealth.backend.demo.DemoModels.KnowledgeItem;
import com.aihealth.backend.demo.DemoModels.Persona;
import com.aihealth.backend.account.AccountModels.AgeBand;
import com.aihealth.backend.account.AccountModels.HealthTag;

@Component
public class KnowledgeCatalog {
	private static final String HEALTH_LITERACY_URL =
			"https://www.nhc.gov.cn/xcs/c100123/202405/73a4927142f34152abed875634a3c13b.shtml";
	private static final List<KnowledgeItem> ITEMS = List.of(
			new KnowledgeItem("sleep", "规律作息与睡眠", "睡眠", "规律安排工作、学习和休息，留意睡眠环境与睡前习惯。",
					"国家卫生健康委员会", "2025-03", "睡眠健康核心信息·第4条", "https://www.nhc.gov.cn/guihuaxxs/c100133/202503/70d5836afe804a858b899ee951a24a13.shtml",
					"今晚为休息预留一段固定时间"),
			new KnowledgeItem("activity", "把活动放回日常", "活动", "科学健身贵在坚持，也可以从减少连续久坐、增加日常活动开始。",
					"国家卫生健康委员会", "2024-05", "健康素养66条·第32条", HEALTH_LITERACY_URL,
					"在日程里安排一次轻松活动"),
			new KnowledgeItem("mood", "留意心理感受", "心理", "重视心理健康；当压力或情绪问题持续影响生活时，主动寻求支持。",
					"国家卫生健康委员会", "2024-05", "健康素养66条·第36—37条", HEALTH_LITERACY_URL,
					"给自己留出一次放松或交流的时间"),
			new KnowledgeItem("fall", "老年人防跌倒", "安全", "了解跌倒风险，学习防跌常识，并留意可能增加跌倒风险的生活环境。",
					"国家卫生健康委员会", "2019-08", "老年失能预防核心信息·第5条", "https://www.nhc.gov.cn/lljks/c100158/201908/434ad204c8cd4972bb4c9eb42f748f43.shtml",
					"检查常走动的地方是否容易绊倒"),
			new KnowledgeItem("medicine", "合理用药", "就医", "用药应遵循医嘱，不自行调整处方或抗微生物药物。",
					"国家卫生健康委员会", "2024-05", "健康素养66条·第42—43条", HEALTH_LITERACY_URL, null),
			new KnowledgeItem("literacy", "识别可靠健康信息", "素养", "获取健康信息时，核对发布机构、发布时间与原始出处。",
					"国家卫生健康委员会", "2024-05", "健康素养66条·第53条", HEALTH_LITERACY_URL,
					"核对一条健康信息的原始来源"),
			new KnowledgeItem("emergency", "紧急医疗救助", "急救", "需要紧急医疗救助时，及时拨打 120 急救电话。",
					"国家卫生健康委员会", "2024-05", "健康素养66条·第58条", HEALTH_LITERACY_URL, null));
	private final Map<String, KnowledgeItem> byId = ITEMS.stream()
			.collect(Collectors.toUnmodifiableMap(KnowledgeItem::id, Function.identity()));
	private static final Map<String, List<String>> TERMS = Map.of(
			"sleep", List.of("睡眠", "睡", "熬夜", "作息", "失眠", "休息"),
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
			case LEARNER -> List.of("sleep", "activity", "mood", "literacy", "fall", "medicine", "emergency");
			case WORKER -> List.of("activity", "sleep", "mood", "literacy", "fall", "medicine", "emergency");
			case SENIOR -> List.of("fall", "activity", "sleep", "literacy", "mood", "medicine", "emergency");
		};
		return order.stream().map(this::get).toList();
	}

	public List<KnowledgeItem> forProfile(Persona persona, AgeBand ageBand, List<HealthTag> tags) {
		String focus = profileFocus(ageBand, tags);
		List<KnowledgeItem> base = forPersona(persona);
		if (focus == null) return base;
		return java.util.stream.Stream.concat(java.util.stream.Stream.of(get(focus)), base.stream())
				.distinct().toList();
	}

	public String profileFocus(AgeBand ageBand, List<HealthTag> tags) {
		if (tags.contains(HealthTag.SLEEP)) return "sleep";
		if (tags.contains(HealthTag.MOBILITY) || ageBand == AgeBand.AGE_60_PLUS) return "fall";
		if (tags.contains(HealthTag.CARDIOVASCULAR) || tags.contains(HealthTag.METABOLIC)) return "literacy";
		return null;
	}

	public List<KnowledgeItem> search(String question, Persona persona) {
		return retrieve(question, persona).stream().map(EvidenceMatch::item).toList();
	}

	public List<EvidenceMatch> retrieve(String question, Persona persona) {
		if (containsAny(question, "药", "处方", "抗生素")) {
			return List.of(new EvidenceMatch(get("medicine"), List.of("用药话题"), 1));
		}
		return forPersona(persona).stream()
				.filter(item -> TERMS.containsKey(item.id()))
				.map(item -> {
					List<String> terms = TERMS.get(item.id()).stream().filter(question::contains).toList();
					int score = terms.stream().mapToInt(term -> Math.max(1, term.length())).sum();
					return new EvidenceMatch(item, terms, score);
				})
				.filter(match -> match.score() > 0)
				.sorted(Comparator.comparingInt(EvidenceMatch::score).reversed())
				.limit(2)
				.toList();
	}

	public record EvidenceMatch(KnowledgeItem item, List<String> matchedTerms, int score) { }

	public static boolean containsAny(String value, String... terms) {
		for (String term : terms) {
			if (value.contains(term)) return true;
		}
		return false;
	}
}

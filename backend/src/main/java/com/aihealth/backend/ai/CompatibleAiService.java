package com.aihealth.backend.ai;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import tools.jackson.databind.JsonNode;

@Service
@Primary
@ConditionalOnProperty(name = "AI_PROVIDER", havingValue = "compatible")
public class CompatibleAiService implements AiService {
	private static final Logger log = LoggerFactory.getLogger(CompatibleAiService.class);
	private static final Pattern CITATION = Pattern.compile("\\[S([^\\]]+)\\]");
	private static final String SYSTEM_PROMPT = "你是健康素养学习助手。只能依据提供的参考摘要回答，使用简洁中文，不要添加摘要之外的事实。"
			+ "不得诊断、推荐药物或给出个体化治疗方案；证据不足时明确说不知道。最多三句话。"
			+ "每项事实后标注给定编号，如[S1]；不得引用未提供的编号。来源相关不等于能证明用户说法。";
	private final MockAiService fallback;
	private final RestClient client;
	private final URI chatUrl;
	private final String model;
	private final String apiKey;

	public CompatibleAiService(MockAiService fallback, @Value("${AI_CHAT_URL:}") String chatUrl,
			@Value("${AI_MODEL:}") String model, @Value("${AI_API_KEY:}") String apiKey) {
		this.fallback = fallback;
		this.model = model;
		this.apiKey = apiKey;
		if (chatUrl.isBlank() || model.isBlank() || apiKey.isBlank()) {
			throw new IllegalArgumentException("AI_PROVIDER=compatible requires AI_CHAT_URL, AI_MODEL and AI_API_KEY");
		}
		this.chatUrl = URI.create(chatUrl);
		if (!allowedEndpoint(this.chatUrl)) {
			throw new IllegalArgumentException("AI_PROVIDER=compatible requires AI_CHAT_URL, AI_MODEL and AI_API_KEY; endpoint must use HTTPS or loopback HTTP");
		}
		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(Duration.ofSeconds(5));
		factory.setReadTimeout(Duration.ofSeconds(12));
		this.client = RestClient.builder().requestFactory(factory).build();
	}

	@Override
	public AiResponse generate(AiRequest request) {
		AiResponse grounded = fallback.generate(request);
		if (grounded.sources().isEmpty() || grounded.sources().stream()
				.anyMatch(source -> List.of("emergency", "medicine").contains(source.id()))) {
			return grounded;
		}
		String evidence = IntStream.range(0, grounded.sources().size())
				.mapToObj(index -> {
					var source = grounded.sources().get(index);
					return "[S" + (index + 1) + "] " + source.title() + "：" + source.summary()
							+ "（" + source.sourceName() + "，" + source.sourceDate() + "，" + source.sourceLocator() + "）";
				})
				.reduce((first, next) -> first + "\n" + next).orElse("");
		String userPrompt = "问题：" + request.question() + "\n参考摘要：\n" + evidence
				+ (grounded.recordObservation() == null ? "" : "\n用户授权的演示记录汇总：" + grounded.recordObservation());
		Map<String, Object> body = Map.of("model", model, "messages", List.of(
				Map.of("role", "system", "content", SYSTEM_PROMPT),
				Map.of("role", "user", "content", userPrompt)));
		try {
			JsonNode result = client.post().uri(chatUrl).contentType(MediaType.APPLICATION_JSON)
					.header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey).body(body).retrieve().body(JsonNode.class);
			String content = result == null ? "" : result.path("choices").path(0).path("message").path("content").asText("").trim();
			if (content.isBlank() || content.length() > 600 || !validCitations(content, grounded.sources().size()))
				return grounded;
			return new AiResponse(content, grounded.sources(), grounded.suggestedAction(), grounded.followUps(),
					grounded.usedTodayRecord(), false, grounded.recordObservation(),
					new AiResponse.EvidenceTrace(grounded.trace().status(), "人工摘要检索 + 模型生成",
							grounded.trace().matchedTerms(), "已检查引用编号属于所列资料；尚未逐句核验事实。"));
		} catch (RestClientException exception) {
			log.warn("AI provider unavailable; using Mock response ({})", exception.getClass().getSimpleName());
			return grounded;
		}
	}

	private boolean validCitations(String content, int sourceCount) {
		Matcher matcher = CITATION.matcher(content);
		boolean found = false;
		while (matcher.find()) {
			int number;
			try {
				number = Integer.parseInt(matcher.group(1));
			} catch (NumberFormatException exception) {
				return false;
			}
			if (number < 1 || number > sourceCount) return false;
			found = true;
		}
		return found;
	}

	private boolean allowedEndpoint(URI uri) {
		String host = uri.getHost();
		return ("https".equalsIgnoreCase(uri.getScheme()) && host != null)
				|| ("http".equalsIgnoreCase(uri.getScheme())
					&& ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host)));
	}
}

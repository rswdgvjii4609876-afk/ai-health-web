package com.aihealth.backend.demo;

import java.util.List;
import java.util.ArrayList;

import org.springframework.stereotype.Service;

import com.aihealth.backend.demo.DemoModels.Checkin;
import com.aihealth.backend.demo.DemoModels.Persona;
import com.aihealth.backend.demo.DemoModels.WeeklyReview;
import com.aihealth.backend.demo.DemoModels.MonthlyReview;

@Service
public class ReviewService {
	public MonthlyReview summarizeMonth(Persona persona, List<Checkin> history) {
		if (history.isEmpty()) {
			String focus = defaultFocus(persona);
			return new MonthlyReview(0, 0, 0, 0, "近 30 天还没有记录。先记下一天，再逐渐观察日常节律。",
					List.of(focus, "activity".equals(focus) ? "sleep" : "activity"));
		}
		double averageSleep = history.stream().mapToDouble(Checkin::sleepHours).average().orElse(0);
		int averageActivity = (int) Math.round(history.stream().mapToInt(Checkin::activityMinutes).average().orElse(0));
		double averageMood = history.stream().mapToInt(Checkin::mood).average().orElse(0);
		List<String> focusIds = new ArrayList<>();
		if (history.size() >= 3 && averageSleep < 7) focusIds.add("sleep");
		if (history.size() >= 3 && history.stream().filter(day -> day.mood() <= 2).count() >= 2) focusIds.add("mood");
		for (String id : List.of(defaultFocus(persona), "activity", "sleep", "literacy")) {
			if (!focusIds.contains(id)) focusIds.add(id);
			if (focusIds.size() >= 2) break;
		}
		String observation = history.size() < 7
				? String.format("近 30 天记录了 %d 天；数据还较少，先继续记录，不宜据此判断健康状态。", history.size())
				: String.format("近 30 天记录了 %d 天。以下是自填数据的描述性汇总，不代表医学评估。", history.size());
		if (history.size() >= 7) {
			String firstFocus = focusIds.get(0);
			observation += switch (firstFocus) {
				case "sleep" -> String.format("本次日均睡眠 %.1f 小时，可先核对作息与睡眠资料。", averageSleep);
				case "mood" -> "有多天心情选择较低，可先阅读心理健康与求助资料。";
				case "activity" -> String.format("本次日均记录活动 %d 分钟，时长不代表运动强度。", averageActivity);
				default -> "可先查看与当前画像相关的日常安全资料。";
			};
		}
		return new MonthlyReview(history.size(), roundOne(averageSleep), averageActivity, roundOne(averageMood),
				observation, focusIds.subList(0, 2));
	}

	public WeeklyReview summarize(Persona persona, List<Checkin> history) {
		if (history.isEmpty()) {
			return new WeeklyReview(0, 0, 0, 0, 0, defaultFocus(persona), "还没有记录。完成今天的记录后，这里会呈现变化。");
		}

		double averageSleep = history.stream().mapToDouble(Checkin::sleepHours).average().orElse(0);
		int averageActivity = (int) Math.round(history.stream().mapToInt(Checkin::activityMinutes).average().orElse(0));
		int period = Math.min(3, history.size() / 2);
		double sleepChange = 0;
		int activityChange = 0;
		if (period > 0) {
			List<Checkin> first = history.subList(0, period);
			List<Checkin> last = history.subList(history.size() - period, history.size());
			sleepChange = roundOne(last.stream().mapToDouble(Checkin::sleepHours).average().orElse(0)
					- first.stream().mapToDouble(Checkin::sleepHours).average().orElse(0));
			activityChange = (int) Math.round(last.stream().mapToInt(Checkin::activityMinutes).average().orElse(0)
					- first.stream().mapToInt(Checkin::activityMinutes).average().orElse(0));
		}

		String focus = sleepChange <= -0.5 ? "sleep"
				: activityChange <= -10 ? "activity" : defaultFocus(persona);
		String observation = period == 0 ? "记录天数还不足以对比前后变化。"
				: String.format("最近 %d 天与最早 %d 天相比：平均睡眠 %s 小时，平均活动 %s 分钟。",
					period, period, signed(sleepChange), signed(activityChange));
		return new WeeklyReview(history.size(), roundOne(averageSleep), averageActivity,
				sleepChange, activityChange, focus, observation);
	}

	private String defaultFocus(Persona persona) {
		return switch (persona) {
			case STUDENT -> "sleep";
			case LEARNER -> "sleep";
			case WORKER -> "activity";
			case SENIOR -> "fall";
		};
	}

	private double roundOne(double value) {
		return Math.round(value * 10) / 10.0;
	}

	private String signed(double value) {
		return (value > 0 ? "+" : "") + (value == (int) value ? Integer.toString((int) value) : Double.toString(value));
	}
}

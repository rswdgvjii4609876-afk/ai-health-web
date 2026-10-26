package com.aihealth.backend.demo;

import java.util.List;

import org.springframework.stereotype.Service;

import com.aihealth.backend.demo.DemoModels.Checkin;
import com.aihealth.backend.demo.DemoModels.Persona;
import com.aihealth.backend.demo.DemoModels.WeeklyReview;

@Service
public class ReviewService {
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

package com.aihealth.backend.demo;

import java.time.LocalDate;

import org.springframework.stereotype.Component;

import com.aihealth.backend.demo.DemoModels.Persona;

@Component
public class DemoDataInitializer {
	private final DemoRepository repository;

	public DemoDataInitializer(DemoRepository repository) {
		this.repository = repository;
	}

	public synchronized void ensureSeeded(String workspace) {
		seed(workspace, Persona.STUDENT, new double[] {7.2, 6.8, 7.4, 6.5, 6.1, 6.8, 6.3},
				new int[] {48, 35, 57, 30, 25, 44, 32}, new int[] {4, 3, 4, 3, 2, 3, 3},
				"复习任务较多，睡前仍在看屏幕", "今晚为休息预留一段固定时间");
		seed(workspace, Persona.LEARNER, new double[] {7.3, 7.0, 7.1, 6.9, 7.2, 7.4, 7.0},
				new int[] {36, 42, 31, 38, 45, 40, 34}, new int[] {4, 4, 3, 3, 4, 4, 3},
				"今天安排了学习和休息", "为学习安排一段固定休息时间");
		seed(workspace, Persona.WORKER, new double[] {7.4, 7.1, 6.8, 6.5, 7.2, 6.9, 6.6},
				new int[] {36, 42, 28, 31, 48, 38, 30}, new int[] {4, 4, 3, 3, 4, 3, 3},
				"今天会议较多，坐着的时间偏长", "午后安排一次短时间活动");
		seed(workspace, Persona.SENIOR, new double[] {7.0, 6.8, 7.2, 7.1, 6.9, 7.3, 7.0},
				new int[] {28, 35, 30, 38, 32, 34, 31}, new int[] {4, 4, 4, 3, 4, 4, 4},
				"今天在家中活动", "检查常走动的地方是否容易绊倒");
	}

	private void seed(String workspace, Persona persona, double[] sleep, int[] activity, int[] mood,
			String todayNote, String action) {
		if (repository.hasCheckins(workspace, persona)) return;
		LocalDate today = LocalDate.now();
		for (int i = 0; i < sleep.length; i++) {
			repository.seedCheckin(workspace, persona, today.minusDays(sleep.length - i - 1), sleep[i], activity[i], mood[i],
					i == sleep.length - 1 ? todayNote : "");
		}
		repository.addAction(workspace, persona, action);
	}
}

package com.aihealth.backend.demo;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.aihealth.backend.ai.AiRequest;
import com.aihealth.backend.ai.AiResponse;
import com.aihealth.backend.ai.AiService;
import com.aihealth.backend.demo.DemoModels.ActionInput;
import com.aihealth.backend.demo.DemoModels.ActionItem;
import com.aihealth.backend.demo.DemoModels.ActionUpdate;
import com.aihealth.backend.demo.DemoModels.AskInput;
import com.aihealth.backend.demo.DemoModels.Checkin;
import com.aihealth.backend.demo.DemoModels.CheckinInput;
import com.aihealth.backend.demo.DemoModels.Dashboard;
import com.aihealth.backend.demo.DemoModels.Persona;

@RestController
@RequestMapping("/api")
public class DemoController {
	private final DemoRepository repository;
	private final KnowledgeCatalog catalog;
	private final AiService aiService;

	public DemoController(DemoRepository repository, KnowledgeCatalog catalog, AiService aiService) {
		this.repository = repository;
		this.catalog = catalog;
		this.aiService = aiService;
	}

	@GetMapping("/health")
	public Map<String, String> health() {
		return Map.of("status", "ok", "aiMode", "mock");
	}

	@GetMapping("/dashboard")
	public Dashboard dashboard(@RequestParam(defaultValue = "STUDENT") Persona persona) {
		return new Dashboard(persona, repository.today(persona), repository.history(persona),
				repository.actions(persona), catalog.forPersona(persona));
	}

	@PutMapping("/checkins/today")
	public Checkin saveCheckin(@RequestParam Persona persona, @RequestBody CheckinInput input) {
		if (input == null || !Double.isFinite(input.sleepHours()) || input.sleepHours() < 0
				|| input.sleepHours() > 24 || input.activityMinutes() < 0 || input.activityMinutes() > 1440
				|| input.mood() < 1 || input.mood() > 5 || (input.note() != null && input.note().length() > 240)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid check-in values");
		}
		return repository.saveCheckin(persona, input);
	}

	@PostMapping("/assistant")
	public AiResponse ask(@RequestBody AskInput input) {
		if (input == null || input.persona() == null || input.question() == null
				|| input.question().isBlank() || input.question().length() > 400) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid question");
		}
		return aiService.generate(new AiRequest(input.persona(), input.question().trim(),
				repository.today(input.persona())));
	}

	@PostMapping("/actions")
	public ActionItem addAction(@RequestBody ActionInput input) {
		if (input == null || input.persona() == null || input.title() == null
				|| input.title().isBlank() || input.title().length() > 100) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid action");
		}
		return repository.addAction(input.persona(), input.title().trim());
	}

	@PatchMapping("/actions/{id}")
	public ActionItem updateAction(@PathVariable String id, @RequestBody ActionUpdate input) {
		if (input == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid action update");
		ActionItem updated = repository.setActionCompleted(id, input.completed());
		if (updated == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Action not found");
		return updated;
	}
}

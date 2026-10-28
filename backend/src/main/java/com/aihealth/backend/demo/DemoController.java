package com.aihealth.backend.demo;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import com.aihealth.backend.ai.SavedQuestion;
import com.aihealth.backend.account.AccountService;
import com.aihealth.backend.demo.DemoModels.ActionInput;
import com.aihealth.backend.demo.DemoModels.ActionItem;
import com.aihealth.backend.demo.DemoModels.ActionUpdate;
import com.aihealth.backend.demo.DemoModels.AskInput;
import com.aihealth.backend.demo.DemoModels.Checkin;
import com.aihealth.backend.demo.DemoModels.CheckinInput;
import com.aihealth.backend.demo.DemoModels.Dashboard;
import com.aihealth.backend.demo.DemoModels.Persona;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api")
public class DemoController {
	private final DemoRepository repository;
	private final KnowledgeCatalog catalog;
	private final AiService aiService;
	private final ReviewService reviewService;
	private final DemoWorkspace demoWorkspace;
	private final DemoDataInitializer initializer;
	private final AccountService accounts;
	private final String aiMode;

	public DemoController(DemoRepository repository, KnowledgeCatalog catalog, AiService aiService,
			ReviewService reviewService, DemoWorkspace demoWorkspace, DemoDataInitializer initializer,
			AccountService accounts, @Value("${AI_PROVIDER:mock}") String aiMode) {
		this.repository = repository;
		this.catalog = catalog;
		this.aiService = aiService;
		this.reviewService = reviewService;
		this.demoWorkspace = demoWorkspace;
		this.initializer = initializer;
		this.accounts = accounts;
		this.aiMode = aiMode;
	}

	@GetMapping("/health")
	public Map<String, String> health() {
		return Map.of("status", "ok", "aiMode", aiMode, "emailMode", accounts.emailMode());
	}

	@GetMapping("/dashboard")
	public Dashboard dashboard(@RequestParam(defaultValue = "STUDENT") Persona persona,
			HttpServletRequest request, HttpServletResponse response) {
		String workspace = workspace(request, response);
		var history = repository.history(workspace, persona);
		var monthHistory = repository.history(workspace, persona, 30);
		var account = accounts.current(request);
		var knowledge = account == null ? catalog.forPersona(persona)
				: catalog.forProfile(persona, account.ageBand(), account.healthTags());
		var review = reviewService.summarize(persona, history);
		if (account != null && account.profileComplete()) {
			String focus = catalog.profileFocus(account.ageBand(), account.healthTags());
			if (focus != null) review = new com.aihealth.backend.demo.DemoModels.WeeklyReview(
					review.daysRecorded(), review.averageSleepHours(), review.averageActivityMinutes(),
					review.sleepChangeHours(), review.activityChangeMinutes(), focus, review.observation());
		}
		return new Dashboard(persona, LocalDate.now(), repository.today(workspace, persona), history,
				monthHistory, repository.actions(workspace, persona), knowledge,
				review, reviewService.summarizeMonth(persona, monthHistory));
	}

	@PutMapping("/checkins/today")
	public Checkin saveCheckin(@RequestParam Persona persona, @RequestBody CheckinInput input,
			HttpServletRequest request, HttpServletResponse response) {
		validateCheckin(input);
		return repository.saveCheckin(workspace(request, response), persona, input);
	}

	@PutMapping("/checkins/{day}")
	public Checkin saveCheckinForDay(@RequestParam Persona persona, @PathVariable LocalDate day,
			@RequestBody CheckinInput input, HttpServletRequest request, HttpServletResponse response) {
		LocalDate today = LocalDate.now();
		if (day.isAfter(today) || day.isBefore(today.minusDays(29))) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Day outside thirty-day window");
		}
		validateCheckin(input);
		return repository.saveCheckin(workspace(request, response), persona, day, input);
	}

	private void validateCheckin(CheckinInput input) {
		if (input == null || !Double.isFinite(input.sleepHours()) || input.sleepHours() < 0
				|| input.sleepHours() > 24 || input.activityMinutes() < 0 || input.activityMinutes() > 1440
				|| input.mood() < 1 || input.mood() > 5 || (input.note() != null && input.note().length() > 240)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid check-in values");
		}
	}

	@PostMapping("/assistant")
	public AiResponse ask(@RequestBody AskInput input, HttpServletRequest request, HttpServletResponse response) {
		if (input == null || input.persona() == null || input.question() == null
				|| input.question().isBlank() || input.question().length() > 400
				|| (input.contextTopicId() != null && catalog.get(input.contextTopicId()) == null)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid question");
		}
		String workspace = workspace(request, response);
		String question = input.question().trim();
		AiResponse answer = aiService.generate(new AiRequest(input.persona(), question, input.contextTopicId(),
				Boolean.TRUE.equals(input.useRecords()) ? repository.history(workspace, input.persona()) : List.of()));
		repository.saveQuestion(workspace, input.persona(), question, answer);
		return answer;
	}

	@GetMapping("/questions")
	public List<SavedQuestion> questions(@RequestParam Persona persona,
			HttpServletRequest request, HttpServletResponse response) {
		return repository.questions(workspace(request, response), persona);
	}

	@DeleteMapping("/questions/{id}")
	public void deleteQuestion(@PathVariable String id, @RequestParam Persona persona,
			HttpServletRequest request, HttpServletResponse response) {
		if (!repository.deleteQuestion(workspace(request, response), persona, id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found");
		}
	}

	@PostMapping("/actions")
	public ActionItem addAction(@RequestBody ActionInput input, HttpServletRequest request, HttpServletResponse response) {
		if (input == null || input.persona() == null || input.title() == null
				|| input.title().isBlank() || input.title().length() > 100) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid action");
		}
		return repository.addAction(workspace(request, response), input.persona(), input.title().trim());
	}

	@PatchMapping("/actions/{id}")
	public ActionItem updateAction(@PathVariable String id, @RequestBody ActionUpdate input,
			HttpServletRequest request, HttpServletResponse response) {
		if (input == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid action update");
		ActionItem updated = repository.setActionCompleted(workspace(request, response), id, input.completed());
		if (updated == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Action not found");
		return updated;
	}

	@DeleteMapping("/actions/{id}")
	public void deleteAction(@PathVariable String id, HttpServletRequest request, HttpServletResponse response) {
		if (!repository.deleteAction(workspace(request, response), id))
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Action not found");
	}

	@DeleteMapping("/workspace")
	public void deleteWorkspace(HttpServletRequest request, HttpServletResponse response) {
		repository.deleteWorkspace(demoWorkspace.resolve(request, response).id());
		demoWorkspace.clear(request, response);
	}

	private String workspace(HttpServletRequest request, HttpServletResponse response) {
		var workspace = demoWorkspace.resolve(request, response);
		if (!workspace.account()) initializer.ensureSeeded(workspace.id());
		return workspace.id();
	}
}

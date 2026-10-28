package com.aihealth.backend.account;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aihealth.backend.account.AccountModels.AccountInfo;
import com.aihealth.backend.account.AccountModels.CodeInput;
import com.aihealth.backend.account.AccountModels.CodeResponse;
import com.aihealth.backend.account.AccountModels.EmailInput;
import com.aihealth.backend.account.AccountModels.ProfileInput;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/account")
public class AccountController {
	private final AccountService service;

	public AccountController(AccountService service) {
		this.service = service;
	}

	@GetMapping("/me")
	public AccountInfo me(HttpServletRequest request, HttpServletResponse response) {
		noStore(response);
		service.clearExpiredSession(request, response);
		return service.info(service.requireAccount(request));
	}

	@PostMapping("/code")
	public CodeResponse requestCode(@RequestBody EmailInput input, HttpServletRequest request,
			HttpServletResponse response) {
		noStore(response);
		return service.requestCode(input == null ? null : input.email(), request);
	}

	@PostMapping("/verify")
	public AccountInfo verify(@RequestBody CodeInput input, HttpServletRequest request, HttpServletResponse response) {
		noStore(response);
		return service.info(service.verify(input == null ? null : input.email(), input == null ? null : input.code(),
				request, response));
	}

	@PutMapping("/profile")
	public AccountInfo saveProfile(@RequestBody ProfileInput input, HttpServletRequest request,
			HttpServletResponse response) {
		noStore(response);
		return service.info(service.saveProfile(request, input));
	}

	@PostMapping("/logout")
	public void logout(HttpServletRequest request, HttpServletResponse response) {
		noStore(response);
		service.logout(request, response);
	}

	@DeleteMapping
	public void deleteAccount(HttpServletRequest request, HttpServletResponse response) {
		noStore(response);
		service.deleteAccount(request, response);
	}

	private void noStore(HttpServletResponse response) {
		response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
	}
}

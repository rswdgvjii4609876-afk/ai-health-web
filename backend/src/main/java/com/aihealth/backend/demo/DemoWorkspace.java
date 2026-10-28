package com.aihealth.backend.demo;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import com.aihealth.backend.account.AccountService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class DemoWorkspace {
	private static final String COOKIE_NAME = "xike_demo";
	private final AccountService accounts;

	public DemoWorkspace(AccountService accounts) {
		this.accounts = accounts;
	}

	public record Workspace(String id, boolean account) {
	}

	public Workspace resolve(HttpServletRequest request, HttpServletResponse response) {
		response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
		var account = accounts.current(request);
		if (account != null) {
			if (!account.profileComplete()) {
				throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Complete account profile first");
			}
			return new Workspace(account.workspaceId(), true);
		}
		if (accounts.hasSessionCookie(request)) {
			accounts.clearExpiredSession(request, response);
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account session expired");
		}
		String token = null;
		if (request.getCookies() != null) {
			for (Cookie cookie : request.getCookies()) {
				if (COOKIE_NAME.equals(cookie.getName()) && valid(cookie.getValue())) {
					token = cookie.getValue();
					break;
				}
			}
		}
		if (token == null) {
			token = UUID.randomUUID().toString();
			response.addHeader(HttpHeaders.SET_COOKIE, cookie(token, request.isSecure(), Duration.ofDays(30)));
		}
		return new Workspace(hash(token), false);
	}

	public void clear(HttpServletRequest request, HttpServletResponse response) {
		response.addHeader(HttpHeaders.SET_COOKIE, cookie("", request.isSecure(), Duration.ZERO));
	}

	private boolean valid(String value) {
		try {
			return UUID.fromString(value).toString().equals(value);
		} catch (IllegalArgumentException exception) {
			return false;
		}
	}

	private String cookie(String token, boolean secure, Duration maxAge) {
		return ResponseCookie.from(COOKIE_NAME, token).httpOnly(true).sameSite("Lax")
				.secure(secure).path("/api").maxAge(maxAge).build().toString();
	}

	private String hash(String token) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 unavailable", exception);
		}
	}
}

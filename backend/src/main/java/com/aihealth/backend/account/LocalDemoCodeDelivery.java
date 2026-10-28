package com.aihealth.backend.account;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;

@Component
@ConditionalOnProperty(name = "AUTH_EMAIL_MODE", havingValue = "local", matchIfMissing = true)
class LocalDemoCodeDelivery implements EmailCodeDelivery {
	private final String serverAddress;

	LocalDemoCodeDelivery(@Value("${server.address:127.0.0.1}") String serverAddress) {
		this.serverAddress = serverAddress;
	}

	@Override
	public void checkRequest(HttpServletRequest request) {
		boolean localServer = List.of("127.0.0.1", "localhost", "::1").contains(serverAddress);
		boolean localClient = List.of("127.0.0.1", "0:0:0:0:0:0:0:1", "::1").contains(request.getRemoteAddr());
		boolean localHost = List.of("127.0.0.1", "localhost", "::1").contains(request.getServerName());
		boolean proxied = List.of("Forwarded", "X-Forwarded-For", "X-Real-IP", "X-Forwarded-Host")
				.stream().anyMatch(header -> request.getHeader(header) != null);
		if (!localServer || !localClient || !localHost || proxied) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Demo verification is local-only");
		}
	}

	@Override
	public String deliver(String email, String code) {
		return code;
	}

	@Override
	public boolean demo() {
		return true;
	}
}

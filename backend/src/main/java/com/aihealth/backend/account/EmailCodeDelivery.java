package com.aihealth.backend.account;

import jakarta.servlet.http.HttpServletRequest;

interface EmailCodeDelivery {
	void checkRequest(HttpServletRequest request);

	String deliver(String email, String code);

	boolean demo();
}

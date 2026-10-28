package com.aihealth.backend.account;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.aihealth.backend.account.AccountModels.AccountInfo;
import com.aihealth.backend.account.AccountModels.AgeBand;
import com.aihealth.backend.account.AccountModels.CodeResponse;
import com.aihealth.backend.account.AccountModels.HealthTag;
import com.aihealth.backend.account.AccountModels.ProfileInput;
import com.aihealth.backend.demo.DemoModels.Persona;
import com.aihealth.backend.demo.DemoRepository;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Service
public class AccountService {
	private static final String SESSION_COOKIE = "xike_session";
	private static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$");
	private static final Duration CODE_LIFETIME = Duration.ofMinutes(5);
	private static final Duration CODE_COOLDOWN = Duration.ofSeconds(60);
	private static final Duration SESSION_LIFETIME = Duration.ofDays(7);
	private final JdbcTemplate jdbc;
	private final DemoRepository demoRepository;
	private final SecureRandom random = new SecureRandom();
	private final Map<String, Challenge> challenges = new ConcurrentHashMap<>();
	private final Map<String, Instant> nextCodeAt = new ConcurrentHashMap<>();
	private final EmailCodeDelivery delivery;

	public AccountService(JdbcTemplate jdbc, DemoRepository demoRepository, EmailCodeDelivery delivery) {
		this.jdbc = jdbc;
		this.demoRepository = demoRepository;
		this.delivery = delivery;
	}

	public record Account(String id, String email, String workspaceId, AgeBand ageBand, Persona persona,
			List<HealthTag> healthTags, boolean profileComplete) {
	}

	private record Challenge(byte[] salt, byte[] digest, Instant expiresAt, int failures) {
	}

	public synchronized CodeResponse requestCode(String rawEmail, HttpServletRequest request) {
		delivery.checkRequest(request);
		String email = normalizeEmail(rawEmail);
		Instant now = Instant.now();
		challenges.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
		nextCodeAt.entrySet().removeIf(entry -> entry.getValue().isBefore(now));
		Challenge previous = challenges.get(email);
		if (nextCodeAt.containsKey(email) && now.isBefore(nextCodeAt.get(email))) {
			throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Wait before requesting another code");
		}
		String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
		byte[] salt = randomBytes(16);
		int failures = previous == null ? 0 : previous.failures();
		String demoCode = delivery.deliver(email, code);
		challenges.put(email, new Challenge(salt, digest(salt, code), now.plus(CODE_LIFETIME), failures));
		nextCodeAt.put(email, now.plus(CODE_COOLDOWN));
		return new CodeResponse(demoCode, (int) CODE_LIFETIME.toSeconds());
	}

	@Transactional
	public synchronized Account verify(String rawEmail, String code, HttpServletRequest request,
			HttpServletResponse response) {
		delivery.checkRequest(request);
		String email = normalizeEmail(rawEmail);
		if (code == null || !code.matches("\\d{6}")) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification code");
		}
		Challenge challenge = challenges.get(email);
		if (challenge == null || Instant.now().isAfter(challenge.expiresAt())) {
			challenges.remove(email);
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code expired or unavailable");
		}
		if (!MessageDigest.isEqual(challenge.digest(), digest(challenge.salt(), code))) {
			if (challenge.failures() >= 4) {
				challenges.remove(email);
				throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts");
			}
			challenges.put(email, new Challenge(challenge.salt(), challenge.digest(), challenge.expiresAt(),
					challenge.failures() + 1));
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification code");
		}
		challenges.remove(email);
		Account account = findByEmail(email);
		if (account == null) {
			String id = UUID.randomUUID().toString();
			try {
				jdbc.update("INSERT INTO account_profile (id, email, workspace_id) VALUES (?, ?, ?)",
						id, email, HexFormat.of().formatHex(randomBytes(32)));
			} catch (DuplicateKeyException exception) {
				// A concurrent verification may have created the account first.
			}
			account = findByEmail(email);
		}
		if (account == null) throw new IllegalStateException("Account creation failed");
		String oldToken = sessionToken(request);
		if (oldToken != null) jdbc.update("DELETE FROM account_session WHERE token_hash = ?", sha256(oldToken));
		String token = HexFormat.of().formatHex(randomBytes(32));
		jdbc.update("INSERT INTO account_session (token_hash, account_id, expires_at) VALUES (?, ?, ?)",
				sha256(token), account.id(), Timestamp.valueOf(LocalDateTime.now().plus(SESSION_LIFETIME)));
		response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie(token, request.isSecure(), SESSION_LIFETIME));
		return account;
	}

	public Account current(HttpServletRequest request) {
		String token = sessionToken(request);
		if (token == null) return null;
		List<Account> matches = jdbc.query("SELECT a.id, a.email, a.workspace_id, a.age_band, a.persona, a.profile_complete "
				+ "FROM account_session s JOIN account_profile a ON a.id = s.account_id "
				+ "WHERE s.token_hash = ? AND s.expires_at > ?",
				(rs, row) -> mapAccount(rs), sha256(token), Timestamp.valueOf(LocalDateTime.now()));
		return matches.isEmpty() ? null : matches.get(0);
	}

	public boolean hasSessionCookie(HttpServletRequest request) {
		if (request.getCookies() == null) return false;
		for (Cookie cookie : request.getCookies()) {
			if (SESSION_COOKIE.equals(cookie.getName())) return true;
		}
		return false;
	}

	public void clearExpiredSession(HttpServletRequest request, HttpServletResponse response) {
		if (hasSessionCookie(request) && current(request) == null) clearSessionCookie(request, response);
	}

	public Account requireAccount(HttpServletRequest request) {
		Account account = current(request);
		if (account == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
		return account;
	}

	@Transactional
	public Account saveProfile(HttpServletRequest request, ProfileInput input) {
		Account account = requireAccount(request);
		if (input == null || input.ageBand() == null || input.persona() == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Age band and identity are required");
		}
		List<HealthTag> tags = input.healthTags() == null ? List.of() : input.healthTags().stream().distinct().toList();
		if (tags.stream().anyMatch(java.util.Objects::isNull)
				|| (!tags.isEmpty() && !Boolean.TRUE.equals(input.sensitiveConsent()))) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Health history requires separate consent");
		}
		jdbc.update("UPDATE account_profile SET age_band = ?, persona = ?, health_consent = ?, profile_complete = TRUE WHERE id = ?",
				input.ageBand().name(), input.persona().name(), !tags.isEmpty(), account.id());
		jdbc.update("DELETE FROM account_health_tag WHERE account_id = ?", account.id());
		for (HealthTag tag : tags) {
			jdbc.update("INSERT INTO account_health_tag (account_id, tag) VALUES (?, ?)", account.id(), tag.name());
		}
		return findById(account.id());
	}

	public void logout(HttpServletRequest request, HttpServletResponse response) {
		String token = sessionToken(request);
		if (token != null) jdbc.update("DELETE FROM account_session WHERE token_hash = ?", sha256(token));
		clearSessionCookie(request, response);
	}

	@Transactional
	public void deleteAccount(HttpServletRequest request, HttpServletResponse response) {
		Account account = requireAccount(request);
		demoRepository.deleteWorkspace(account.workspaceId());
		jdbc.update("DELETE FROM account_health_tag WHERE account_id = ?", account.id());
		jdbc.update("DELETE FROM account_session WHERE account_id = ?", account.id());
		jdbc.update("DELETE FROM account_profile WHERE id = ?", account.id());
		clearSessionCookie(request, response);
	}

	public AccountInfo info(Account account) {
		return new AccountInfo(account.email(), account.ageBand(), account.persona(), account.healthTags(),
				account.profileComplete(), delivery.demo());
	}

	public String emailMode() {
		return delivery.demo() ? "local" : "smtp";
	}

	private Account findByEmail(String email) {
		List<Account> matches = jdbc.query("SELECT id, email, workspace_id, age_band, persona, profile_complete "
				+ "FROM account_profile WHERE email = ?", (rs, row) -> mapAccount(rs), email);
		return matches.isEmpty() ? null : matches.get(0);
	}

	private Account findById(String id) {
		return jdbc.queryForObject("SELECT id, email, workspace_id, age_band, persona, profile_complete "
				+ "FROM account_profile WHERE id = ?", (rs, row) -> mapAccount(rs), id);
	}

	private Account mapAccount(ResultSet rs) throws SQLException {
		String id = rs.getString("id");
		String age = rs.getString("age_band");
		String persona = rs.getString("persona");
		List<HealthTag> tags = new ArrayList<>(jdbc.query("SELECT tag FROM account_health_tag WHERE account_id = ? ORDER BY tag",
				(row, index) -> HealthTag.valueOf(row.getString("tag")), id));
		return new Account(id, rs.getString("email"), rs.getString("workspace_id"),
				age == null ? null : AgeBand.valueOf(age), persona == null ? null : Persona.valueOf(persona),
				List.copyOf(tags), rs.getBoolean("profile_complete"));
	}

	private String normalizeEmail(String raw) {
		if (raw == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email");
		String email = raw.trim().toLowerCase(Locale.ROOT);
		if (email.length() > 254 || !EMAIL.matcher(email).matches()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email");
		}
		return email;
	}

	private String sessionToken(HttpServletRequest request) {
		if (request.getCookies() == null) return null;
		for (Cookie cookie : request.getCookies()) {
			if (SESSION_COOKIE.equals(cookie.getName()) && cookie.getValue().matches("[0-9a-f]{64}")) {
				return cookie.getValue();
			}
		}
		return null;
	}

	private String sessionCookie(String value, boolean secure, Duration age) {
		return ResponseCookie.from(SESSION_COOKIE, value).httpOnly(true).sameSite("Lax")
				.secure(secure).path("/api").maxAge(age).build().toString();
	}

	private void clearSessionCookie(HttpServletRequest request, HttpServletResponse response) {
		response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie("", request.isSecure(), Duration.ZERO));
	}

	private byte[] randomBytes(int length) {
		byte[] bytes = new byte[length];
		random.nextBytes(bytes);
		return bytes;
	}

	private byte[] digest(byte[] salt, String code) {
		MessageDigest md = sha256Digest();
		md.update(salt);
		return md.digest(code.getBytes(StandardCharsets.US_ASCII));
	}

	private String sha256(String value) {
		return HexFormat.of().formatHex(sha256Digest().digest(value.getBytes(StandardCharsets.US_ASCII)));
	}

	private MessageDigest sha256Digest() {
		try {
			return MessageDigest.getInstance("SHA-256");
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 unavailable", exception);
		}
	}
}

package com.aihealth.backend.demo;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.aihealth.backend.demo.DemoModels.ActionItem;
import com.aihealth.backend.demo.DemoModels.Checkin;
import com.aihealth.backend.demo.DemoModels.CheckinInput;
import com.aihealth.backend.demo.DemoModels.Persona;

@Repository
public class DemoRepository {
	private final JdbcTemplate jdbc;

	public DemoRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<Checkin> history(Persona persona) {
		return jdbc.query("SELECT entry_date, sleep_hours, activity_minutes, mood, note FROM checkin "
				+ "WHERE persona = ? AND entry_date >= ? ORDER BY entry_date",
				(rs, row) -> new Checkin(rs.getDate("entry_date").toLocalDate(), rs.getDouble("sleep_hours"),
						rs.getInt("activity_minutes"), rs.getInt("mood"), rs.getString("note")),
				persona.name(), Date.valueOf(LocalDate.now().minusDays(6)));
	}

	public Checkin today(Persona persona) {
		return history(persona).stream().filter(item -> item.day().equals(LocalDate.now())).findFirst().orElse(null);
	}

	public Checkin saveCheckin(Persona persona, CheckinInput input) {
		return saveCheckin(persona, LocalDate.now(), input);
	}

	public Checkin saveCheckin(Persona persona, LocalDate day, CheckinInput input) {
		String note = input.note() == null ? "" : input.note().trim();
		int changed = jdbc.update("UPDATE checkin SET sleep_hours = ?, activity_minutes = ?, mood = ?, note = ? "
				+ "WHERE persona = ? AND entry_date = ?", input.sleepHours(), input.activityMinutes(), input.mood(),
				note, persona.name(), Date.valueOf(day));
		if (changed == 0) {
			jdbc.update("INSERT INTO checkin (persona, entry_date, sleep_hours, activity_minutes, mood, note) "
					+ "VALUES (?, ?, ?, ?, ?, ?)", persona.name(), Date.valueOf(day),
					input.sleepHours(), input.activityMinutes(), input.mood(), note);
		}
		return new Checkin(day, input.sleepHours(), input.activityMinutes(), input.mood(), note);
	}

	public List<ActionItem> actions(Persona persona) {
		return jdbc.query("SELECT id, title, completed FROM action_item WHERE persona = ? ORDER BY created_at DESC",
				(rs, row) -> new ActionItem(rs.getString("id"), rs.getString("title"), rs.getBoolean("completed")),
				persona.name());
	}

	public ActionItem addAction(Persona persona, String title) {
		String id = UUID.randomUUID().toString();
		jdbc.update("INSERT INTO action_item (id, persona, title, completed, created_at) VALUES (?, ?, ?, ?, ?)",
				id, persona.name(), title, false, Timestamp.valueOf(LocalDateTime.now()));
		return new ActionItem(id, title, false);
	}

	public ActionItem setActionCompleted(String id, boolean completed) {
		int changed = jdbc.update("UPDATE action_item SET completed = ? WHERE id = ?", completed, id);
		if (changed == 0) return null;
		return jdbc.queryForObject("SELECT id, title, completed FROM action_item WHERE id = ?",
				(rs, row) -> new ActionItem(rs.getString("id"), rs.getString("title"), rs.getBoolean("completed")), id);
	}

	public boolean deleteAction(String id) {
		return jdbc.update("DELETE FROM action_item WHERE id = ?", id) > 0;
	}

	public boolean hasCheckins(Persona persona) {
		Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM checkin WHERE persona = ?", Integer.class, persona.name());
		return count != null && count > 0;
	}

	public void seedCheckin(Persona persona, LocalDate day, double sleep, int activity, int mood, String note) {
		jdbc.update("INSERT INTO checkin (persona, entry_date, sleep_hours, activity_minutes, mood, note) "
				+ "VALUES (?, ?, ?, ?, ?, ?)", persona.name(), Date.valueOf(day), sleep, activity, mood, note);
	}
}

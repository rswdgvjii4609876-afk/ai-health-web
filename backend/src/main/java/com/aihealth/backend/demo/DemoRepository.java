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
import com.aihealth.backend.ai.AiResponse;
import com.aihealth.backend.ai.SavedQuestion;

import tools.jackson.databind.json.JsonMapper;

@Repository
public class DemoRepository {
	private final JdbcTemplate jdbc;
	private final JsonMapper mapper;

	public DemoRepository(JdbcTemplate jdbc, JsonMapper mapper) {
		this.jdbc = jdbc;
		this.mapper = mapper;
	}

	public List<Checkin> history(String workspace, Persona persona) {
		return history(workspace, persona, 7);
	}

	public List<Checkin> history(String workspace, Persona persona, int days) {
		return jdbc.query("SELECT entry_date, sleep_hours, activity_minutes, mood, note FROM checkin "
				+ "WHERE workspace_id = ? AND persona = ? AND entry_date BETWEEN ? AND ? ORDER BY entry_date",
				(rs, row) -> new Checkin(rs.getDate("entry_date").toLocalDate(), rs.getDouble("sleep_hours"),
						rs.getInt("activity_minutes"), rs.getInt("mood"), rs.getString("note")),
				workspace, persona.name(), Date.valueOf(LocalDate.now().minusDays(days - 1)), Date.valueOf(LocalDate.now()));
	}

	public Checkin today(String workspace, Persona persona) {
		return history(workspace, persona).stream().filter(item -> item.day().equals(LocalDate.now())).findFirst().orElse(null);
	}

	public Checkin saveCheckin(String workspace, Persona persona, CheckinInput input) {
		return saveCheckin(workspace, persona, LocalDate.now(), input);
	}

	public Checkin saveCheckin(String workspace, Persona persona, LocalDate day, CheckinInput input) {
		String note = input.note() == null ? "" : input.note().trim();
		int changed = jdbc.update("UPDATE checkin SET sleep_hours = ?, activity_minutes = ?, mood = ?, note = ? "
				+ "WHERE workspace_id = ? AND persona = ? AND entry_date = ?", input.sleepHours(), input.activityMinutes(), input.mood(),
				note, workspace, persona.name(), Date.valueOf(day));
		if (changed == 0) {
			jdbc.update("INSERT INTO checkin (workspace_id, persona, entry_date, sleep_hours, activity_minutes, mood, note) "
					+ "VALUES (?, ?, ?, ?, ?, ?, ?)", workspace, persona.name(), Date.valueOf(day),
					input.sleepHours(), input.activityMinutes(), input.mood(), note);
		}
		return new Checkin(day, input.sleepHours(), input.activityMinutes(), input.mood(), note);
	}

	public List<ActionItem> actions(String workspace, Persona persona) {
		return jdbc.query("SELECT id, title, completed FROM action_item WHERE workspace_id = ? AND persona = ? ORDER BY created_at DESC",
				(rs, row) -> new ActionItem(rs.getString("id"), rs.getString("title"), rs.getBoolean("completed")),
				workspace, persona.name());
	}

	public ActionItem addAction(String workspace, Persona persona, String title) {
		String id = UUID.randomUUID().toString();
		jdbc.update("INSERT INTO action_item (id, workspace_id, persona, title, completed, created_at) VALUES (?, ?, ?, ?, ?, ?)",
				id, workspace, persona.name(), title, false, Timestamp.valueOf(LocalDateTime.now()));
		return new ActionItem(id, title, false);
	}

	public ActionItem setActionCompleted(String workspace, String id, boolean completed) {
		int changed = jdbc.update("UPDATE action_item SET completed = ? WHERE workspace_id = ? AND id = ?", completed, workspace, id);
		if (changed == 0) return null;
		return jdbc.queryForObject("SELECT id, title, completed FROM action_item WHERE workspace_id = ? AND id = ?",
				(rs, row) -> new ActionItem(rs.getString("id"), rs.getString("title"), rs.getBoolean("completed")), workspace, id);
	}

	public boolean deleteAction(String workspace, String id) {
		return jdbc.update("DELETE FROM action_item WHERE workspace_id = ? AND id = ?", workspace, id) > 0;
	}

	public boolean hasCheckins(String workspace, Persona persona) {
		Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM checkin WHERE workspace_id = ? AND persona = ?", Integer.class,
				workspace, persona.name());
		return count != null && count > 0;
	}

	public void seedCheckin(String workspace, Persona persona, LocalDate day, double sleep, int activity, int mood, String note) {
		jdbc.update("INSERT INTO checkin (workspace_id, persona, entry_date, sleep_hours, activity_minutes, mood, note) "
				+ "VALUES (?, ?, ?, ?, ?, ?, ?)", workspace, persona.name(), Date.valueOf(day), sleep, activity, mood, note);
	}

	public void deleteWorkspace(String workspace) {
		jdbc.update("DELETE FROM assistant_turn WHERE workspace_id = ?", workspace);
		jdbc.update("DELETE FROM action_item WHERE workspace_id = ?", workspace);
		jdbc.update("DELETE FROM checkin WHERE workspace_id = ?", workspace);
	}

	public void saveQuestion(String workspace, Persona persona, String question, AiResponse response) {
		jdbc.update("INSERT INTO assistant_turn (id, workspace_id, persona, question, response_json, asked_at) "
				+ "VALUES (?, ?, ?, ?, ?, ?)", UUID.randomUUID().toString(), workspace, persona.name(), question,
				mapper.writeValueAsString(response), Timestamp.valueOf(LocalDateTime.now()));
	}

	public List<SavedQuestion> questions(String workspace, Persona persona) {
		return jdbc.query("SELECT id, asked_at, question, response_json FROM assistant_turn "
				+ "WHERE workspace_id = ? AND persona = ? ORDER BY asked_at DESC, id DESC LIMIT 100",
				(rs, row) -> new SavedQuestion(rs.getString("id"), rs.getTimestamp("asked_at").toLocalDateTime(),
						rs.getString("question"), mapper.readValue(rs.getString("response_json"), AiResponse.class)),
				workspace, persona.name());
	}

	public boolean deleteQuestion(String workspace, Persona persona, String id) {
		return jdbc.update("DELETE FROM assistant_turn WHERE workspace_id = ? AND persona = ? AND id = ?",
				workspace, persona.name(), id) > 0;
	}
}

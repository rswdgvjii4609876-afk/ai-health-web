CREATE TABLE IF NOT EXISTS checkin (
    workspace_id VARCHAR(64) NOT NULL,
    persona VARCHAR(16) NOT NULL,
    entry_date DATE NOT NULL,
    sleep_hours DOUBLE PRECISION NOT NULL,
    activity_minutes INT NOT NULL,
    mood INT NOT NULL,
    note VARCHAR(240) NOT NULL,
    PRIMARY KEY (workspace_id, persona, entry_date)
);

CREATE TABLE IF NOT EXISTS action_item (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    persona VARCHAR(16) NOT NULL,
    title VARCHAR(100) NOT NULL,
    completed BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS assistant_turn (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    persona VARCHAR(16) NOT NULL,
    question VARCHAR(400) NOT NULL,
    response_json CLOB NOT NULL,
    asked_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS assistant_turn_workspace_time
    ON assistant_turn (workspace_id, persona, asked_at);

CREATE TABLE IF NOT EXISTS account_profile (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    workspace_id VARCHAR(64) NOT NULL UNIQUE,
    age_band VARCHAR(16),
    persona VARCHAR(16),
    health_consent BOOLEAN NOT NULL DEFAULT FALSE,
    profile_complete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS account_health_tag (
    account_id VARCHAR(36) NOT NULL,
    tag VARCHAR(24) NOT NULL,
    PRIMARY KEY (account_id, tag)
);

CREATE TABLE IF NOT EXISTS account_session (
    token_hash VARCHAR(64) PRIMARY KEY,
    account_id VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS account_session_account
    ON account_session (account_id);

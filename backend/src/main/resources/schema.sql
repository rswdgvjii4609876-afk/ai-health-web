CREATE TABLE IF NOT EXISTS checkin (
    persona VARCHAR(16) NOT NULL,
    entry_date DATE NOT NULL,
    sleep_hours DOUBLE PRECISION NOT NULL,
    activity_minutes INT NOT NULL,
    mood INT NOT NULL,
    note VARCHAR(240) NOT NULL,
    PRIMARY KEY (persona, entry_date)
);

CREATE TABLE IF NOT EXISTS action_item (
    id VARCHAR(36) PRIMARY KEY,
    persona VARCHAR(16) NOT NULL,
    title VARCHAR(100) NOT NULL,
    completed BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL
);

ALTER TABLE users
    ADD COLUMN status ENUM('active', 'disabled', 'deleted') NOT NULL DEFAULT 'active';
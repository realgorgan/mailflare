ALTER TABLE messages ADD COLUMN retention_active_at integer NOT NULL DEFAULT (unixepoch());
ALTER TABLE messages ADD COLUMN archive_at integer;
CREATE INDEX IF NOT EXISTS messages_retention_idx ON messages (status, retention_active_at);
CREATE INDEX IF NOT EXISTS messages_archive_expiry_idx ON messages (status, archive_at);

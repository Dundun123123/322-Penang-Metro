-- Run in the configured project database. Adds only the shared authentication quota table.
-- Safe to re-run when the current singular-name schema is already installed.
CREATE TABLE IF NOT EXISTS auth_rate_limit (
  bucket_key CHAR(64) NOT NULL PRIMARY KEY,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at BIGINT NOT NULL,
  KEY auth_rate_limit_expiry_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Select the shared project database before executing this migration.
-- Creates only the configuration table; preserves all existing accounts and data.
CREATE TABLE IF NOT EXISTS registration_config (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  authority_key_hash VARCHAR(255) NOT NULL,
  team_code_secret VARCHAR(255) NOT NULL,
  gmt_create VARCHAR(30) NOT NULL,
  gmt_modified VARCHAR(30) NOT NULL,
  CONSTRAINT registration_config_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Complete schema for a NEW database; does not migrate existing tables.
CREATE DATABASE IF NOT EXISTS penang_metro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE penang_metro;

CREATE TABLE IF NOT EXISTS app_user (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('resident','team') NOT NULL,
  gmt_create VARCHAR(30) NOT NULL,
  staff_kind VARCHAR(30) NULL,
  department VARCHAR(30) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_session (
  id CHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  expires_at VARCHAR(30) NOT NULL,
  gmt_create VARCHAR(30) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
  KEY auth_session_expiry_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notice (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  kind VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  title_en TEXT NOT NULL,
  title_zh TEXT,
  title_ms TEXT,
  body_en LONGTEXT NOT NULL,
  body_zh LONGTEXT,
  body_ms LONGTEXT,
  location TEXT NOT NULL,
  start_at VARCHAR(40),
  end_at VARCHAR(40),
  diversion TEXT,
  latitude VARCHAR(30),
  longitude VARCHAR(30),
  gmt_create VARCHAR(30) NOT NULL,
  gmt_modified VARCHAR(30) NOT NULL,
  route_path LONGTEXT NULL,
  progress_percent INT NULL,
  point_data LONGTEXT NULL,
  client_request_id VARCHAR(36) NULL,
  UNIQUE KEY notice_client_request_idx (client_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  reference VARCHAR(100) NOT NULL UNIQUE,
  access_hash VARCHAR(255) NOT NULL,
  owner_user_id VARCHAR(36),
  contact_email VARCHAR(255),
  kind VARCHAR(50) NOT NULL,
  location TEXT NOT NULL,
  description LONGTEXT NOT NULL,
  photo_key VARCHAR(255),
  photo_type VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  gmt_create VARCHAR(30) NOT NULL,
  gmt_modified VARCHAR(30) NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES app_user(id) ON DELETE SET NULL,
  KEY report_created_idx (gmt_create DESC,id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_event (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  report_id VARCHAR(36) NOT NULL,
  status VARCHAR(30) NOT NULL,
  note_en TEXT NOT NULL,
  note_zh TEXT,
  note_ms TEXT,
  gmt_create VARCHAR(30) NOT NULL,
  actor_name VARCHAR(120) NULL,
  actor_role VARCHAR(30) NULL,
  notice_id VARCHAR(36) NULL,
  FOREIGN KEY (report_id) REFERENCES report(id) ON DELETE CASCADE,
  KEY report_event_report_created_idx (report_id,gmt_create DESC,id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notice_image (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  notice_id VARCHAR(36) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  gmt_create VARCHAR(30) NOT NULL,
  FOREIGN KEY (notice_id) REFERENCES notice(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notice_subscription (
  user_id VARCHAR(36) NOT NULL PRIMARY KEY,
  categories TEXT NOT NULL,
  gmt_modified VARCHAR(30) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS penang_metro.uploaded_file (
    storage_key VARCHAR(255) NOT NULL COMMENT '图片文件唯一存储标识',
    mime_type VARCHAR(100) NOT NULL COMMENT '图片MIME类型',
    content MEDIUMBLOB NOT NULL COMMENT '图片二进制内容，供所有电脑共享读取',
    gmt_create VARCHAR(30) NOT NULL COMMENT '上传时间，ISO格式字符串',
    PRIMARY KEY (storage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='共享图片文件表：保存公告及居民报告图片内容';

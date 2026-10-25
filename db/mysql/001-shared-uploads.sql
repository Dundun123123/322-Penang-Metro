-- Run once as root in DBeaver, after the seven existing project tables are ready.
-- This script does not delete existing records or import SQLite data.
CREATE TABLE IF NOT EXISTS penang_metro.uploaded_file (
    storage_key VARCHAR(255) NOT NULL COMMENT '图片文件唯一存储标识',
    mime_type VARCHAR(100) NOT NULL COMMENT '图片MIME类型',
    content MEDIUMBLOB NOT NULL COMMENT '图片二进制内容，供所有电脑共享读取',
    gmt_create VARCHAR(30) NOT NULL COMMENT '上传时间，ISO格式字符串',
    PRIMARY KEY (storage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='共享图片文件表：保存公告及居民报告图片内容';

-- Existing API accepts names up to 120 characters and notice dates up to 40.
ALTER TABLE penang_metro.app_user
    MODIFY COLUMN name VARCHAR(120) NOT NULL COMMENT '用户姓名';
ALTER TABLE penang_metro.notice
    MODIFY COLUMN start_at VARCHAR(40) NULL COMMENT '施工或公告事项的开始时间',
    MODIFY COLUMN end_at VARCHAR(40) NULL COMMENT '施工或公告事项的结束时间';

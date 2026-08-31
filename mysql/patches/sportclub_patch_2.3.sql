CREATE TABLE IF NOT EXISTS news_files (
  news_id int(10) UNSIGNED NOT NULL,
  file_id int(10) UNSIGNED NOT NULL,
  order_field int(6) UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (news_id, file_id),
  INDEX IDX_NEWS_FILES_FILE (file_id),
  CONSTRAINT FK_NEWS_FILES_NEWS FOREIGN KEY (news_id)
  REFERENCES news(id) ON DELETE CASCADE,
  CONSTRAINT FK_NEWS_FILES_FILE FOREIGN KEY (file_id)
  REFERENCES files(file_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO news_files (news_id, file_id, order_field)
SELECT news.id, news.file_id, 0
FROM news
INNER JOIN files ON (news.file_id = files.file_id)
WHERE news.file_id > 0;

CREATE TABLE news_type (
  news_type_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  description varchar(32) NOT NULL DEFAULT '',
  PRIMARY KEY (news_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO news_type (news_type_id, description) VALUES(1, 'Nyheter');
INSERT INTO news_type (news_type_id, description) VALUES(2, 'Nyheter (Under lång tid)');
INSERT INTO news_type (news_type_id, description) VALUES(3, 'Utbildning');
INSERT INTO news_type (news_type_id, description) VALUES(10, 'Banner');
COMMIT;

CREATE TABLE news (
  id int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  rubrik varchar(50) NOT NULL DEFAULT '',
  lank varchar(150) DEFAULT '',
  inledning text NOT NULL,
  texten text DEFAULT NULL,
  news_type_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  expire_date date NOT NULL DEFAULT '0000-00-00',
  file_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  image_width int(10) UNSIGNED NOT NULL DEFAULT 0,
  image_height int(10) UNSIGNED NOT NULL DEFAULT 0,
  cre_by_user_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  cre_date datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  mod_by_user_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  mod_date datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (id),
  INDEX IDX_NEWS_NEWSTYPE (news_type_id),
  CONSTRAINT FK_NEWS_NEWSTYPE FOREIGN KEY (news_type_id)
  REFERENCES news_type(news_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE folders (
  folder_id int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2,
  folder_name varchar(255) NOT NULL DEFAULT '',
  parent_folder_id int(11) NOT NULL DEFAULT -1,
  pre_story text DEFAULT NULL,
  post_story text DEFAULT NULL,
  need_password char(3) NOT NULL DEFAULT '',
  allowed_group_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  cre_by_user_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  cre_date datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (folder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO folders (folder_id, folder_name, parent_folder_id, pre_story, post_story, need_password, allowed_group_id, cre_by_user_id, cre_date) VALUES(1, 'Nyheter', 0, NULL, NULL, 'NO', 0, 2, '2010-11-06 18:58:30');
COMMIT;

CREATE TABLE files (
  file_id int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  file_name varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  story text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  file_size int(10) UNSIGNED NOT NULL DEFAULT 0,
  file_blob longblob NOT NULL,
  mime_type varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  image_width int(6) UNSIGNED NOT NULL DEFAULT 0,
  image_height int(6) UNSIGNED NOT NULL DEFAULT 0,
  folder_id int(11) NOT NULL DEFAULT 1,
  need_password char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  allowed_group_id int(4) UNSIGNED DEFAULT NULL,
  cre_by_user_id int(6) UNSIGNED NOT NULL DEFAULT 0,
  cre_date datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  order_field int(6) UNSIGNED DEFAULT NULL,
  PRIMARY KEY (file_id),
  INDEX IDX_FILES_FOLDER (folder_id),
  CONSTRAINT FK_FILES_FOLDER FOREIGN KEY (folder_id)
  REFERENCES folders(folder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

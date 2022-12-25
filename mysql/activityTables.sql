CREATE TABLE activity_type (
  activity_type_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  descr varchar(32) NOT NULL DEFAULT '',
  PRIMARY KEY (activity_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO activity_type (activity_type_id, descr) VALUES(1, 'Samling');
INSERT INTO activity_type (activity_type_id, descr) VALUES(2, 'Träning');
INSERT INTO activity_type (activity_type_id, descr) VALUES(3, 'Tävling');
INSERT INTO activity_type (activity_type_id, descr) VALUES(4, 'OBS!');
COMMIT;

CREATE TABLE activity (
  activity_id int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  activity_type_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  activity_day date NOT NULL DEFAULT '0000-00-00',
  group_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  activity_time time DEFAULT NULL,
  place varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  header varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  descr text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  responsible_user_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  cre_by_user_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  cre_date datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  mod_by_user_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  mod_date datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  url varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  longitude decimal(20,10) DEFAULT NULL,
  latitude decimal(20,10) DEFAULT NULL,
  repeating_gid varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  repeating_modified tinyint(1) NOT NULL DEFAULT 0,
  activity_duration_minutes int(11) DEFAULT NULL,
  PRIMARY KEY (activity_id),
  INDEX IDX_ACTIVITY_ACTIVITYTYPE (activity_type_id),
  CONSTRAINT FK_ACTIVITY_ACTIVITYTYPE FOREIGN KEY (activity_type_id)
  REFERENCES activity_type(activity_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

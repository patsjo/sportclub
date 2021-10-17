CREATE TABLE councils (
  council_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  `name` varchar(32)NOT NULL DEFAULT ''
) ENGINE=InnoDB;

ALTER TABLE councils
  ADD PRIMARY KEY (council_id);

INSERT INTO councils (council_id, `name`) VALUES (0, 'Ej medlem i styrelsen');
INSERT INTO councils (council_id, `name`) VALUES (1, 'Ordförande');
INSERT INTO councils (council_id, `name`) VALUES (2, 'Vice ordförande');
INSERT INTO councils (council_id, `name`) VALUES (3, 'Sekreterare');
INSERT INTO councils (council_id, `name`) VALUES (4, 'Vice sekreterare');
INSERT INTO councils (council_id, `name`) VALUES (5, 'Kassör');
INSERT INTO councils (council_id, `name`) VALUES (6, 'Ledamot');
INSERT INTO councils (council_id, `name`) VALUES (7, 'Suppleant');
COMMIT;

CREATE TABLE elit_subgroups (
  subgroup_id int(4) UNSIGNED NOT NULL,
  `name` varchar(16) NOT NULL,
  description varchar(64) NOT NULL
) ENGINE=InnoDB;

ALTER TABLE elit_subgroups
  ADD PRIMARY KEY (subgroup_id);

INSERT INTO elit_subgroups (subgroup_id, `name`, description) VALUES(0, 'NONE', 'Inget');
INSERT INTO elit_subgroups (subgroup_id, `name`, description) VALUES(1, 'H_SENIOR', 'Herrar');
INSERT INTO elit_subgroups (subgroup_id, `name`, description) VALUES(2, 'D_SENIOR', 'Damer');
INSERT INTO elit_subgroups (subgroup_id, `name`, description) VALUES(3, 'H_JUNIOR', 'Herrjuniorer');
INSERT INTO elit_subgroups (subgroup_id, `name`, description) VALUES(4, 'D_JUNIOR', 'Damjuniorer');
INSERT INTO elit_subgroups (subgroup_id, `name`, description) VALUES(5, 'LEADER', 'Ledare');
INSERT INTO elit_subgroups (subgroup_id, `name`, description) VALUES(6, 'INFO', 'Elitinfo');
COMMIT;

CREATE TABLE groups (
  group_id int(4) UNSIGNED NOT NULL DEFAULT 0,
  `name` varchar(16)  NOT NULL DEFAULT '',
  description varchar(32)  NOT NULL DEFAULT '',
  email varchar(128)  DEFAULT NULL,
  show_in_calendar char(3)  NOT NULL DEFAULT 'NO'
) ENGINE=InnoDB;

ALTER TABLE groups
  ADD PRIMARY KEY (group_id);

INSERT INTO groups (group_id, `name`, description, email, show_in_calendar) VALUES(1, 'ADMIN', 'Administratör', NULL, 'NO');
INSERT INTO groups (group_id, `name`, description, email, show_in_calendar) VALUES(2, 'ELIT', 'Elit', NULL, 'YES');
INSERT INTO groups (group_id, `name`, description, email, show_in_calendar) VALUES(3, 'DAGBOK_ADMIN', 'Administratör för kalendern', NULL, 'NO');
INSERT INTO groups (group_id, `name`, description, email, show_in_calendar) VALUES(4, 'UNGDOM', 'Ungdom', NULL, 'YES');
INSERT INTO groups (group_id, `name`, description, email, show_in_calendar) VALUES(5, 'MOTION', 'Motionär', NULL, 'YES');
INSERT INTO groups (group_id, `name`, description, email, show_in_calendar) VALUES(6, 'COACH', 'UK', NULL, 'NO');
INSERT INTO groups (group_id, `name`, description, email, show_in_calendar) VALUES(7, 'ORION_STARS_FC', 'Orion Stars FC', NULL, 'NO');
INSERT INTO groups (group_id, `name`, description, email, show_in_calendar) VALUES(8, 'TRAINER', 'Tränare', NULL, 'NO');
INSERT INTO groups (group_id, `name`, description, email, show_in_calendar) VALUES(9, 'MAP', 'Kartritare', NULL, 'NO');
COMMIT;

CREATE TABLE users (
  user_id int(8) UNSIGNED NOT NULL AUTO_INCREMENT,
  birthday date DEFAULT NULL,
  first_name varchar(16) NOT NULL DEFAULT '',
  last_name varchar(32) NOT NULL DEFAULT '',
  address varchar(32) DEFAULT NULL,
  zip int(6) UNSIGNED DEFAULT NULL,
  city varchar(32) DEFAULT NULL,
  email varchar(64) DEFAULT NULL,
  phone_no varchar(18) DEFAULT NULL,
  mobile_phone_no varchar(18) DEFAULT NULL,
  work_phone_no varchar(18) DEFAULT NULL,
  council_id int(2) UNSIGNED DEFAULT NULL,
  responsibility varchar(32) DEFAULT NULL
) ENGINE=InnoDB;

ALTER TABLE users
  ADD PRIMARY KEY (user_id);

CREATE TABLE user_groups (
  user_id int(8) UNSIGNED NOT NULL DEFAULT 0,
  group_id int(4) UNSIGNED NOT NULL DEFAULT 0,
  elit_subgroup_id int(4) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

ALTER TABLE user_groups
  ADD PRIMARY KEY (user_id,group_id);

CREATE TABLE user_login (
  user_id int(8) UNSIGNED NOT NULL,
  eventor_person_id int(8) UNSIGNED NOT NULL,
  base64 varchar(512) NOT NULL
) ENGINE=InnoDB;

ALTER TABLE user_login
  ADD PRIMARY KEY (user_id),
  ADD UNIQUE KEY IDX_EVENTOR_PERSON_ID_UNIQUE (eventor_person_id);

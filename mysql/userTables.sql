CREATE TABLE councils (
  council_id int(10) UNSIGNED NOT NULL DEFAULT 0,
  `name` varchar(32)NOT NULL DEFAULT '',
  PRIMARY KEY (council_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  description varchar(64) NOT NULL,
  PRIMARY KEY (subgroup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  show_in_calendar char(3)  NOT NULL DEFAULT 'NO',
  PRIMARY KEY (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  responsibility varchar(32) DEFAULT NULL,
  competitor_id int(10) UNSIGNED DEFAULT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT FK_USERS_COUNCIL FOREIGN KEY (council_id)
  REFERENCES councils(council_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_groups (
  user_id int(8) UNSIGNED NOT NULL DEFAULT 0,
  group_id int(4) UNSIGNED NOT NULL DEFAULT 0,
  elit_subgroup_id int(4) UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id,group_id),
  CONSTRAINT FK_USERGROUPS_USER FOREIGN KEY (user_id)
  REFERENCES users(user_id),
  CONSTRAINT FK_USERGROUPS_GROUP FOREIGN KEY (group_id)
  REFERENCES groups(group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_login (
  user_id int(8) UNSIGNED NOT NULL,
  eventor_person_id int(8) UNSIGNED NOT NULL,
  base64 varchar(512) NOT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY IDX_EVENTOR_PERSON_ID_UNIQUE (eventor_person_id),
  CONSTRAINT FK_USERLOGIN_USER FOREIGN KEY (user_id)
  REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- An account from Google or Facebook. Without USER_ID it is a guest,
-- that only can react and comment. An administrator links it to a user.
CREATE TABLE IF NOT EXISTS user_oauth
(
    oauth_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    provider VARCHAR(16) NOT NULL,
    provider_user_id VARCHAR(128) NOT NULL,
    user_id INT(8) UNSIGNED DEFAULT NULL,
    name VARCHAR(128) NOT NULL DEFAULT '',
    first_name VARCHAR(64) DEFAULT NULL,
    last_name VARCHAR(64) DEFAULT NULL,
    email VARCHAR(128) DEFAULT NULL,
    picture_url VARCHAR(512) DEFAULT NULL,
    cre_date DATETIME NOT NULL,
    last_login_date DATETIME NOT NULL,
    PRIMARY KEY (oauth_id),
    UNIQUE INDEX IDX_USER_OAUTH_PROVIDER (provider, provider_user_id),
    INDEX IDX_USER_OAUTH_USER (user_id),
    CONSTRAINT FK_USER_OAUTH_USER FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Only the SHA-256 hash of a token is saved.
-- LOGIN    sent as "Authorization: Bearer <token>" by the web page.
-- EXCHANGE a one time code (2 minutes) when Google/Facebook returns to
--          the web page, the web page exchanges it for a LOGIN token.
CREATE TABLE IF NOT EXISTS user_login_tokens
(
    token_hash CHAR(64) NOT NULL,
    token_type VARCHAR(8) NOT NULL DEFAULT 'LOGIN',
    user_id INT UNSIGNED DEFAULT NULL,
    oauth_id INT UNSIGNED DEFAULT NULL,
    eventor_person_id INT UNSIGNED DEFAULT NULL,
    remember BOOLEAN NOT NULL DEFAULT FALSE,
    cre_date DATETIME NOT NULL,
    expire_date DATETIME NOT NULL,
    PRIMARY KEY (token_hash),
    INDEX IDX_USER_LOGIN_TOKENS_USER (user_id),
    INDEX IDX_USER_LOGIN_TOKENS_OAUTH (oauth_id),
    INDEX IDX_USER_LOGIN_TOKENS_EXPIRE (expire_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- GROUP_ID 0 is a request to become a member (linked to a user)
CREATE TABLE IF NOT EXISTS user_access_requests
(
    request_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    oauth_id INT UNSIGNED DEFAULT NULL,
    user_id INT UNSIGNED DEFAULT NULL,
    group_id INT UNSIGNED NOT NULL DEFAULT 0,
    message VARCHAR(512) DEFAULT NULL,
    status VARCHAR(8) NOT NULL DEFAULT 'PENDING',
    cre_date DATETIME NOT NULL,
    handled_by_user_id INT UNSIGNED DEFAULT NULL,
    handled_date DATETIME DEFAULT NULL,
    PRIMARY KEY (request_id),
    INDEX IDX_USER_ACCESS_REQUESTS_STATUS (status),
    INDEX IDX_USER_ACCESS_REQUESTS_OAUTH (oauth_id),
    INDEX IDX_USER_ACCESS_REQUESTS_USER (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

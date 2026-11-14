-- ##########################################################
-- # Login with Google and Facebook, login tokens instead   #
-- # of sending the password on every request, access      #
-- # requests from guests, and reactions and comments.      #
-- ##########################################################

-- A user can be linked to a competitor, also without an Eventor id
ALTER TABLE users ADD COLUMN competitor_id INT UNSIGNED DEFAULT NULL;

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

-- ##########################################################
-- # Reactions and comments on news, calendar activities,   #
-- # Eventor races and cup races/reports.                   #
-- # TARGET_TYPE + TARGET_ID points to the item, no foreign #
-- # key since the targets are in different tables.         #
-- # AUTHOR_KEY is U<user_id> for users and O<oauth_id> for #
-- # guests, one reaction per author and item.              #
-- ##########################################################

CREATE TABLE IF NOT EXISTS SOCIAL_REACTIONS
(
    TARGET_TYPE VARCHAR(16) NOT NULL,
    TARGET_ID VARCHAR(64) NOT NULL,
    AUTHOR_KEY VARCHAR(16) NOT NULL,
    USER_ID INT UNSIGNED DEFAULT NULL,
    OAUTH_ID INT UNSIGNED DEFAULT NULL,
    REACTION VARCHAR(8) NOT NULL,
    CRE_DATE DATETIME NOT NULL,
    PRIMARY KEY (TARGET_TYPE, TARGET_ID, AUTHOR_KEY),
    INDEX IDX_SOCIAL_REACTIONS_AUTHOR (AUTHOR_KEY)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS SOCIAL_COMMENTS
(
    COMMENT_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    TARGET_TYPE VARCHAR(16) NOT NULL,
    TARGET_ID VARCHAR(64) NOT NULL,
    AUTHOR_KEY VARCHAR(16) NOT NULL,
    USER_ID INT UNSIGNED DEFAULT NULL,
    OAUTH_ID INT UNSIGNED DEFAULT NULL,
    TEXT VARCHAR(2000) NOT NULL,
    CRE_DATE DATETIME NOT NULL,
    PRIMARY KEY (COMMENT_ID),
    INDEX IDX_SOCIAL_COMMENTS_TARGET (TARGET_TYPE, TARGET_ID),
    INDEX IDX_SOCIAL_COMMENTS_AUTHOR (AUTHOR_KEY)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

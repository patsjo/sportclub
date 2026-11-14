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

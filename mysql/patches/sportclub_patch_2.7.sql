-- ##########################################################
-- # Settings for the whole club, one row per setting.      #
-- # SETTING_KEY    e.g. MENU_ORDER, the order of the top   #
-- #                level in the menu (JSON array of the    #
-- #                keys of the menu items and dividers).   #
-- # SETTING_VALUE  JSON                                    #
-- ##########################################################

CREATE TABLE IF NOT EXISTS CLUB_SETTINGS
(
    SETTING_KEY VARCHAR(64) NOT NULL,
    SETTING_VALUE MEDIUMTEXT NOT NULL,
    MOD_BY_USER_ID INT UNSIGNED NOT NULL,
    MOD_DATE DATETIME NOT NULL,
    PRIMARY KEY (SETTING_KEY)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

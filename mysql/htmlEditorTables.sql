CREATE TABLE HTMLEDITOR_PAGES
(
    PAGE_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    MENU_PATH VARCHAR(128) NOT NULL,
    DATA LONGBLOB NOT NULL,
    PRIMARY KEY (PAGE_ID)
) ENGINE = InnoDB;

CREATE TABLE HTMLEDITOR_GROUPS
(
    HTMLEDITOR_GROUP_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    PAGE_ID INT UNSIGNED NOT NULL,
    GROUP_ID INT UNSIGNED NOT NULL,
    PRIMARY KEY (HTMLEDITOR_GROUP_ID),
    INDEX IDX_HTMLEDITOR_GROUP_PAGE (PAGE_ID, GROUP_ID),
    CONSTRAINT FK_HTMLEDITOR_PAGES FOREIGN KEY (PAGE_ID)
    REFERENCES HTMLEDITOR_PAGES(PAGE_ID),
    CONSTRAINT FK_HTMLEDITOR_GROUPS FOREIGN KEY (GROUP_ID)
    REFERENCES groups(GROUP_ID)
) ENGINE = InnoDB;


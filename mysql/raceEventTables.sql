CREATE TABLE RACE_COMPETITORS
(
    COMPETITOR_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    FIRST_NAME VARCHAR(128) NOT NULL,
    LAST_NAME VARCHAR(128) NOT NULL,
    BIRTHDAY DATE NOT NULL,
    PRIMARY KEY (COMPETITOR_ID)
) ENGINE = InnoDB;

CREATE TABLE RACE_COMPETITORS_EVENTOR
(
    EVENTOR_COMPETITOR_ID INT UNSIGNED NOT NULL,
    COMPETITOR_ID INT UNSIGNED NOT NULL,
    PRIMARY KEY (EVENTOR_COMPETITOR_ID),
    INDEX IDX_RACE_EVENTOR_COMPETITORS (COMPETITOR_ID),
    CONSTRAINT FK_RACE_EVENTOR_COMPETITORS FOREIGN KEY (COMPETITOR_ID)
    REFERENCES RACE_COMPETITORS(COMPETITOR_ID)
) ENGINE = InnoDB;

CREATE TABLE RACE_CLUBS
(
    CLUB_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    CLUB_NAME VARCHAR(128) NOT NULL,
    EVENTOR_ORGANISATION_ID INT UNSIGNED NOT NULL,
    PRIMARY KEY (CLUB_ID)
) ENGINE = InnoDB;
INSERT INTO RACE_CLUBS (CLUB_NAME, EVENTOR_ORGANISATION_ID) VALUES ('Värend GN', 584);
INSERT INTO RACE_CLUBS (CLUB_NAME, EVENTOR_ORGANISATION_ID) VALUES ('OK Orion', 288);

CREATE TABLE RACE_COMPETITORS_CLUB
(
    CLUB_COMPETITOR_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    COMPETITOR_ID INT UNSIGNED NOT NULL,
    CLUB_ID INT UNSIGNED NOT NULL,
    START_DATE DATE NOT NULL,
    END_DATE DATE,
    PRIMARY KEY (CLUB_COMPETITOR_ID),
    INDEX IDX_RACE_CLUB_COMPETITORS (COMPETITOR_ID),
    CONSTRAINT FK_RACE_CLUB_COMPETITORS FOREIGN KEY (COMPETITOR_ID)
    REFERENCES RACE_COMPETITORS(COMPETITOR_ID),
    INDEX IDX_RACE_CLUB_CLUB (CLUB_ID),
    CONSTRAINT FK_RACE_CLUB_CLUB FOREIGN KEY (CLUB_ID)
    REFERENCES RACE_CLUBS(CLUB_ID)
) ENGINE = InnoDB;

CREATE TABLE RACE_EVENT_CLASSIFICATION
(
    EVENT_CLASSIFICATION_ID CHAR NOT NULL,
    DESCRIPTION VARCHAR(128) NOT NULL,
    BASE_POINT INT NOT NULL,
    BASE_1000_POINT INT NOT NULL,
    OLD_BASE_POINT INT NOT NULL,
    OLD_POSITION_BASE_POINT INT NOT NULL,
    PRIMARY KEY (EVENT_CLASSIFICATION_ID)
) ENGINE = InnoDB;
INSERT INTO RACE_EVENT_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, BASE_POINT, 1000_BASE_POINT, OLD_BASE_POINT, OLD_POSITION_BASE_POINT) VALUES ('A', 'VM, EM', 120, 100, 130, 35);
INSERT INTO RACE_EVENT_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, BASE_POINT, 1000_BASE_POINT, OLD_BASE_POINT, OLD_POSITION_BASE_POINT) VALUES ('B', 'SM, NOM, Världscup', 115, 100, 120, 35);
INSERT INTO RACE_EVENT_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, BASE_POINT, 1000_BASE_POINT, OLD_BASE_POINT, OLD_POSITION_BASE_POINT) VALUES ('C', 'SM-Lång, GM, SSM', 100, 100, 100, 30);
INSERT INTO RACE_EVENT_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, BASE_POINT, 1000_BASE_POINT, OLD_BASE_POINT, OLD_POSITION_BASE_POINT) VALUES ('D', 'Elitserie, Juniorcup', 100, 100, 90, 30);
INSERT INTO RACE_EVENT_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, BASE_POINT, 1000_BASE_POINT, OLD_BASE_POINT, OLD_POSITION_BASE_POINT) VALUES ('E', 'DM, SM(Kval), SM(b-final), Internationella kval + b-finaler', 80, 100, 80, 25);
INSERT INTO RACE_EVENT_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, BASE_POINT, 1000_BASE_POINT, OLD_BASE_POINT, OLD_POSITION_BASE_POINT) VALUES ('F', 'Nationell tävling', 85, 100, 80, 20);
INSERT INTO RACE_EVENT_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, BASE_POINT, 1000_BASE_POINT, OLD_BASE_POINT, OLD_POSITION_BASE_POINT) VALUES ('G', 'Närtävling', 30, 60, 55, 10);
INSERT INTO RACE_EVENT_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, BASE_POINT, 1000_BASE_POINT, OLD_BASE_POINT, OLD_POSITION_BASE_POINT) VALUES ('H', 'Klubb- & Kommunmästerskap', 50, 60, 30, 10);

CREATE TABLE RACE_CLASS_LEVEL
(
    SHORTNAME VARCHAR(16) NOT NULL,
    CLASSTYPE_SHORTNAME CHAR NOT NULL,
    AGE INT NOT NULL,
    DIFFICULTY VARCHAR(16) NOT NULL,
    PRIMARY KEY (SHORTNAME)
) ENGINE = InnoDB;
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("INSK", "I", 16, "Grön");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("U1", "Ö", 16, "Grön");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("U2", "Ö", 16, "Vit");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("U3", "Ö", 16, "Gul");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H10", "T", 10, "Vit");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D10", "T", 10, "Vit");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H12L", "M", 12, "Vit");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D12L", "M", 12, "Vit");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H12", "T", 12, "Gul");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D12", "T", 12, "Gul");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H14L", "M", 14, "Gul");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D14L", "M", 14, "Gul");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H14", "T", 14, "Orange");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D14", "T", 14, "Orange");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H16L", "M", 16, "Orange");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D16L", "M", 16, "Orange");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H16", "T", 16, "Lila");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D16", "T", 16, "Lila");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H17-20K", "S", 20, "Lila");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D17-20K", "S", 20, "Lila");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H18E", "E", 18, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D18E", "E", 18, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H18L", "T", 18, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D18L", "T", 18, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H18", "T", 18, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D18", "T", 18, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H18K", "S", 18, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D18K", "S", 18, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H20E", "E", 20, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D20E", "E", 20, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H20L", "T", 20, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D20L", "T", 20, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H20", "T", 20, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D20", "T", 20, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H20K", "S", 20, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D20K", "S", 20, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H21E", "E", 21, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D21E", "E", 21, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H21L", "T", 21, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D21L", "T", 21, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H21", "T", 21, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D21", "T", 21, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H21K", "S", 21, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D21K", "S", 21, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H35", "T", 35, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D35", "T", 35, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H35K", "S", 35, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D35K", "S", 35, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H40", "T", 40, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D40", "T", 40, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H40K", "S", 40, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D40K", "S", 40, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H45", "T", 45, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D45", "T", 45, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H45K", "S", 45, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D45K", "S", 45, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H50", "T", 50, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D50", "T", 50, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H50K", "S", 50, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D50K", "S", 50, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H55", "T", 55, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D55", "T", 55, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H55K", "S", 55, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D55K", "S", 55, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H60", "T", 60, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D60", "T", 60, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H60K", "S", 60, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D60K", "S", 60, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H65", "T", 65, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D65", "T", 65, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H65K", "S", 65, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D65K", "S", 65, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H70", "T", 70, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D70", "T", 70, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H70K", "S", 70, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D70K", "S", 70, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H75", "T", 75, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D75", "T", 75, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H75K", "S", 75, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D75K", "S", 75, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H80", "T", 80, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D80", "T", 80, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H80K", "S", 80, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D80K", "S", 80, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H85", "T", 85, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D85", "T", 85, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H85K", "S", 85, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D85K", "S", 85, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H90", "T", 90, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D90", "T", 90, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H90K", "S", 90, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D90K", "S", 90, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H95", "T", 95, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D95", "T", 95, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H95K", "S", 95, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D95K", "S", 95, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H100", "T", 100, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D100", "T", 100, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H100K", "S", 100, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D100K", "S", 100, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("Ö1", "Ö", 21, "Vit");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("Ö2", "Ö", 21, "Vit");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("Ö3", "Ö", 21, "Gul");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("Ö4", "Ö", 21, "Gul");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("Ö5", "Ö", 21, "Orange");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("Ö6", "Ö", 21, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("Ö7", "Ö", 21, "Blå");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("Ö8", "Ö", 21, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("Ö9", "Ö", 21, "Svart");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H20M", "M", 20, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D20M", "M", 20, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H21M", "M", 21, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D21M", "M", 21, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H35M", "M", 35, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D35M", "M", 35, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H40M", "M", 40, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D40M", "M", 40, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H45M", "M", 45, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D45M", "M", 45, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H50M", "M", 50, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D50M", "M", 50, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H55M", "M", 55, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D55M", "M", 55, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H60M", "M", 60, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D60M", "M", 60, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H65M", "M", 65, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D65M", "M", 65, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H70M", "M", 70, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D70M", "M", 70, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H75M", "M", 75, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D75M", "M", 75, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H80M", "M", 80, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D80M", "M", 80, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H85M", "M", 85, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D85M", "M", 85, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("H90M", "M", 90, "Röd");
INSERT INTO RACE_CLASS_LEVEL (SHORTNAME, CLASSTYPE_SHORTNAME, AGE, DIFFICULTY)
    VALUES ("D90M", "M", 90, "Röd");

CREATE TABLE RACE_CLASS_CLASSIFICATION
(
    CLASS_CLASSIFICATION_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    EVENT_CLASSIFICATION_ID CHAR NOT NULL,
    DESCRIPTION VARCHAR(128) NOT NULL,
    CLASSTYPE_SHORTNAME CHAR,
    AGE_UPPER_LIMIT INT,
    AGE_LOWER_LIMIT INT,
    DECREASE_BASE_POINT INT NOT NULL,
    DECREASE_BASE_1000_POINT INT NOT NULL,
    DECREASE_OLD_BASE_POINT INT NOT NULL,
    PRIMARY KEY (CLASS_CLASSIFICATION_ID),
    INDEX IDX_RACE_CLASS_EVENT_CLASSIFICATION (EVENT_CLASSIFICATION_ID),
    CONSTRAINT FK_RACE_CLASS_EVENT_CLASSIFICATION FOREIGN KEY (EVENT_CLASSIFICATION_ID)
    REFERENCES RACE_EVENT_CLASSIFICATION(EVENT_CLASSIFICATION_ID)
) ENGINE = InnoDB;
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('A', 'Senior', 0, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_LOWER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('A', 'Veteran', 35, 30, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_UPPER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('A', 'Junior', 20, 15, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('B', 'Senior', 0, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_LOWER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('B', 'Veteran', 35, 30, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_UPPER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('B', 'Junior', 20, 15, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_UPPER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('B', 'Ungdom', 16, 30, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('C', 'Senior', 0, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_LOWER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('C', 'Veteran', 35, 20, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_UPPER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('C', 'Junior', 20, 10, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_UPPER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('C', 'Ungdom', 16, 15, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('D', 'Senior', 0, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_LOWER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('D', 'Veteran', 35, 20, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_UPPER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('D', 'Junior', 20, 10, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, AGE_UPPER_LIMIT, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('D', 'Ungdom', 16, 15, 0, 0);0
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('E', 'Huvudklass', 'T', 0, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('E', 'Ej högsta huvudklass', 'S', 25, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('E', 'Motion/Lätt', 'M', 40, 0, 15);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('E', 'Inskolning', 'I', 40, 70, 15);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('E', 'Öppen bana', 'Ö', 40, 70, 20);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('F', 'Elit', 'E', 0, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('F', 'Huvudklass', 'T', 15, 0, 10);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('F', 'Ej högsta huvudklass', 'S', 30, 0, 10);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('F', 'Motion/Lätt', 'M', 45, 0, 25);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('F', 'Inskolning', 'I', 45, 70, 25);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('F', 'Öppen bana', 'Ö', 45, 70, 30);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('G', 'Huvudklass', 'T', 0, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('G', 'Motion/Lätt', 'M', 10, 0, 15);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('G', 'Inskolning', 'I', 10, 30, 15);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('G', 'Öppen bana', 'Ö', 10, 30, 25);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('H', 'Huvudklass', 'T', 0, 0, 0);
INSERT INTO RACE_CLASS_CLASSIFICATION (EVENT_CLASSIFICATION_ID, DESCRIPTION, CLASSTYPE_SHORTNAME, DECREASE_BASE_POINT, DECREASE_BASE_1000_POINT, DECREASE_OLD_BASE_POINT)
    VALUES ('H', 'Övriga klasser', 'Ö', 30, 30, 10);

CREATE TABLE RACE_EVENT
(
    EVENT_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    EVENTOR_ID INT UNSIGNED,
    EVENTOR_RACE_ID INT UNSIGNED,
    NAME VARCHAR(128) NOT NULL,
    ORGANISER_NAME VARCHAR(128) NOT NULL,
    RACEDATE DATE NOT NULL,
    RACETIME DATETIME,
    EVENT_CLASSIFICATION_ID CHAR NOT NULL,
    RACE_LIGHT_CONDITION VARCHAR(32),
    RACE_DISTANCE VARCHAR(32),
    PAYMENT_MODEL INT NOT NULL,
    PRIMARY KEY (EVENT_ID),
    INDEX IDX_RACE_EVENT_CLASSIFICATION (EVENT_CLASSIFICATION_ID),
    CONSTRAINT FK_RACE_EVENT_CLASSIFICATION FOREIGN KEY (EVENT_CLASSIFICATION_ID)
    REFERENCES RACE_EVENT_CLASSIFICATION(EVENT_CLASSIFICATION_ID)
) ENGINE = InnoDB;

CREATE TABLE RACE_EVENT_RESULTS
(
    RESULT_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    EVENT_ID INT UNSIGNED NOT NULL,
    COMPETITOR_ID INT UNSIGNED NOT NULL,
    CLASS_NAME VARCHAR(64) NOT NULL,
    DEVIANT_EVENT_CLASSIFICATION_ID CHAR,
    CLASS_CLASSIFICATION_ID INT UNSIGNED NOT NULL,
    DIFFICULTY VARCHAR(16),
    LENGTH_IN_METER INT,
    FAILED_REASON VARCHAR(64),
    COMPETITOR_TIME TIME,
    WINNER_TIME TIME,
    SECOND_TIME TIME,
    POSITION INT,
    NOF_STARTS_IN_CLASS INT,
    ORIGINAL_FEE DECIMAL(10, 2),
    LATE_FEE DECIMAL(10, 2),
    FEE_TO_CLUB DECIMAL(10, 2),
    AWARD VARCHAR(16),
    POINTS INT,
    POINTS_OLD INT,
    POINTS_1000 INT,
    RANKING DECIMAL(10, 2),
    TEAM_RESULT_ID INT,
    PRIMARY KEY (RESULT_ID),
    INDEX IDX_RACE_EVENT_RESULTS_EVENT (EVENT_ID),
    CONSTRAINT FK_RACE_EVENT_RESULTS_EVENT FOREIGN KEY (EVENT_ID)
    REFERENCES RACE_EVENT(EVENT_ID),
    INDEX IDX_RACE_RESULT_CLASS_CLASSIFICATION (CLASS_CLASSIFICATION_ID),
    CONSTRAINT FK_RACE_RESULT_CLASS_CLASSIFICATION FOREIGN KEY (CLASS_CLASSIFICATION_ID)
    REFERENCES RACE_CLASS_CLASSIFICATION(CLASS_CLASSIFICATION_ID)
) ENGINE = InnoDB;

CREATE TABLE RACE_EVENT_RESULTS_MULTI_DAY
(
    MULTI_DAY_RESULT_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    RESULT_ID INT UNSIGNED NOT NULL,
    COMPETITOR_ID INT UNSIGNED NOT NULL,
    CLASS_NAME VARCHAR(64) NOT NULL,
    LENGTH_IN_METER INT,
    FAILED_REASON VARCHAR(64),
    COMPETITOR_TIME TIME,
    WINNER_TIME TIME,
    SECOND_TIME TIME,
    POSITION INT,
    NOF_STARTS_IN_CLASS INT,
    STAGE INT,
    TOTAL_STAGES INT,
    PRIMARY KEY (MULTI_DAY_RESULT_ID),
    INDEX IDX_RACE_EVENT_RESULTS_MULTI_DAY (RESULT_ID),
    CONSTRAINT FK_RACE_EVENT_RESULTS_MULTI_DAY FOREIGN KEY (RESULT_ID)
    REFERENCES RACE_EVENT_RESULTS(RESULT_ID)
) ENGINE = InnoDB;

CREATE TABLE RACE_EVENT_RESULTS_TEAM
(
    TEAM_RESULT_ID INT UNSIGNED NOT NULL AUTO_INCREMENT,
    EVENT_ID INT UNSIGNED NOT NULL,
    CLASS_NAME VARCHAR(64) NOT NULL,
    CLUB_TEAM_NUMBER INT NOT NULL,
    COMPETITOR_ID INT UNSIGNED NOT NULL,
    LENGTH_IN_METER INT,
    FAILED_REASON VARCHAR(64),
    COMPETITOR_TIME TIME,
    WINNER_TIME TIME,
    SECOND_TIME TIME,
    POSITION INT,
    NOF_STARTS_IN_CLASS INT,
    STAGE INT,
    TOTAL_STAGES INT,
    DEVIANT_RACE_LIGHT_CONDITION VARCHAR(32),
    PRIMARY KEY (TEAM_RESULT_ID),
    INDEX IDX_RACE_EVENT_RESULTS_TEAM_EVENT (EVENT_ID),
    CONSTRAINT FK_RACE_EVENT_RESULTS_TEAM_EVENT FOREIGN KEY (EVENT_ID)
    REFERENCES RACE_EVENT(EVENT_ID)
) ENGINE = InnoDB;
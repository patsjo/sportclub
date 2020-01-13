import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LngDetector from "i18next-browser-languagedetector";

i18next
  .use(LngDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    interpolation: {
      // React already does escaping
      escapeValue: false
    },
    fallbackLng: "en",
    whitelist: ["en", "sv"],
    load: "languageOnly",
    // ns: ["common"],
    // defaultNS: "common",
    detection: {
      // order and from where user language should be detected
      order: ["querystring", "localStorage", "navigator"],

      // keys or params to lookup language from
      lookupQuerystring: "lng",
      lookupLocalStorage: "i18nextLng",

      // cache user language on
      caches: ["localStorage"],
      excludeCacheFor: ["cimode"]
    },
    resources: {
      en: {
        translation: {
          common: {
            Menu: "Menu",
            Close: "Close",
            Delete: "Delete",
            Edit: "Edit",
            Save: "Save",
            Cancel: "Cancel",
            Confirm: "Are you sure?",
            Login: "Login",
            Logout: "Logout",
            Upload: "Click or drag file to this area to upload",
            Username: "Username",
            Password: "Password",
            RememberLogin: "Remember me",
            OldHomePage: "Old homepage",
            Yes: "Yes",
            No: "No",
            Previous: "Previous",
            Next: "Next"
          },
          error: {
            Missing: "MISSING",
            FileTypeNotSupported: "Filetype not supported",
            FileSizeTooLarge: "File is larger than {0} MB",
            RequiredField: "Please input your"
          },
          modules: {
            Home: "Home",
            News: "News",
            Calendar: "Calendar",
            ScoringBoard: "ScoringBoard",
            Eventor: "Eventor",
            Results: "Results",
            Address: "Address",
            Photo: "Photo"
          },
          news: {
            Add: "Add",
            Edit: "Edit news",
            ExpireDate: "Sista dag som nyheten visas",
            Educations: "Educations",
            Header: "Header",
            Link: "Link",
            LongTimeNews: "News (prioritized)",
            Introduction: "Introduction text",
            Text: "Text"
          },
          results: {
            Add: "Get result from Eventor",
            AddCompetitor: "Add competitor",
            Edit: "Edit",
            Convert: "Convert old results from GIK-programmet",
            Latest: "Latest processed",
            Individual: "Individual",
            Team: "Team",
            Step0Input: "Datum mm",
            Step1ChooseRace: "Choose race",
            Step2EditRace: "Edit race",
            Step3Ranking: "Ranking",
            DefaultFee0And100IfNotStarted: "Fee 0%, and 100% if not started the race",
            DefaultFee0And100IfNotFinished: "Fee 0%, and 100% if not finished the race",
            DefaultFee50And100IfNotFinished: "Fee 50%, and 100% if not finished the race",
            DefaultFeePaidByCompetitor: "Fee already paid by competitor",
            QueryDateRange: "Query date range",
            QueryIncludeExisting: "Include already saved races",
            ExistInEventor: "Race exists in eventor",
            Date: "Date",
            Time: "Time",
            Name: "Event name",
            AlreadySaved: "Already saved",
            Club: "Club",
            ModalTitleMapCompetitor: "Map/add competitor",
            MapCompetitor: "Map competitor",
            Competitor: "Competitor",
            FirstName: "First name",
            LastName: "Last name",
            BirthDay: "BirthDay",
            StartDate: "Active member since",
            Class: "Class",
            ClassClassification: "Class type",
            LengthInMeter: "Length [m]",
            FailedReason: "Reason without time",
            NotStarted: "Not started",
            NotFinished: "Not finished",
            Finished: "Finished",
            WinnerTime: "Winner time",
            SecondTime: "Second time",
            Position: "Position",
            NofStartsInClass: "Starts",
            EventFee: "Event fee",
            OriginalFee: "Original event fee",
            LateFee: "Late event fee",
            FeeToClub: "Fee to club",
            EventClassification: "Event type",
            DeviantEventClassification: "Deviant event type",
            RaceLightCondition: "Light condition",
            Day: "Day",
            Night: "Night",
            RaceDistance: "Distance",
            Sprint: "Sprint",
            Middle: "Middle",
            Long: "Long",
            UltraLong: "Ultra long",
            Relay: " relay",
            PaymentModel: "Payment model",
            Difficulty: "Difficulty",
            WinnerTimeLessOrEqualThanTime: "Winner time <= time",
            SecondTimeGreaterOrEqualThanWinnerTime: "Second time >= winner time",
            PositionGreaterThanStarts: "Position > starts",
            MeetsAwardRequirements: "Meets SOFT requirements for award",
            Area: "Area",
            TimePerKilometer: "Speed [min/km]",
            Ranking: "Ranking"
          },
          eventor: {
            Participant: "Participant"
          }
        }
      },
      sv: {
        translation: {
          common: {
            Menu: "Meny",
            Close: "Stäng",
            Delete: "Ta bort",
            Edit: "Redigera",
            Save: "Spara",
            Cancel: "Avbryt",
            Confirm: "Är du säker?",
            Login: "Logga in",
            Logout: "Logga ut",
            Upload: "Klicka här eller dra en fil hit för att ladda upp",
            Username: "Användare",
            Password: "Lösenord",
            RememberLogin: "Kom ihåg mig",
            OldHomePage: "Gamla hemsidan",
            Yes: "Ja",
            No: "Nej",
            Previous: "Tillbaka",
            Next: "Nästa"
          },
          error: {
            Missing: "SAKNAS",
            FileTypeNotSupported: "Denna filtyp kan inte laddas upp",
            FileSizeTooLarge: "Filen är större än {0} MB",
            RequiredField: "Vänligen ange"
          },
          modules: {
            Home: "Startsida",
            News: "Nyheter",
            Calendar: "Kalender",
            ScoringBoard: "Poängliga",
            Eventor: "Eventor",
            Results: "Resultat",
            Address: "Adress",
            Photo: "Foto"
          },
          news: {
            Add: "Lägg till",
            Edit: "Redigera nyhet",
            Educations: "Utbildningar",
            ExpireDate: "Sista dag som nyheten visas",
            Header: "Rubrik",
            Link: "Länk",
            LongTimeNews: "Nyheter (prioriterad)",
            Introduction: "Inledande text",
            Text: "Brödtext"
          },
          results: {
            Add: "Hämta resultat från Eventor",
            AddCompetitor: "Lägg till löpare",
            Edit: "Ändra",
            Convert: "Konvertera gamla resultat från GIK-programmet",
            Latest: "Senast bearbetade klubbresultat",
            Individual: "Personligt resultat",
            Team: "Lag resultat",
            Step0Input: "Datum mm",
            Step1ChooseRace: "Välj tävling",
            Step2EditRace: "Redigera",
            Step3Ranking: "Ranking",
            DefaultFee0And100IfNotStarted: "Avgift 0%, och 100% vid ej start",
            DefaultFee0And100IfNotFinished: "Avgift 0%, och 100% vid ej fullföljt",
            DefaultFee50And100IfNotFinished: "Avgift 50%, och 100% vid ej fullföljt",
            DefaultFeePaidByCompetitor: "Avgifter redan betald av löparen",
            QueryDateRange: "Sökperiod",
            QueryIncludeExisting: "Ta med redan sparade i sökningen",
            ExistInEventor: "Tävlingen finns i eventor",
            Date: "Datum",
            Time: "Tid",
            Name: "Tävlingens namn",
            AlreadySaved: "Redan sparad",
            Club: "Klubb",
            ModalTitleMapCompetitor: "Koppla/lägg till löpare",
            MapCompetitor: "Koppla löpare",
            Competitor: "Löpare",
            FirstName: "Förnamn",
            LastName: "Efternamn",
            BirthDay: "Födelsedag",
            StartDate: "Aktiv medlem sedan",
            Class: "Klass",
            ClassClassification: "Typ av klass",
            LengthInMeter: "Längd [m]",
            FailedReason: "Orsak utan tid",
            NotStarted: "Ej start",
            NotFinished: "Utgått",
            Finished: "Fullföljt",
            WinnerTime: "Segratid",
            SecondTime: "Tvåans tid",
            Position: "Placering",
            NofStartsInClass: "Startande",
            EventFee: "Tävlingsavgift",
            OriginalFee: "Anmälningsavgift",
            LateFee: "Efteranmälningsavgift",
            FeeToClub: "Avgift till klubben",
            EventClassification: "Tävlingstyp",
            DeviantEventClassification: "Avvikande tävlingstyp",
            RaceLightCondition: "Ljusförhållanden",
            Day: "Dag",
            Night: "Natt",
            RaceDistance: "Distans",
            Sprint: "Sprint",
            Middle: "Medel",
            Long: "Lång",
            UltraLong: "Ultra lång",
            Relay: "stafett",
            PaymentModel: "Betalningsmodell",
            Difficulty: "Nivå",
            WinnerTimeLessOrEqualThanTime: "Segratid <= tid",
            SecondTimeGreaterOrEqualThanWinnerTime: "Tvåans tid >= segratid",
            PositionGreaterThanStarts: "Placering > startande",
            MeetsAwardRequirements: "SOFT märkesgrundande",
            Area: "Terrängtyp",
            TimePerKilometer: "Fart [min/km]",
            Ranking: "Ranking"
          },
          eventor: {
            Participant: "Anmäld"
          }
        }
      }
    }
  });

export default i18next;

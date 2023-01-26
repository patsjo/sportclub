import i18next from 'i18next';
import LngDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

i18next
  .use(LngDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    //interpolation: {
    // React already does escaping
    //escapeValue: false,
    //},
    fallbackLng: 'en',
    //whitelist: ['en', 'sv'],
    load: 'languageOnly',
    // ns: ["common"],
    // defaultNS: "common",
    detection: {
      // order and from where user language should be detected
      order: ['querystring', 'localStorage', 'navigator'],

      // keys or params to lookup language from
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',

      // cache user language on
      caches: ['localStorage'],
      excludeCacheFor: ['cimode'],
    },
    resources: {
      en: {
        translation: {
          common: {
            Menu: 'Menu',
            Close: 'Close',
            Delete: 'Delete',
            DeleteAll: 'Delete the entire serie',
            Edit: 'Edit',
            Save: 'Save',
            SaveAndNextEvent: 'Save and next event',
            Cancel: 'Cancel',
            Confirm: 'Are you sure?',
            Login: 'Login',
            Logout: 'Logout',
            Upload: 'Click or drag file to this area to upload',
            Username: 'Username',
            Password: 'Password',
            RememberLogin: 'Remember me',
            OldHomePage: 'Old homepage',
            Yes: 'Yes',
            No: 'No',
            Previous: 'Previous',
            Next: 'Next',
            Of: 'of',
            OurSponsors: 'Our sponsors',
            Table: 'Table',
            PDF: 'PDF',
            Portrait: 'Portrait',
            Landscape: 'Landscape',
            All: 'All',
            AllInOnePdf: 'All in one pdf',
            AllDividedInZip: 'Divided into many PDF (ZIP)',
            MarginsLabel: 'Margins [left, top, right, bottom]:',
            Skip: 'Skip',
          },
          calendar: {
            Calendar: 'Calendar',
            EventSelector: 'Select events',
            SelectYear: 'Select year',
            Year: 'Year',
            Week: 'Week',
            DayOfWeek1: 'Monday',
            DayOfWeek2: 'Tuesday',
            DayOfWeek3: 'Wednesday',
            DayOfWeek4: 'Thursday',
            DayOfWeek5: 'Friday',
            DayOfWeek6: 'Saturday',
            DayOfWeek7: 'Sunday',
            Month1: 'January',
            Month2: 'February',
            Month3: 'March',
            Month4: 'April',
            Month5: 'May',
            Month6: 'June',
            Month7: 'July',
            Month8: 'August',
            Month9: 'September',
            Month10: 'October',
            Month11: 'November',
            Month12: 'December',
            Add: 'Add activity',
            Edit: 'Edit activity',
            ActivityType: 'Activity type',
            Group: 'Group',
            Header: 'Header',
            ActivityDay: 'Date',
            ActivityTime: 'Time',
            Place: 'Place',
            Description: 'Description',
            Url: 'Url',
            Responsible: 'Responsible',
            DurationMinutes: 'Duration [minutes]',
            IsRepeating: 'Is repeating',
            RepeatingDates: 'Repeating weeks',
            RepeatingModified: 'Change only this',
          },
          error: {
            Missing: 'MISSING',
            FileTypeNotSupported: 'Filetype not supported',
            FileSizeTooLarge: 'File is larger than {0} MB',
            RequiredField: 'Please input your',
            WarningIncludeAll: 'No filter on',
          },
          map: {
            Map: 'map',
            Loading: 'Loading',
            SelectPosition: 'Click in map to select position',
            ChooseMapPosition: 'Choose in map',
            Longitude: 'Longitude',
            Latitude: 'Latitude',
            ClickForDirection: 'Click for direction',
            GoToFullExtent: 'Zoom to layer',
            Speed: 'Speed',
            GPSAccuracy: 'GPS accuracy',
          },
          modules: {
            Home: 'Home',
            News: 'News',
            Calendar: 'Calendar',
            ScoringBoard: 'Club leagues',
            Stars: 'Stars',
            Eventor: 'Eventor',
            Results: 'Results',
            Users: 'Club members',
            Photo: 'Photo',
            HtmlEditor: 'Make new page',
          },
          news: {
            Add: 'Add',
            Banner: 'Banner',
            Edit: 'Edit news',
            ExpireDate: 'Sista dag som nyheten visas',
            Educations: 'Educations',
            Header: 'Header',
            Link: 'Link',
            LongTimeNews: 'News (prioritized)',
            Introduction: 'Introduction text',
            Text: 'Text',
            UpdateModificationDate: 'Update modification date',
          },
          users: {
            BirthDay: 'Birthday',
            FirstName: 'First name',
            LastName: 'Last name',
            Address: 'Address',
            Zip: 'Zip',
            City: 'City',
            Email: 'Email',
            PhoneNo: 'Phone',
            MobilePhoneNo: 'Mobile',
            WorkPhoneNo: 'Work phone',
            Council: 'Council',
            Responsibility: 'Responsibility',
            Groups: 'Groups',
          },
          competitor: {
            Info: 'Rules behind the stars',
            Achievements: 'Achievements',
            Senior: 'Senior',
            Junior: 'Junior',
            Youth: 'Youth',
            FavoriteDistance: 'Favorite distance',
            StarsRank: 'Overall',
            StarsTechnical: 'Technical',
            StarsSpeed: 'Speed',
            StarsRelay: 'Relay compared to Individual',
            StarsImportant: 'Best when it counts',
            StarsStability: 'Stability',
            StarsNight: 'Night compared to day',
            StarsShape: 'Current shape compared to normal shape',
            Edit: 'Edit competitor achievements',
          },
          results: {
            Leg: 'Leg',
            Add: 'Import/Add/Edit',
            AddCompetitor: 'Add competitor',
            Edit: 'Edit',
            Convert: 'Convert old results from GIK-programmet',
            Latest: 'Club result',
            Individual: 'Individual result',
            Team: 'Team',
            Step0Input: 'Datum mm',
            Step1ChooseRace: 'Choose race',
            Step2EditRace: 'Edit race',
            Step3Ranking: 'Ranking',
            DefaultFee0And100IfNotStarted: 'Fee 0%, and 100% if not started the race',
            DefaultFee0And100IfNotFinished: 'Fee 0%, and 100% if not finished the race',
            DefaultFee50And100IfNotStarted: 'Fee 50%, and 100% if not started the race (Free elite and up to 20)',
            DefaultFee50And100IfNotFinished: 'Fee 50%, and 100% if not finished the race (Free elite and up to 20)',
            DefaultFeePaidByCompetitor: 'Fee already paid by competitor',
            QueryStartDate: 'Query from date',
            QueryEndDate: 'Query to date',
            QueryDateRange: 'Query date range',
            QueryIncludeExisting: 'Include already saved races',
            QueryForEventWithNoEntry: 'Query for event with no entry (Takes long time because bad API in eventor)',
            QueryForCompetitorWithNoClub:
              'Include competitors with no club (A popup for each to include/exclude. Sometimes the organizer do not connect the club for direct entries.)',
            MaxDistanceNational: 'Only show national events within [km]',
            MaxDistanceDistrict: 'Only show regional events within [km]',
            MaxDistanceNearbyAndClub: 'Only show local and club events within [km]',
            ImportEventExistInEventor: 'Edit existing or import race that exists in eventor',
            ExistInEventor: 'Exists in eventor',
            Date: 'Date',
            Time: 'Time',
            Name: 'Event name',
            AlreadySaved: 'Already saved',
            Club: 'Club',
            ModalTitleMapCompetitor: 'Map/add competitor',
            MapCompetitor: 'Map competitor',
            Competitor: 'Competitor',
            FirstName: 'First name',
            LastName: 'Last name',
            BirthDay: 'BirthDay',
            StartDate: 'Active member since',
            Class: 'Class',
            ClassClassification: 'Class type',
            LengthInMeter: 'Length [m]',
            FailedReason: 'Reason without time',
            NotStarted: 'Not started',
            NotFinished: 'Not finished',
            Finished: 'Finished',
            WinnerTime: 'Winner time',
            SecondTime: 'Second time',
            Position: 'Position',
            NofStartsInClass: 'Starts',
            EventFee: 'Event fee',
            OriginalFee: 'Original event fee',
            LateFee: 'Late event fee',
            FeeToClub: 'Fee to clubmember',
            ServiceFeeToClub: 'Servicefee to clubmember',
            ServiceFeeDescription: 'Description',
            TotalFeeToClub: 'Total fee to clubmember',
            EventClassification: 'Event type',
            DeviantEventClassification: 'Deviant event type',
            RaceLightCondition: 'Light condition',
            Day: 'Day',
            Night: 'Night',
            Dusk: 'Dusk',
            Dawn: 'Dawn',
            RaceDistance: 'Distance',
            Sprint: 'Sprint',
            Middle: 'Middle',
            Long: 'Long',
            UltraLong: 'Ultra long',
            Relay: ' relay',
            IsRelay: 'Relay',
            PaymentModel: 'Payment model',
            Difficulty: 'Difficulty',
            WinnerTimeLessOrEqualThanTime: 'Winner time < time',
            SecondTimeGreaterOrEqualThanWinnerTime: 'Second time < winner time',
            PositionGreaterThanStarts: 'Position > starts',
            StageGreaterThanTotalStages: 'Stage > total stages',
            MeetsAwardRequirements: 'Meets SOFT requirements for award',
            Award: 'Award',
            Area: 'Area',
            TimePerKilometer: 'Speed [min/km]',
            Ranking: 'Ranking',
            Sport: 'Sport',
            MissingTime: 'Missing time',
            RankingLeague: 'Ranking',
            RankingRelayLeague: 'Relay ranking',
            RankingSpeedLeague: 'Speed ranking',
            RankingTechnicalLeague: 'Technical ranking',
            Points1000League: 'Run to 1000',
            PointsLeague: 'Points league',
            PointsOldLeague: 'Old points League',
            GrandSlam: 'Grand slam',
            Total: 'Total',
            CurrentSeason: 'Current season',
            Overwrite: 'Fetch new data from eventor',
            Longitude: 'Longitude',
            Latitude: 'Latitude',
            DistanceKm: 'Distance [km]',
            Stage: 'Stage',
            TotalStages: 'Total stages',
            DeltaPositions: 'Delta positions',
            DeltaTimeBehind: 'Delta time behind',
            DeviantRaceLightCondition: 'Deviant light condition',
            TotalStagePosition: 'Total stage position',
            TotalStageTimeBehind: 'Total stage time behind',
            TotalPosition: 'Team position',
            TotalNofStartsInClass: 'Starts in class',
            TotalTimeBehind: 'Team time behind',
            TeamFailedReason: 'Team failed reason',
            TeamName: 'Team name',
            InvoiceVerifier: 'Invoice verifier',
            InvoiceAlreadyVerified: 'Invoice verified',
            TotalNofStarts: 'Starts',
            Gender: 'Gender',
            FeMale: 'Female',
            Male: 'Male',
            Renounce: 'Renounce result service',
            RenounceBullet1: 'I do not want my results to be visible on the clubs website',
            RenounceBullet2: 'I will not be in any of our leagues',
            RenounceBullet3:
              'The decision is valid until further notice (it is possible to regret it after 30 days, but the old results will remain hidden)',
            RenounceBullet4:
              'Only the coach still has the opportunity to see my results, to be able to make fair team selections',
            RenounceConfirm: 'I have read the above and understand the meaning',
            RegretRenounce: 'Regret renounce result service',
            AddWithoutEventor: 'Add (Do not exist in eventor)',
            KnownEventorId: 'Known Eventor Id',
            Statistics: 'Statistics',
          },
          eventor: {
            Participant: 'Participant',
            Startlist: 'Startlist',
            Result: 'Result',
          },
          htmlEditor: {
            MenuLink: 'Create meny link',
            Path: 'Menu path',
            Url: 'Url',
            Groups: 'Authority groups needed to view the page',
            CopyUrl: 'Copy url',
            NoUrlError: 'This should not be a url. Should be like "/path1/path2/item"',
            DoubleSlashError: 'Double "//" not allowed. Should be like "/path1/path2/item"',
            FormatError: 'Must start with a "/", and can\'t end with a "/". Should be like "/path1/path2/item"',
            MenuLinkHelpText: 'Remove, by empty one of the fields above',
          },
          chart: {
            startsPerYear: 'Starts per year',
            individual: 'Individual',
            relay: 'Relay',
            competitorsPerAgespan: 'Competitors per agespan',
            boy: 'Boys -16 years',
            girl: 'Girls -16 years',
            juniorman: 'Man 17-20 years',
            juniorwoman: 'Woman 17-20 years',
            man: 'Man 21-64 years',
            woman: 'Woman 21-64 years',
            oldman: 'Man 65+ years',
            oldwoman: 'Woman 65+ years',
            startsPerSportAndDistance: 'Starts per sport/distance',
            ultralong: 'Ultralong',
            long: 'Long',
            night: 'Night',
            middle: 'Middle',
            sprint: 'Sprint',
            skio: 'Ski-O',
            mtbo: 'MTB-O',
            indoor: 'Indoor-O',
            preo: 'Pre-O',
            other: 'Other',
            otherrelay: 'Other relay',
            kmPerLevel: 'KM per level',
            green: 'Green',
            white: 'White',
            yellow: 'Yellow',
            orange: 'Orange',
            red: 'Red',
            purple: 'Purple',
            blue: 'Blue',
            black: 'Black',
            championchips: 'WOC, EOC, NordicOC, Worldcup, SOC (not SOC-ultralong, Masters)',
            gold: 'Gold',
            silver: 'Silver',
            bronze: 'Bronze',
            top10: 'Top 10',
            top30: 'Top 30',
          },
        },
      },
      sv: {
        translation: {
          common: {
            Menu: 'Meny',
            Close: 'Stäng',
            Delete: 'Ta bort',
            DeleteAll: 'Ta bort hela serien',
            Edit: 'Redigera',
            Save: 'Spara',
            SaveAndNextEvent: 'Spara och nästa tävling',
            Cancel: 'Avbryt',
            Confirm: 'Är du säker?',
            Login: 'Logga in',
            Logout: 'Logga ut',
            Upload: 'Klicka här eller dra en fil hit för att ladda upp',
            Username: 'Användare',
            Password: 'Lösenord',
            RememberLogin: 'Kom ihåg mig',
            OldHomePage: 'Gamla hemsidan',
            Yes: 'Ja',
            No: 'Nej',
            Previous: 'Tillbaka',
            Next: 'Nästa',
            Of: 'av',
            OurSponsors: 'Våra sponsorer',
            Table: 'Tabell',
            PDF: 'PDF',
            Portrait: 'Stående',
            Landscape: 'Liggande',
            All: 'Alla',
            AllInOnePdf: 'Alla i en stor pdf',
            AllDividedInZip: 'Uppdelat i flera PDF (ZIP)',
            MarginsLabel: 'Marginaler [vänster, överkant, höger, nederkant]:',
            Skip: 'Hoppa över',
          },
          calendar: {
            Calendar: 'Kalender',
            EventSelector: 'Välj tävlingar',
            SelectYear: 'Välj år',
            Year: 'År',
            Week: 'Vecka',
            DayOfWeek1: 'Måndag',
            DayOfWeek2: 'Tisdag',
            DayOfWeek3: 'Onsdag',
            DayOfWeek4: 'Torsdag',
            DayOfWeek5: 'Fredag',
            DayOfWeek6: 'Lördag',
            DayOfWeek7: 'Söndag',
            Month1: 'Januari',
            Month2: 'Februari',
            Month3: 'Mars',
            Month4: 'April',
            Month5: 'Maj',
            Month6: 'Juni',
            Month7: 'Juli',
            Month8: 'Augusti',
            Month9: 'September',
            Month10: 'Oktober',
            Month11: 'November',
            Month12: 'December',
            Add: 'Lägg till aktivitet',
            Edit: 'Redigera aktivitet',
            ActivityType: 'Typ av aktivitet',
            Group: 'Grupp',
            Header: 'Rubrik',
            ActivityDay: 'Datum',
            ActivityTime: 'Tid',
            Place: 'Plats',
            Description: 'Beskrivning',
            Url: 'Url',
            Responsible: 'Ansvarig',
            DurationMinutes: 'Varar i [minuter]',
            IsRepeating: 'Återkommande',
            RepeatingDates: 'Återkommande veckor',
            RepeatingModified: 'Ändra endast denna',
          },
          error: {
            Missing: 'SAKNAS',
            FileTypeNotSupported: 'Denna filtyp kan inte laddas upp',
            FileSizeTooLarge: 'Filen är större än {0} MB',
            RequiredField: 'Vänligen ange',
            WarningIncludeAll: 'Ingen filtrering på',
          },
          map: {
            Map: 'karta',
            Loading: 'Laddar',
            SelectPosition: 'Klicka i kartan för att välja position',
            ChooseMapPosition: 'Välj i karta',
            Longitude: 'Longitud',
            Latitude: 'Latitud',
            ClickForDirection: 'Klicka för vägbeskrivning',
            GoToFullExtent: 'Zooma till lager',
            Speed: 'Hastighet',
            GPSAccuracy: 'GPS noggrannhet',
          },
          modules: {
            Home: 'Startsida',
            News: 'Nyheter',
            Calendar: 'Kalender',
            ScoringBoard: 'Klubbligor',
            Stars: 'Stjärnorna',
            Eventor: 'Eventor',
            Results: 'Resultat',
            Users: 'Klubbmedlemmar',
            Photo: 'Foto',
            HtmlEditor: 'Skapa ny sida',
          },
          news: {
            Add: 'Lägg till',
            Banner: 'Banner',
            Edit: 'Redigera nyhet',
            Educations: 'Utbildningar',
            ExpireDate: 'Sista dag som nyheten visas',
            Header: 'Rubrik',
            Link: 'Länk',
            LongTimeNews: 'Nyheter (prioriterad)',
            Introduction: 'Inledande text',
            Text: 'Brödtext',
            UpdateModificationDate: 'Uppdatera senaste ändringsdatum',
          },
          users: {
            BirthDay: 'Födelsedag',
            FirstName: 'Förnamn',
            LastName: 'Efternamn',
            Address: 'Gatuadress',
            Zip: 'Postnr',
            City: 'Ort',
            Email: 'Email',
            PhoneNo: 'Telefon',
            MobilePhoneNo: 'Mobil',
            WorkPhoneNo: 'Arbete',
            Council: 'Styrelse',
            Responsibility: 'Ansvarsområde',
            Groups: 'Grupper',
          },
          competitor: {
            Info: 'Regelverk bakom stjärnorna',
            Achievements: 'Meriter',
            Senior: 'Senior',
            Junior: 'Junior',
            Youth: 'Ungdom',
            FavoriteDistance: 'Favoritdistans',
            StarsRank: 'Totalt',
            StarsTechnical: 'Orienteringsteknik',
            StarsSpeed: 'Löphastighet',
            StarsRelay: 'Stafett i jämförelse med individuellt',
            StarsImportant: 'Bäst när det gäller',
            StarsStability: 'Stabilitet',
            StarsNight: 'Natt i jämförelse med dag',
            StarsShape: 'Nuvarande form jämfört med förut',
            Edit: 'Redigera löparmeriter',
          },
          results: {
            Leg: 'Str',
            Add: 'Importera/Lägg till/Redigera',
            AddCompetitor: 'Lägg till löpare',
            Edit: 'Ändra',
            Convert: 'Konvertera gamla resultat från GIK-programmet',
            Latest: 'Klubbresultat',
            Individual: 'Personligt resultat',
            Team: 'Lag resultat',
            Step0Input: 'Datum mm',
            Step1ChooseRace: 'Välj tävling',
            Step2EditRace: 'Redigera',
            Step3Ranking: 'Ranking',
            DefaultFee0And100IfNotStarted: 'Avgift 0%, och 100% vid ej start',
            DefaultFee0And100IfNotFinished: 'Avgift 0%, och 100% vid ej fullföljt',
            DefaultFee50And100IfNotStarted: 'Avgift 50%, och 100% vid ej start (Fri elitklass och upp till 20)',
            DefaultFee50And100IfNotFinished: 'Avgift 50%, och 100% vid ej fullföljt (Fri elitklass och upp till 20)',
            DefaultFeePaidByCompetitor: 'Avgifter redan betald av löparen',
            QueryDateRange: 'Datumintervall',
            QueryStartDate: 'Sök från datum',
            QueryEndDate: 'Sök till datum',
            QueryIncludeExisting: 'Ta med redan sparade i sökningen',
            QueryForEventWithNoEntry:
              'Sök även efter tävlingar med bara direktanmälningar (Tar lång tid pga dåligt API i eventor)',
            QueryForCompetitorWithNoClub:
              'Inkludera tävlande utan klubb (En popup för varje att inkludera/utesluta. Ibland kopplar inte arrangören klubben för direktanmälningar.)',
            ImportEventExistInEventor: 'Redigera eller importera tävling som finns i eventor',
            MaxDistanceNational: 'Visa endast nationella tävlingar inom [km]',
            MaxDistanceDistrict: 'Visa endast distriktstävlingar inom [km]',
            MaxDistanceNearbyAndClub: 'Visa endast när- och klubbtävlingar inom [km]',
            ExistInEventor: 'Finns i eventor',
            Date: 'Datum',
            Time: 'Tid',
            Name: 'Tävlingens namn',
            AlreadySaved: 'Redan sparad',
            Club: 'Klubb',
            ModalTitleMapCompetitor: 'Koppla/lägg till löpare',
            MapCompetitor: 'Koppla löpare',
            Competitor: 'Löpare',
            FirstName: 'Förnamn',
            LastName: 'Efternamn',
            BirthDay: 'Födelsedag',
            StartDate: 'Aktiv medlem sedan',
            Class: 'Klass',
            ClassClassification: 'Typ av klass',
            LengthInMeter: 'Längd [m]',
            FailedReason: 'Orsak utan tid',
            NotStarted: 'Ej start',
            NotFinished: 'Utgått',
            Finished: 'Fullföljt',
            WinnerTime: 'Segratid',
            SecondTime: 'Tvåans tid',
            Position: 'Placering',
            NofStartsInClass: 'Startande',
            EventFee: 'Tävlingsavgift',
            OriginalFee: 'Anmälningsavgift',
            LateFee: 'Efteranmälningsavgift',
            FeeToClub: 'Avgift till klubbmedlem',
            ServiceFeeToClub: 'Tjänsteavgift till klubbmedlem',
            ServiceFeeDescription: 'Beskrivning',
            TotalFeeToClub: 'Total avgift till klubbmedlem',
            EventClassification: 'Tävlingstyp',
            DeviantEventClassification: 'Avvikande tävlingstyp',
            RaceLightCondition: 'Ljusförhållanden',
            Day: 'Dag',
            Night: 'Natt',
            Dusk: 'Skymning',
            Dawn: 'Gryning',
            RaceDistance: 'Distans',
            Sprint: 'Sprint',
            Middle: 'Medel',
            Long: 'Lång',
            UltraLong: 'Ultra lång',
            Relay: 'stafett',
            IsRelay: 'Stafett',
            PaymentModel: 'Betalningsmodell',
            Difficulty: 'Nivå',
            WinnerTimeLessOrEqualThanTime: 'Segratid < tid',
            SecondTimeGreaterOrEqualThanWinnerTime: 'Tvåans tid < segratid',
            PositionGreaterThanStarts: 'Placering > startande',
            StageGreaterThanTotalStages: 'Sträcka > antal sträckor',
            MeetsAwardRequirements: 'SOFT märkesgrundande',
            Award: 'Märke',
            Area: 'Terrängtyp',
            TimePerKilometer: 'Fart [min/km]',
            Ranking: 'Ranking',
            Sport: 'Idrott',
            MissingTime: 'Bomtid',
            RankingLeague: 'Ranking',
            RankingRelayLeague: 'Stafettranking',
            RankingSpeedLeague: 'Löphastighetsranking',
            RankingTechnicalLeague: 'Teknikranking',
            Points1000League: 'Spring till 1000',
            PointsLeague: 'Poängligan',
            PointsOldLeague: 'Gamla poängligan',
            GrandSlam: 'Grand slam',
            Total: 'Totalt',
            CurrentSeason: 'Senaste året',
            Overwrite: 'Hämta ny data från eventor',
            Longitude: 'Longitud',
            Latitude: 'Latitud',
            DistanceKm: 'Avstånd [km]',
            Stage: 'Sträcka',
            TotalStages: 'Antal sträckor',
            DeltaPositions: 'Tappade placeringar',
            DeltaTimeBehind: 'Tappad tid',
            DeviantRaceLightCondition: 'Avvikande ljusförhållanden',
            TotalStagePosition: 'Placering vid växling',
            TotalStageTimeBehind: 'Tid efter vid växling',
            TotalPosition: 'Lagets placering totalt',
            TotalNofStartsInClass: 'Startande lag',
            TotalTimeBehind: 'Lagets tid efter',
            TeamFailedReason: 'Lag orsak utan tid',
            TeamName: 'Lagnamn',
            InvoiceVerifier: 'Kontroll av faktura',
            InvoiceAlreadyVerified: 'Faktura kontrollerad',
            TotalNofStarts: 'Antal starter',
            Gender: 'Kön',
            FeMale: 'Dam',
            Male: 'Herr',
            Renounce: 'Avstår resulatservice',
            RenounceBullet1: 'Jag vill inte att mina resultat syns på klubbens hemsida',
            RenounceBullet2: 'Jag kommer inte finnas med i någon av våra ligor',
            RenounceBullet3:
              'Beslutet gäller tillsvidare (möjliget finns att ångra efter 30 dagar, men de gamla resultaten kommer förbli dolda)',
            RenounceBullet4:
              'Endast UK har fortfarande möjlighet att se mina resultat, för att kunna göra rättvisa laguttagningar',
            RenounceConfirm: 'Jag har läst ovanstående och förstår innebörden',
            RegretRenounce: 'Ångrar avstår resulatservice',
            AddWithoutEventor: 'Lägg till (ej i eventor)',
            KnownEventorId: 'Känt Eventor Id',
            Statistics: 'Statistik',
          },
          eventor: {
            Participant: 'Anmäld',
            Startlist: 'Startlista',
            Result: 'Resultat',
          },
          htmlEditor: {
            MenuLink: 'Skapa menylänk',
            Path: 'Meny',
            Url: 'Url',
            Groups: 'Behörighetsgrupper för att kunna visa sidan',
            CopyUrl: 'Kopiera url',
            NoUrlError: 'Ska inte vara en URL. Skriv på formatet "/mapp1/mapp2/namn"',
            DoubleSlashError: 'Dubbla "//" ej tillåtet. Skriv på formatet "/mapp1/mapp2/namn"',
            FormatError: 'Måste börja med "/", men får inte sluta med "/". Skriv på formatet "/mapp1/mapp2/namn"',
            MenuLinkHelpText: 'Ta bort, genom att radera ett av fälten ovan',
          },
          chart: {
            startsPerYear: 'Antal starter per år',
            individual: 'Individuell',
            relay: 'Stafett',
            competitorsPerAgespan: 'Antal aktiva per kön i olika åldrar',
            boy: 'Pojkar -16 år',
            girl: 'Tjejer -16 år',
            juniorman: 'Man 17-20 år',
            juniorwoman: 'Kvinna 17-20 år',
            man: 'Man 21-64 år',
            woman: 'Kvinna 21-64 år',
            oldman: 'Man 65+ år',
            oldwoman: 'Kvinna 65+ år',
            startsPerSportAndDistance: 'Antal starter per sport/distans',
            ultralong: 'Ultralång',
            long: 'Lång',
            night: 'Natt',
            middle: 'Medel',
            sprint: 'Sprint',
            skio: 'Ski-O',
            mtbo: 'MTB-O',
            indoor: 'Indoor-O',
            preo: 'Pre-O',
            other: 'Övriga',
            otherrelay: 'Övrig stafett',
            kmPerLevel: 'KM per nivå',
            green: 'Grön',
            white: 'Vit',
            yellow: 'Gul',
            orange: 'Orange',
            red: 'Röd',
            purple: 'Lila',
            blue: 'Blå',
            black: 'Svart',
            championchips: 'VM, EM, NOM, Världscup, SM (ej SM-ultralång, Veteranmästerskap)',
            gold: 'Guld',
            silver: 'Silver',
            bronze: 'Brons',
            top10: 'Top 10',
            top30: 'Top 30',
          },
        },
      },
    },
  });

document.documentElement.lang = i18next.language;

export default i18next;

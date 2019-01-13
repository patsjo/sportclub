import i18next from "i18next";
import { reactI18nextModule } from "react-i18next";
import LngDetector from "i18next-browser-languagedetector";

i18next
  .use(LngDetector)
  .use(reactI18nextModule) // passes i18n down to react-i18next
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
            Edit: "Edit",
            Save: "Save",
            Cancel: "Cancel"
          },
          modules: {
            Home: "Home",
            News: "News",
            Calendar: "Calendar",
            ScoringBoard: "ScoringBoard",
            Eventor: "Eventor",
            Address: "Address",
            Photo: "Photo"
          },
          news: {
            Header: "Header",
            Link: "Link",
            Introduction: "Introduction text",
            Text: "Text"
          }
        }
      },
      sv: {
        translation: {
          common: {
            Menu: "Meny",
            Close: "Stäng",
            Edit: "Redigera",
            Save: "Spara",
            Cancel: "Avbryt"
          },
          modules: {
            Home: "Startsida",
            News: "Nyheter",
            Calendar: "Kalender",
            ScoringBoard: "Poängliga",
            Eventor: "Eventor",
            Address: "Adress",
            Photo: "Foto"
          },
          news: {
            Header: "Rubrik",
            Link: "Länk",
            Introduction: "Inledande text",
            Text: "Texten"
          }
        }
      }
    }
  });

export default i18next;

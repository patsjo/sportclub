export const difficulties = {
  green: "Grön",
  white: "Vit",
  yellow: "Gul",
  orange: "Orange",
  red: "Röd",
  purple: "Lila",
  blue: "Blå",
  black: "Svart"
};

export const failedReasons = {
  NotStarted: "EJ START",
  NotFinished: "UTGÅTT",
  Finished: "FULLFÖ",
  Approved: "GODK"
};

export const failedReasonOptions = t => [
  { code: failedReasons.NotStarted, description: t("results.NotStarted") },
  { code: failedReasons.NotFinished, description: t("results.NotFinished") },
  { code: failedReasons.Finished, description: t("results.Finished") }
];

export const payments = {
  defaultFee0And100IfNotStarted: 0,
  defaultFee0And100IfNotFinished: 1,
  defaultFee50And100IfNotFinished: 2,
  defaultFeePaidByCompetitor: 3,
  defaultFee50And100IfNotStarted: 4
};

export const paymentOptions = t => [
  { code: payments.defaultFee0And100IfNotStarted, description: t("results.DefaultFee0And100IfNotStarted") },
  { code: payments.defaultFee0And100IfNotFinished, description: t("results.DefaultFee0And100IfNotFinished") },
  { code: payments.defaultFee50And100IfNotStarted, description: t("results.DefaultFee50And100IfNotStarted") },
  { code: payments.defaultFee50And100IfNotFinished, description: t("results.DefaultFee50And100IfNotFinished") },
  { code: payments.defaultFeePaidByCompetitor, description: t("results.DefaultFeePaidByCompetitor") }
];

export const lightConditions = {
  day: "Day",
  night: "Night",
  dusk: "Dusk",
  dawn: "Dawn"
};

export const raceLightConditionOptions = t => [
  { code: lightConditions.day, description: t("results.Day") },
  { code: lightConditions.night, description: t("results.Night") },
  { code: lightConditions.dusk, description: t("results.Dusk") },
  { code: lightConditions.dawn, description: t("results.Dawn") }
];

export const distances = {
  sprint: "Sprint",
  middle: "Middle",
  long: "Long",
  ultraLong: "UltraLong"
};

export const raceDistanceOptions = t => [
  { code: distances.sprint, description: t("results.Sprint") },
  { code: distances.middle, description: t("results.Middle") },
  { code: distances.long, description: t("results.Long") },
  { code: distances.ultraLong, description: t("results.UltraLong") }
];

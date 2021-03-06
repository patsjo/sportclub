import moment from "moment";
import { timeFormat } from "./formHelper";
import { payments, failedReasons, difficulties, distances, lightConditions } from "../utils/resultConstants";

const minMissingPercentageQuota = 0.04;
const minMissingTimeSeconds = 4;

export const GetTimeWithHour = (timeString) => {
  if (!timeString || timeString.length < 4) {
    return null;
  } else if (timeString.length === 4) {
    return `00:0${timeString}`;
  } else if (timeString.length === 5) {
    return `00:${timeString}`;
  } else if (timeString.length === 7) {
    return `0${timeString}`;
  } else {
    return timeString;
  }
};

export const FormatTime = (timeString) => {
  if (!timeString) {
    return null;
  }
  const time = moment(GetTimeWithHour(timeString), timeFormat);

  if (time.get("hour") === 0) {
    return time.format("m:ss");
  }
  return time.format("H:mm:ss");
};

export const ConvertTimeToSeconds = (timeString) => {
  try {
    if (!timeString || timeString.length < 4) {
      return 0;
    }
    const momentTime = moment(timeString.length <= 5 ? `0:${timeString}` : timeString, timeFormat);
    if (!moment.isMoment(momentTime)) {
      return 0;
    }
    const hh = momentTime.get("hour");
    const mm = momentTime.get("minute");
    const ss = momentTime.get("second");
    return hh * 3600 + mm * 60 + ss;
  } catch (e) {
    return 0;
  }
};

const ConvertTimeWithFractionsToSeconds = (timeString) => {
  try {
    if (!timeString || timeString.length < 8) {
      return 0;
    }
    const momentTime = moment(timeString, "HH:mm:ss.SSS");
    if (!moment.isMoment(momentTime)) {
      return 0;
    }
    const hh = momentTime.get("hour");
    const mm = momentTime.get("minute");
    const ss = momentTime.get("second");
    const SSS = momentTime.get("millisecond");
    return hh * 3600 + mm * 60 + ss + SSS / 1000;
  } catch (e) {
    return 0;
  }
};

export const ConvertSecondsToTime = (timeInSeconds) => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds - hours * 3600) / 60);
  const seconds = Math.floor(timeInSeconds - hours * 3600 - minutes * 60);
  const time = moment({ hours: hours, minutes: minutes, seconds: seconds });
  return time.format("HH:mm:ss");
};

export const ConvertSecondsWithFractionsToTime = (timeInSeconds) => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds - hours * 3600) / 60);
  const seconds = Math.floor(timeInSeconds - hours * 3600 - minutes * 60);
  const milliseconds = Math.floor(1000 * (timeInSeconds - hours * 3600 - minutes * 60 - seconds));
  const time = moment({ hours: hours, minutes: minutes, seconds: seconds, milliseconds: milliseconds });
  return time.format("HH:mm:ss.SSS");
};

export const WinnerTime = (timeStr, timeDiffStr, position) => {
  if (position === 1) {
    return GetTimeWithHour(timeStr);
  } else if (!timeDiffStr) {
    return null;
  }
  const time = timeStr.length > 5 ? moment(timeStr, "HH:mm:ss") : moment(`00:${timeStr}`, "HH:mm:ss");
  const timeDiff = timeDiffStr.length > 5 ? moment(timeDiffStr, "HH:mm:ss") : moment(`00:${timeDiffStr}`, "HH:mm:ss");

  time.subtract(timeDiff.second(), "seconds");
  time.subtract(timeDiff.minute(), "minutes");
  time.subtract(timeDiff.hour(), "hours");
  return time.format("HH:mm:ss");
};

export const TimeDiff = (time1Str, time2Str, useFormatTime = false) => {
  const time1 = time1Str.length > 5 ? moment(time1Str, "HH:mm:ss") : moment(`00:${time1Str}`, "HH:mm:ss");
  const time2 = time2Str.length > 5 ? moment(time2Str, "HH:mm:ss") : moment(`00:${time2Str}`, "HH:mm:ss");

  if (time2.isBefore(time1)) {
    time1.subtract(time2.second(), "seconds");
    time1.subtract(time2.minute(), "minutes");
    time1.subtract(time2.hour(), "hours");
    return `-${useFormatTime ? FormatTime(time1.format("HH:mm:ss")) : time1.format("HH:mm:ss")}`;
  }
  time2.subtract(time1.second(), "seconds");
  time2.subtract(time1.minute(), "minutes");
  time2.subtract(time1.hour(), "hours");
  return useFormatTime ? FormatTime(time2.format("HH:mm:ss")) : time2.format("HH:mm:ss");
};

export const GetAge = (birthDateStr, raceDateStr) => {
  const raceYear = moment(raceDateStr, "YYYY-MM-DD").year();
  const birthYear = moment(birthDateStr, "YYYY-MM-DD").year();

  return raceYear - birthYear;
};

export const GetFees = (entryFees, entryFeeIds, age, isOpenClass) => {
  const fees = { originalFee: 0, lateFee: 0 };
  // eslint-disable-next-line eqeqeq
  if (entryFeeIds == undefined) {
    return fees;
  }
  const competitorEntryFees = entryFees
    .filter((fee) => entryFeeIds.includes(fee.EntryFeeId))
    .sort((a, b) =>
      !a.ValidFromDate ? -1 : !b.ValidFromDate ? 1 : a.ValidFromDate.Date < b.ValidFromDate.Date ? -1 : 1
    );
  // eslint-disable-next-line eqeqeq
  if (competitorEntryFees == undefined || competitorEntryFees.length === 0) {
    return fees;
  }
  const firstValidFromDate = competitorEntryFees[0].ValidFromDate
    ? competitorEntryFees[0].ValidFromDate.Date
    : undefined;
  const originalFees = competitorEntryFees.filter(
    (fee) =>
      (!fee.ValidFromDate || fee.ValidFromDate.Date === firstValidFromDate) &&
      fee["@attributes"].valueOperator === "fixed"
  );
  const lateFees = competitorEntryFees.filter(
    (fee) =>
      !originalFees.map((oFee) => oFee.EntryFeeId).includes(fee.EntryFeeId) &&
      fee["@attributes"].valueOperator === "fixed"
  );
  const extraPercentage = competitorEntryFees.find((fee) => fee["@attributes"].valueOperator === "percent");

  if (isOpenClass) {
    if (age <= 16) {
      fees.originalFee = Math.min(...originalFees.map((fee) => parseInt(fee.Amount)));
    } else {
      fees.originalFee = Math.max(...originalFees.map((fee) => parseInt(fee.Amount)));
    }
  } else {
    fees.originalFee = originalFees.map((fee) => parseInt(fee.Amount)).reduce((a, b) => a + b, 0);
    fees.lateFee = lateFees.map((fee) => parseInt(fee.Amount)).reduce((a, b) => a + b, 0);
    // eslint-disable-next-line eqeqeq
    if (extraPercentage != undefined) {
      fees.lateFee += (fees.originalFee * parseInt(extraPercentage.Amount)) / 100;
    }
  }
  return fees;
};

export const GetLength = (lengthHtmlJson, fullClassName) => {
  if (!lengthHtmlJson) {
    return null;
  }
  const searchText = `<h3>${fullClassName}</h3>`;
  let classIndex = lengthHtmlJson.indexOf(searchText);
  if (classIndex < 0) {
    return null;
  }
  classIndex += searchText.length;
  const meterIndex = lengthHtmlJson.indexOf("m,", classIndex);
  if (meterIndex < 0) {
    return null;
  }
  const lengthString = lengthHtmlJson.substr(classIndex, meterIndex - classIndex).replace(" ", "");
  if (lengthString.length > 10 || isNaN(lengthString)) {
    return null;
  }
  return parseInt(lengthString);
};

export const GetSecondsWithFractionsPerKiloMeter = (timeString, length) => {
  if (!length || length === 0) {
    return undefined;
  }
  const seconds = ConvertTimeToSeconds(timeString);
  const secondsPerKilometer = Math.round((1000000 * seconds) / length) / 1000;

  return secondsPerKilometer;
};

export const GetRacePoint = (raceEventClassification, raceClassClassification, result) => {
  const basePoint =
    raceEventClassification.basePoint -
    raceClassClassification.decreaseBasePoint -
    (result.className.indexOf("%") > -1 ? 10 : 0);

  if (
    result.failedReason ||
    !result.position ||
    !result.nofStartsInClass ||
    !result.competitorTime ||
    !result.winnerTime
  ) {
    if (result.failedReason === failedReasons.Approved || result.failedReason === failedReasons.Finished) {
      Math.round(basePoint / 3);
    } else {
      return null;
    }
  }

  const positionPoint =
    result.position && result.position > 0 ? 20 * Math.log10(result.nofStartsInClass / result.position) : 0;
  const competitorTime = ConvertTimeToSeconds(result.competitorTime);
  const winnerTime = ConvertTimeToSeconds(result.winnerTime);
  const timeDivisor = winnerTime > 0 ? Math.pow(competitorTime / winnerTime, 1.5) : 0;

  const point = timeDivisor > 0 ? Math.round((basePoint + positionPoint) / timeDivisor) : 0;
  return point > 0 ? point : null;
};

export const GetRaceOldPoint = (raceEventClassification, raceClassClassification, result) => {
  if (
    result.failedReason ||
    !result.position ||
    !result.nofStartsInClass ||
    !result.competitorTime ||
    !result.winnerTime
  ) {
    if (result.failedReason === failedReasons.Approved || result.failedReason === failedReasons.Finished) {
      return 30;
    } else {
      return null;
    }
  }
  const basePoint = raceEventClassification.oldBasePoint - raceClassClassification.decreaseOldBasePoint;
  const positionPoint = Math.max(
    raceEventClassification.oldPositionBasePoint -
      (result.position > 1 ? 5 : 0) -
      (result.position > 2 ? result.position : 0),
    0
  );
  const nofStartsPoint = Math.min(Math.round((result.nofStartsInClass - 1) / 5), 30);
  const competitorTime = ConvertTimeToSeconds(result.competitorTime);
  const winnerTime = ConvertTimeToSeconds(result.winnerTime);

  const timePoint =
    result.lengthInMeter > 0 ? Math.round(((competitorTime - winnerTime) / 60) * (10000 / result.lengthInMeter)) : 1000;

  const point = Math.max(basePoint + positionPoint + nofStartsPoint - timePoint, 0);
  return point > 0 ? point : null;
};

export const GetPointRunTo1000 = (raceEventClassification, raceClassClassification, result) => {
  const basePoint = raceEventClassification.base1000Point - raceClassClassification.decreaseBase1000Point;

  if (
    result.failedReason ||
    !result.position ||
    !result.nofStartsInClass ||
    !result.competitorTime ||
    !result.winnerTime
  ) {
    if (result.failedReason === failedReasons.Approved || result.failedReason === failedReasons.Finished) {
      return 30;
    } else {
      return null;
    }
  }
  if (result.nofStartsInClass < 2 || result.position < 1) {
    return 30;
  }

  const points = Math.round((basePoint / (result.nofStartsInClass - 1)) * (result.nofStartsInClass - result.position));
  if (points < 30) return 30;
  return points;
};

export const ResetClassClassifications = (raceEvent, eventClassifications, classLevels) => {
  let results = [];
  if (raceEvent.results && raceEvent.results.length > 0) {
    results = raceEvent.results;
  } else if (raceEvent.teamResults && raceEvent.teamResults.length > 0) {
    results = raceEvent.teamResults;
  }
  results.forEach((result) => {
    if (!result.deviantEventClassificationId) {
      const classLevel = classLevels
        .filter((cl) => result.className.indexOf(cl.classShortName) >= 0)
        .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
        .find(() => true);
      const classClassificationId = GetClassClassificationId(
        raceEvent.eventClassificationId,
        classLevel,
        eventClassifications
      );
      result.setValue("classClassificationId", classClassificationId);
    }
  });
};

export const GetCompetitorFee = (paymentModel, result, age, classClassification) => {
  // eslint-disable-next-line eqeqeq
  if (result.originalFee == undefined || result.lateFee == undefined) {
    return undefined;
  }
  switch (paymentModel) {
    case payments.defaultFee0And100IfNotStarted:
      return result.failedReason === failedReasons.NotStarted ? result.originalFee + result.lateFee : result.lateFee;
    case payments.defaultFee0And100IfNotFinished:
      return result.failedReason === failedReasons.NotStarted || result.failedReason === failedReasons.NotFinished
        ? result.originalFee + result.lateFee
        : result.lateFee;
    case payments.defaultFee50And100IfNotStarted:
      return result.failedReason === failedReasons.NotStarted
        ? result.originalFee + result.lateFee
        : age > 20 && (!classClassification || classClassification.classTypeShortName !== 'E') ? result.originalFee / 2 + result.lateFee : result.lateFee;
    case payments.defaultFee50And100IfNotFinished:
      return result.failedReason === failedReasons.NotStarted || result.failedReason === failedReasons.NotFinished
        ? result.originalFee + result.lateFee
        : age > 20 && (!classClassification || classClassification.classTypeShortName !== 'E') ? result.originalFee / 2 + result.lateFee: result.lateFee;
    case payments.defaultFeePaidByCompetitor:
      return 0;
    default:
  }
  return undefined;
};

export const CalculateCompetitorsFee = (raceEvent, selectedClub, eventClassifications) => {
  if (raceEvent.results && raceEvent.results.length > 0) {
    raceEvent.results.forEach((result) => {
      const competitor = selectedClub.competitorById(result.competitorId);
      const age = competitor ? GetAge(competitor.birthDay, raceEvent.raceDate) : null;
      const classClassification = eventClassifications
        .find(ec => ec.eventClassificationId === raceEvent.eventClassificationId)
        .classClassifications.find(cc => cc.classClassificationId === result.classClassificationId);
      
      result.setValue("feeToClub", GetCompetitorFee(raceEvent.paymentModel, result, age, classClassification));
    });
  }
};

export const GetClassShortName = (className) => {
  if (!className || className.length === 0) {
    return null;
  }
  const eIndex = className.toLowerCase().indexOf(" elit");
  const lIndex = className.toLowerCase().indexOf(" lång");
  const kIndex = className.toLowerCase().indexOf(" kort");
  const mIndex = className.toLowerCase().indexOf(" motion");
  const l2Index = className.toLowerCase().indexOf(" lätt");
  const oIndex = className.toLowerCase().indexOf("öppen ");
  const o2Index = className.toLowerCase().indexOf("öppen motion ");
  const o3Index = className.toLowerCase().indexOf("öm");
  const inskIndex = className.toLowerCase().indexOf("insk");

  if (eIndex >= 0) {
    return `${className.substr(0, eIndex)}E${className.substr(eIndex + 5)}`;
  } else if (lIndex >= 0) {
    return `${className.substr(0, lIndex)}L${className.substr(lIndex + 5)}`;
  } else if (kIndex >= 0) {
    return `${className.substr(0, kIndex)}K${className.substr(kIndex + 5)}`;
  } else if (mIndex >= 0) {
    return `${className.substr(0, mIndex)}M${className.substr(mIndex + 7)}`;
  } else if (l2Index >= 0) {
    return `${className.substr(0, l2Index)}L${className.substr(l2Index + 5)}`;
  } else if (o3Index >= 0) {
    return `Ö${className.substr(2)}`;
  } else if (o2Index >= 0) {
    return `Ö${className.substr(13)}`;
  } else if (oIndex >= 0) {
    return `Ö${className.substr(6)}`;
  } else if (inskIndex >= 0) {
    return "INSK";
  } else {
    return className;
  }
};

export const GetClassClassificationId = (eventClassificationId, classLevel, eventClassifications) => {
  if (!eventClassificationId || !classLevel || !eventClassifications) {
    return null;
  }
  const eventClassification = eventClassifications.find((ec) => ec.eventClassificationId === eventClassificationId);
  if (!eventClassification) {
    return null;
  }
  const classClassification = eventClassification.classClassifications
    .filter(
      (cc) =>
        (cc.classTypeShortName && cc.classTypeShortName === classLevel.classTypeShortName) ||
        (cc.ageUpperLimit && cc.ageUpperLimit >= classLevel.age) ||
        (cc.ageLowerLimit && cc.ageLowerLimit <= classLevel.age) ||
        (!cc.classTypeShortName && !cc.ageUpperLimit && !cc.ageLowerLimit)
    )
    .sort((a, b) => (!a.ageUpperLimit && !a.ageLowerLimit ? 1 : a.ageUpperLimit > b.ageUpperLimit ? 1 : -1))
    .find(() => true);
  if (!classClassification) {
    return null;
  }
  return classClassification.classClassificationId;
};

export const GetAward = (raceEventClassification, classLevels, result, competitorAge, isSprint) => {
  if (
    result.failedReason === failedReasons.NotStarted ||
    result.failedReason === failedReasons.NotFinished ||
    raceEventClassification.eventClassificationId === "H"
  ) {
    return null;
  }

  const classClassification = raceEventClassification.classClassifications
    .filter(cc => cc.classClassificationId === result.classClassificationId);
  let classLevel = classLevels
  .filter((cl) => result.className.indexOf(cl.classShortName) >= 0)
  .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
  .find(() => true);

  if (classClassification) {
    let age = classLevel ? classLevel.age : 21;
    if (!classLevel && classClassification.ageUpperLimit) {
      age = classClassification.ageUpperLimit;
    } else if (!classLevel && classClassification.ageLowerLimit) {
      age = classClassification.ageLowerLimit;
    }

    classLevel = {
      age: age,
      classShortName: result.className,
      classTypeShortName: classClassification.classClassificationId ? classClassification.classClassificationId : 'T',
      difficulty: result.difficulty
    };
  } else if (!classLevel) {
    classLevel = {
      age: competitorAge,
      classShortName: result.className,
      classTypeShortName: "T"
    };
  }
  if (classLevel.classTypeShortName === 'Ö')  {
    classLevel.age = competitorAge;
  }

  if (
    result.className.toLowerCase().indexOf("insk") >= 0 ||
    result.className.toLowerCase().indexOf("u") >= 0 ||
    ((result.className.toLowerCase().indexOf("ö") >= 0 ||
      result.failedReason === failedReasons.Finished ||
      result.failedReason === failedReasons.Approved) &&
      classLevel.age <= 16)
  ) {
    return "UJ";
  }
  if (result.failedReason != null || result.nofStartsInClass == null || result.nofStartsInClass < 2) {
    return null;
  }

  const timeInMinutes = Math.ceil(ConvertTimeToSeconds(result.competitorTime) / 60);
  const winnerTimeInMinutes = Math.ceil(ConvertTimeToSeconds(result.winnerTime) / 60);

  if (timeInMinutes === 0 || winnerTimeInMinutes === 0) {
    return null;
  }

  const maxMinutes = (percentage) => Math.ceil(((100 + percentage) * winnerTimeInMinutes) / 100);
  let award = null;

  if (classLevel.age <= 16) {
    if (
      classLevel.classTypeShortName !== "T" &&
      classLevel.classTypeShortName !== "S" &&
      classLevel.classTypeShortName !== "M"
    ) {
      return "UJ";
    }
    const classAge = classLevel.classTypeShortName === "M" ? classLevel.age - 2 : classLevel.age;
    award = "UJ";
    if (timeInMinutes <= maxMinutes(50) || (classAge >= 14 && timeInMinutes <= maxMinutes(75))) {
      award = "UB";
    }
    if (
      !isSprint &&
      ((classAge >= 12 && timeInMinutes <= maxMinutes(30)) || (classAge >= 14 && timeInMinutes <= maxMinutes(50)))
    ) {
      award = "US";
    }
    if (
      !isSprint &&
      ((classAge >= 12 && timeInMinutes <= maxMinutes(10)) ||
        (classAge >= 14 && timeInMinutes <= maxMinutes(20)) ||
        (classAge >= 16 && timeInMinutes <= maxMinutes(30)))
    ) {
      award = "UG";
    }
    if (
      !isSprint &&
      ((classAge >= 14 && timeInMinutes <= maxMinutes(10)) || (classAge >= 16 && timeInMinutes <= maxMinutes(20)))
    ) {
      award = "UE";
    }
    if (!isSprint && classAge >= 16 && timeInMinutes <= maxMinutes(10)) {
      award = "UM";
    }
    if (!isSprint && ["A", "B"].includes(raceEventClassification.eventClassificationId)) {
      if (award === "UJ" && timeInMinutes <= maxMinutes(100)) {
        award = "US";
      } else if (award === "UB") {
        award = "UG";
      } else if (award === "US") {
        award = "UE";
      } else if (award === "UG") {
        award = "UM";
      }
    }
  } else if ([difficulties.green, difficulties.white, difficulties.yellow].includes(result.difficulty)) {
    award = null;
  } else if (raceEventClassification.eventClassificationId === "G") {
    if (timeInMinutes <= maxMinutes(30)) {
      award = "B";
    }
  } else if (raceEventClassification.eventClassificationId === "I") {
    if (timeInMinutes <= maxMinutes(50)) {
      award = "B";
    }
    if (
      classLevel.classTypeShortName !== "E" &&
      classLevel.classTypeShortName !== "T" &&
      classLevel.classTypeShortName !== "S" &&
      !isSprint &&
      timeInMinutes <= maxMinutes(20)
    ) {
      award = "S";
    } else if (!isSprint && timeInMinutes <= maxMinutes(40)) {
      award = "S";
    }
  } else if (
    classLevel.classTypeShortName !== "E" &&
    classLevel.classTypeShortName !== "T" &&
    classLevel.classTypeShortName !== "S"
  ) {
    if (timeInMinutes <= maxMinutes(50)) {
      award = "B";
    }
    if (!isSprint && timeInMinutes <= maxMinutes(20)) {
      award = "S";
    }
  } else {
    if (timeInMinutes <= maxMinutes(50)) {
      award = "B";
    }
    if (!isSprint && timeInMinutes <= maxMinutes(40)) {
      award = "S";
    }
    if (!isSprint && timeInMinutes <= maxMinutes(10)) {
      award = "G";
    }
    if (
      !isSprint &&
      ["A", "B", "C"].includes(raceEventClassification.eventClassificationId) &&
      timeInMinutes <= maxMinutes(20)
    ) {
      award = "G";
    }
  }
  return award;
};

export const CalculateAllAwards = (raceClubs, raceEvent) => {
  const raceEventClassification = raceClubs.eventClassifications.find(
    (ec) => ec.eventClassificationId === raceEvent.eventClassificationId
  );
  raceEvent.results.forEach((result) => {
    const competitor = raceClubs.selectedClub.competitorById(result.competitorId);
    const age = GetAge(competitor.birthDay, raceEvent.raceDate);

    result.setCalculatedAward(
      raceEvent.meetsAwardRequirements
        ? GetAward(
            raceEventClassification,
            raceClubs.classLevels,
            result,
            age,
            raceEvent.raceDistance === distances.sprint
          )
        : null
    );
  });
};

export const GetRanking = (rankingBasetimePerKilometer, rankingBasepoint, result, sportCode, raceLightCondition) => {
  if (result.failedReason != null || !result.lengthInMeter || result.lengthInMeter < 500) {
    return null;
  }
  const secondsPerMeter = ConvertTimeToSeconds(result.competitorTime) / result.lengthInMeter;
  const baseSecondsPerKilometer = ConvertTimeWithFractionsToSeconds(rankingBasetimePerKilometer);
  let baseLengthInMeter = (1000 * (4500 + rankingBasepoint * 60)) / baseSecondsPerKilometer;

  if (sportCode === "OL") {
    const length315 = 4500000 / ConvertTimeToSeconds("00:03:15");
    const length330 = 4500000 / ConvertTimeToSeconds("00:03:30");
    const length345 = 4500000 / ConvertTimeToSeconds("00:03:45");

    switch (result.difficulty) {
      case difficulties.green:
        baseLengthInMeter = length315;
        break;
      case difficulties.white:
        baseLengthInMeter = length330;
        break;
      case difficulties.yellow:
        baseLengthInMeter = length345;
        break;
      case difficulties.orange:
        baseLengthInMeter *= 1.3;
        break;
      case difficulties.red:
        baseLengthInMeter *= 1.2;
        break;
      case difficulties.purple:
        baseLengthInMeter *= 1.1;
        break;
      case difficulties.blue:
        baseLengthInMeter *= 1.1;
        break;
      default:
    }

    if (result.deviantRaceLightCondition && result.deviantRaceLightCondition !== raceLightCondition) {
      const lengthFactor =
        1 +
        (raceLightCondition === lightConditions.day ? 0 : raceLightCondition === lightConditions.night ? 0.03 : 0.02) -
        (result.deviantRaceLightCondition === lightConditions.day
          ? 0
          : result.deviantRaceLightCondition === lightConditions.night
          ? 0.03
          : 0.02);
      baseLengthInMeter *= lengthFactor;
    }
  } else if (sportCode === "SKIO") {
    const length430 = 4500000 / ConvertTimeToSeconds("00:04:30");
    if (baseLengthInMeter < length430) {
      baseLengthInMeter = length430;
    }
  } else if (sportCode === "MTBO") {
    const length430 = 4500000 / ConvertTimeToSeconds("00:04:30");
    if (baseLengthInMeter < length430) {
      baseLengthInMeter = length430;
    }
  }
  return (secondsPerMeter * baseLengthInMeter - 4500) / 60;
};

const GetBestSplitTimes = (splitTimes) => {
  let bestSplitTimes = [];
  let secondBestSplitTimes = [];
  if (
    splitTimes &&
    Array.isArray(splitTimes) &&
    splitTimes.length >= 3
  ) {
    const allSplitTimes = splitTimes.reduce((a, b) => a.concat(b.splitTimes), []);
    const uniqueSplitTimes = allSplitTimes
      .map(st => st.controlCode)
      .filter((value, index, self) => self.indexOf(value) === index);
    bestSplitTimes = uniqueSplitTimes.map((controlCode) => ({
      controlCode: controlCode,
      time: Math.min(...allSplitTimes.filter(ast => ast.controlCode === controlCode).map(ast => ast.time)),
      nofTimes: allSplitTimes.filter(ast => ast.controlCode === controlCode).length
    }));
    secondBestSplitTimes = uniqueSplitTimes.map((controlCode) => {
      const firstTime = Math.min(...allSplitTimes.filter(ast => ast.controlCode === controlCode).map(ast => ast.time));
      const secondTime = allSplitTimes.filter(ast => ast.controlCode === controlCode).map(ast => ast.time).sort((a, b) => a - b)[1];
      return {
        controlCode: controlCode,
        time: secondTime,
        diffQuota: secondTime / firstTime
      }
    });

    if (secondBestSplitTimes.length >= 4) {
      const avgDiffQuota = [...secondBestSplitTimes]
        .sort((a, b) => a.diffQuota - b.diffQuota)
        .slice(0, secondBestSplitTimes.length - 2)
        .map(pst => pst.diffQuota)
        .reduce((a, b) => a + b, 0) / (secondBestSplitTimes.length - 2);
      const avgDiffQuotaLimit = 1.01 * avgDiffQuota;
      secondBestSplitTimes.forEach(st => {
        if (st.diffQuota > avgDiffQuotaLimit) {
          st.time = Math.round(st.time * avgDiffQuotaLimit / st.diffQuota);
        }
        st.diffQuota = undefined;
      });
    }
  }
  return { bestSplitTimes, secondBestSplitTimes };
}

export const GetSplitTimes = (personResults) => {
  const splitTimes = personResults
    .filter(pr => {
      const didNotStart = pr.Result.CompetitorStatus['@attributes'].value === 'DidNotStart';
      const misPunch = pr.Result.CompetitorStatus['@attributes'].value === 'MisPunch';
      const ok = pr.Result.CompetitorStatus['@attributes'].value === 'OK';
      const hasSplitTimes = pr.Result.SplitTime && Array.isArray(pr.Result.SplitTime) &&
        pr.Result.SplitTime.filter(st => st.Time).length > 0;
      return ok && !didNotStart && !misPunch && pr.Person?.PersonId && hasSplitTimes;
    })
    .map((pr) => ({
      personId: pr.Person.PersonId,
      splitTimes: pr.Result.SplitTime
        .filter(st => st.Time)
        .map((st) => ({
          controlCode: st.ControlCode,
          sequence: st['@attributes'].sequence,
          time: ConvertTimeToSeconds(st.Time),
        }))
        .filter((st, i, stArray) => i === 0 || st.controlCode !== stArray[i - 1].controlCode)
        .map((st, i, stArray) => ({
          controlCode: `${i === 0 ? 'S' : stArray[i - 1].controlCode}-${st.controlCode}`,
          controlOrder: parseInt(st.sequence),
          time: i === 0 ? st.time : st.time - stArray[i - 1].time,
        }))
        .sort((a, b) => (a.controlCode > b.controlCode ? 1 : b.controlCode > a.controlCode ? -1 : 0)),
    }));
  return { splitTimes, ...GetBestSplitTimes(splitTimes) };
}

export const GetRelaySplitTimes = (teamResults) => {
  const allTeamMemberResult = teamResults.reduce((a, b) => a.concat(b.TeamMemberResult), []);
  const allLegsSplitTimes = allTeamMemberResult
    .map(r => r.Leg)
    .filter((value, index, self) => self.indexOf(value) === index)
    .map(leg => ({leg: leg, splitTimes: []}));

  allLegsSplitTimes.forEach(legSplitTimes => {
    legSplitTimes.splitTimes = allTeamMemberResult
      .filter(pr => pr.Leg === legSplitTimes.leg)
      .filter(pr => {
        const didNotStart = pr.CompetitorStatus['@attributes'].value === 'DidNotStart';
        const misPunch = pr.CompetitorStatus['@attributes'].value === 'MisPunch';
        const ok = pr.CompetitorStatus['@attributes'].value === 'OK';
        const hasSplitTimes = pr.SplitTime && Array.isArray(pr.SplitTime) &&
          pr.SplitTime.filter(st => st.Time).length > 0;
        return ok && !didNotStart && !misPunch && pr.Person?.PersonId && hasSplitTimes;
      })
      .map((pr) => ({
        personId: pr.Person.PersonId,
        splitTimes: pr.SplitTime
          .filter(st => st.Time)
          .map((st) => ({
            controlCode: st.ControlCode,
            sequence: st['@attributes'].sequence,
            time: ConvertTimeToSeconds(st.Time),
          }))
          .map((st, i, stArray) => ({
            controlCode: `${i === 0 ? 'S' : stArray[i - 1].controlCode}-${st.controlCode}`,
            controlOrder: parseInt(st.sequence),
            time: i === 0 ? st.time : st.time - stArray[i - 1].time,
          }))
          .sort((a, b) => (a.controlCode > b.controlCode ? 1 : b.controlCode > a.controlCode ? -1 : 0)),
      }));

    const { bestSplitTimes, secondBestSplitTimes } = GetBestSplitTimes(legSplitTimes.splitTimes);
    legSplitTimes.bestSplitTimes = bestSplitTimes;
    legSplitTimes.secondBestSplitTimes = secondBestSplitTimes;
  });
  return allLegsSplitTimes;
}

export const GetMissingTime = (personId, splitTimes, bestSplitTimes, secondBestSplitTimes) => {
  let totalMissingTimeSeconds = 0;

  if (bestSplitTimes.length >= 4) {
    let personSplitTimes = splitTimes
      .find((st) => st.personId === personId)
      ?.splitTimes;

    if (!personSplitTimes|| !Array.isArray(personSplitTimes)) {
      return null;
    }

    personSplitTimes.forEach((pst) => {
      pst.bestSplitTime = bestSplitTimes.find(bst => bst.controlCode === pst.controlCode);
      pst.secondBestSplitTime = secondBestSplitTimes.find(bst => bst.controlCode === pst.controlCode);
      if (pst.bestSplitTime && pst.secondBestSplitTime && pst.bestSplitTime.nofTimes >= 4) {
        pst.diffQuota = pst.time === pst.bestSplitTime.time
          ? (pst.time - pst.secondBestSplitTime.time) / pst.secondBestSplitTime.time
          : (pst.time - pst.bestSplitTime.time) / pst.bestSplitTime.time;
      }
    });
    personSplitTimes = personSplitTimes.filter(pst => pst.diffQuota !== undefined);
    let countTop25Percentage = Math.round(personSplitTimes.length / 4);
    const shortTimeLimit = personSplitTimes.map(ast => ast.bestSplitTime.time).sort((a, b) => a - b)[countTop25Percentage];
    const personSplitTimesWithoutTheShortest = personSplitTimes
      .filter(pst => pst.bestSplitTime.time >= shortTimeLimit &&
        pst.bestSplitTime.nofTimes >= Math.round(splitTimes.length / 2));
    countTop25Percentage = Math.round(personSplitTimesWithoutTheShortest.length / 4);

    if (personSplitTimesWithoutTheShortest.length < 4) {
      return null;
    }

    let top25PercentageSplitTimes =
      [...personSplitTimesWithoutTheShortest]
      .sort((a, b) => a.diffQuota - b.diffQuota)
      .slice(0, countTop25Percentage + 2);
    let baseLineM = top25PercentageSplitTimes
      .map(pst => pst.diffQuota)
      .reduce((a, b) => a + b, 0) / (countTop25Percentage + 2);
    top25PercentageSplitTimes =top25PercentageSplitTimes.sort((a, b) => Math.abs(a.diffQuota - baseLineM) - Math.abs(b.diffQuota - baseLineM))
      .slice(0, countTop25Percentage);
    baseLineM = top25PercentageSplitTimes
      .map(pst => pst.diffQuota)
      .reduce((a, b) => a + b, 0) / countTop25Percentage;
    let baseLineK = 0.0;

    if (personSplitTimesWithoutTheShortest.length >= 6) {
      const orderedSplitTimes = personSplitTimesWithoutTheShortest
        .sort((a, b) => a.controlOrder - b.controlOrder);
      const countHalf = Math.round(orderedSplitTimes.length / 2);
      const firstHalfSplitTimes = orderedSplitTimes.slice(0, countHalf);
      const secondHalfSplitTimes = orderedSplitTimes.slice(countHalf, orderedSplitTimes.length - 1);
      const firstHalfBestSplitTime = [...firstHalfSplitTimes]
        .sort((a, b) => a.diffQuota - b.diffQuota).slice(0,2);
      const secondHalfBestSplitTime = [...secondHalfSplitTimes]
        .sort((a, b) => a.diffQuota - b.diffQuota).slice(0,2);
      const t1 = firstHalfBestSplitTime[0];
      const t2 = firstHalfBestSplitTime[1];
      const t3 = secondHalfBestSplitTime[0];
      const t4 = secondHalfBestSplitTime[1];
      
      baseLineK = ((t3.diffQuota + t4.diffQuota)/2 - (t1.diffQuota + t2.diffQuota)/2) /
        (Math.max(...secondHalfSplitTimes.map(st => st.controlOrder))
         - Math.min(...firstHalfSplitTimes.map(st => st.controlOrder)));
      const t1Diff = t1.diffQuota - (baseLineM + baseLineK * t1.controlOrder);
      const t2Diff = t2.diffQuota - (baseLineM + baseLineK * t2.controlOrder);
      const t3Diff = t3.diffQuota - (baseLineM + baseLineK * t3.controlOrder);
      const t4Diff = t4.diffQuota - (baseLineM + baseLineK * t4.controlOrder);
      const top25PercentageDiff = top25PercentageSplitTimes
        .map(st => st.diffQuota - (baseLineM + baseLineK * st.controlOrder))
        .reduce((a, b) => a + b, 0);
      baseLineM += (t1Diff + t2Diff + t3Diff + t4Diff + top25PercentageDiff) / (4 + countTop25Percentage);
    }

    personSplitTimes.forEach((pst, i) => {
      const top25TimeSecondsBehind = Math.trunc(
        pst.time -
          (pst.time === pst.bestSplitTime.time ? pst.secondBestSplitTime.time : pst.bestSplitTime.time) *
            (1.0 + baseLineM + baseLineK * pst.controlOrder)
      );

      if (
        pst.diffQuota > baseLineM + baseLineK * pst.controlOrder + minMissingPercentageQuota &&
        top25TimeSecondsBehind > minMissingTimeSeconds
      ) {
        totalMissingTimeSeconds += top25TimeSecondsBehind;
      }
    });
    return ConvertSecondsToTime(totalMissingTimeSeconds);
  }
  return null;
}

import moment from "moment";
import { timeFormat } from "./formHelper";
import { payments, failedReasons, difficulties } from "../models/resultWizardModel";

export const GetTimeWithHour = timeString => {
  if (!timeString || timeString.length < 4) {
    return null;
  } else if (timeString.length === 4) {
    return `0:0${timeString}`;
  } else if (timeString.length === 5) {
    return `0:${timeString}`;
  } else {
    return timeString;
  }
};

const ConvertTimeToSeconds = timeString => {
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

export const ConvertSecondsToTime = timeInSeconds => {
  var hours = Math.floor(timeInSeconds / 3600);
  var minutes = Math.floor((timeInSeconds - hours * 3600) / 60);
  var seconds = timeInSeconds - hours * 3600 - minutes * 60;
  var time = hours + ":";
  minutes = minutes < 10 ? "0" + minutes : String(minutes);
  time += minutes + ":";
  time += seconds < 10 ? "0" + seconds : String(seconds);
  return time;
};

export const WinnerTime = (timeStr, timeDiffStr, position) => {
  if (position === 1) {
    return GetTimeWithHour(timeStr);
  }
  const time = timeStr.length > 5 ? moment(timeStr, "HH:mm:ss") : moment(`00:${timeStr}`, "HH:mm:ss");
  const timeDiff = timeDiffStr.length > 5 ? moment(timeDiffStr, "HH:mm:ss") : moment(`00:${timeDiffStr}`, "HH:mm:ss");

  time.subtract(timeDiff.second(), "seconds");
  time.subtract(timeDiff.minute(), "minutes");
  time.subtract(timeDiff.hour(), "hours");
  return time.format("HH:mm:ss");
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
    .filter(fee => entryFeeIds.includes(fee.EntryFeeId))
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
    fee =>
      (!fee.ValidFromDate || fee.ValidFromDate.Date === firstValidFromDate) &&
      fee["@attributes"].valueOperator === "fixed"
  );
  const lateFees = competitorEntryFees.filter(
    fee =>
      !originalFees.map(oFee => oFee.EntryFeeId).includes(fee.EntryFeeId) &&
      fee["@attributes"].valueOperator === "fixed"
  );
  const extraPercentage = competitorEntryFees.find(fee => fee["@attributes"].valueOperator === "percent");

  if (isOpenClass) {
    if (age <= 16) {
      fees.originalFee = Math.min(...originalFees.map(fee => parseInt(fee.Amount)));
    } else {
      fees.originalFee = Math.max(...originalFees.map(fee => parseInt(fee.Amount)));
    }
  } else {
    fees.originalFee = originalFees.map(fee => parseInt(fee.Amount)).reduce((a, b) => a + b, 0);
    fees.lateFee = lateFees.map(fee => parseInt(fee.Amount)).reduce((a, b) => a + b, 0);
    // eslint-disable-next-line eqeqeq
    if (extraPercentage != undefined) {
      fees.lateFee += Math.round((fees.originalFee * parseInt(extraPercentage.Amount)) / 100, 2);
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
  const lengthString = lengthHtmlJson.substr(classIndex, meterIndex - classIndex).replace(" ", "");
  if (lengthString.length > 10) {
    return null;
  }
  try {
    return parseInt(lengthString);
  } catch (e) {
    return null;
  }
};

export const GetSecondsPerKiloMeter = (timeString, length) => {
  if (!length || length === 0) {
    return undefined;
  }
  const seconds = ConvertTimeToSeconds(timeString);
  const secondsPerKilometer = Math.round((1000 * seconds) / length);

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

  const positionPoint = 20 * Math.log10(result.nofStartsInClass / result.position);
  const competitorTime = ConvertTimeToSeconds(result.competitorTime);
  const winnerTime = ConvertTimeToSeconds(result.winnerTime);
  const timeDivisor = winnerTime > 0 ? Math.pow(competitorTime / winnerTime, 1.5) : 0;

  return timeDivisor > 0 ? Math.round((basePoint + positionPoint) / timeDivisor) : 0;
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

  return Math.max(basePoint + positionPoint + nofStartsPoint - timePoint, 0);
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

  return Math.min(
    Math.round((basePoint / (result.nofStartsInClass - 1)) * (result.nofStartsInClass - result.position)),
    30
  );
};

export const ResetClassClassifications = (raceEvent, eventClassifications, classLevels) => {
  if (raceEvent.results && raceEvent.results.length > 0) {
    raceEvent.results.forEach(result => {
      if (!result.deviantEventClassificationId) {
        const classLevel = classLevels
          .filter(cl => result.className.indexOf(cl.classShortName) >= 0)
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
  }
};

export const GetCompetitorFee = (paymentModel, result) => {
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
    case payments.defaultFee50And100IfNotFinished:
      return result.failedReason === failedReasons.NotStarted || result.failedReason === failedReasons.NotFinished
        ? result.originalFee + result.lateFee
        : result.originalFee / 2 + result.lateFee;
    case payments.defaultFeePaidByCompetitor:
      return 0;
    default:
  }
  return undefined;
};

export const CalculateCompetitorsFee = raceEvent => {
  if (raceEvent.results && raceEvent.results.length > 0) {
    raceEvent.results.forEach(result => {
      result.setValue("feeToClub", GetCompetitorFee(raceEvent.paymentModel, result));
    });
  }
};

export const GetClassShortName = className => {
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
  const eventClassification = eventClassifications.find(ec => ec.eventClassificationId === eventClassificationId);
  if (!eventClassification) {
    return null;
  }
  const classClassification = eventClassification.classClassifications
    .filter(
      cc =>
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

  let classLevel = classLevels
    .filter(cl => result.className.indexOf(cl.classShortName) >= 0)
    .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
    .find(() => true);
  if (!classLevel || result.className.toLowerCase().indexOf("ö") >= 0) {
    classLevel = {
      age: competitorAge
    };
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

  const maxMinutes = percentage => Math.ceil(((100 + percentage) * winnerTimeInMinutes) / 100);
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
    if ((classAge >= 12 && timeInMinutes <= maxMinutes(30)) || (classAge >= 14 && timeInMinutes <= maxMinutes(50))) {
      award = "US";
    }
    if (
      (classAge >= 12 && timeInMinutes <= maxMinutes(10)) ||
      (classAge >= 14 && timeInMinutes <= maxMinutes(20)) ||
      (classAge >= 16 && timeInMinutes <= maxMinutes(30))
    ) {
      award = "UG";
    }
    if ((classAge >= 14 && timeInMinutes <= maxMinutes(10)) || (classAge >= 16 && timeInMinutes <= maxMinutes(20))) {
      award = "UE";
    }
    if (classAge >= 16 && timeInMinutes <= maxMinutes(10)) {
      award = "UM";
    }
    if (["A", "B"].includes(raceEventClassification.eventClassificationId)) {
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
  } else if (
    [difficulties.green, difficulties.white, difficulties.yellow, difficulties.orange].includes(result.difficulty)
  ) {
    award = null;
  } else if (raceEventClassification.eventClassificationId === "G") {
    if (timeInMinutes <= maxMinutes(30)) {
      award = "B";
    }
  } else if (
    classLevel.classTypeShortName !== "E" &&
    classLevel.classTypeShortName !== "T" &&
    classLevel.classTypeShortName !== "S" &&
    classLevel.classTypeShortName !== "M"
  ) {
    if (timeInMinutes <= maxMinutes(50)) {
      award = "B";
    }
    if (timeInMinutes <= maxMinutes(20)) {
      award = "S";
    }
  } else {
    if (timeInMinutes <= maxMinutes(50)) {
      award = "B";
    }
    if (timeInMinutes <= maxMinutes(40)) {
      award = "S";
    }
    if (timeInMinutes <= maxMinutes(10)) {
      award = "G";
    }
    if (["A", "B", "C"].includes(raceEventClassification.eventClassificationId) && timeInMinutes <= maxMinutes(20)) {
      award = "G";
    }
  }
  return award;
};

export const GetRanking = (rankingBasetimePerKilometer, rankingBasepoint, result, isSprint, sportCode) => {
  if (result.failedReason != null || !result.lengthInMeter || result.lengthInMeter < 500) {
    return null;
  }
  const secondsPerMeter = ConvertTimeToSeconds(result.competitorTime) / result.lengthInMeter;
  const baseSecondsPerKilometer = ConvertTimeToSeconds(rankingBasetimePerKilometer);
  let baseLengthInMeter = (1000 * (4500 + rankingBasepoint * 60)) / baseSecondsPerKilometer;

  if (sportCode === "OL") {
    const length330 = 4500000 / ConvertTimeToSeconds("3:30");
    const length345 = 4500000 / ConvertTimeToSeconds("3:45");
    const length400 = 4500000 / ConvertTimeToSeconds("4:00");

    if (result.difficulty === difficulties.green && baseLengthInMeter < length330) {
      baseLengthInMeter = length330;
    } else if (result.difficulty === difficulties.white && baseLengthInMeter < length345) {
      baseLengthInMeter = length345;
    } else if ((result.difficulty === difficulties.yellow || isSprint) && baseLengthInMeter < length400) {
      baseLengthInMeter = length400;
    }
  } else if (sportCode === "SKIO") {
    const length430 = 4500000 / ConvertTimeToSeconds("4:30");
    if (baseLengthInMeter < length430) {
      baseLengthInMeter = length430;
    }
  } else if (sportCode === "MTBO") {
    const length430 = 4500000 / ConvertTimeToSeconds("4:30");
    if (baseLengthInMeter < length430) {
      baseLengthInMeter = length430;
    }
  }
  return (secondsPerMeter * baseLengthInMeter - 4500) / 60;
};

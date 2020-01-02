import moment from "moment";
import { timeFormat } from "./formHelper";
import { payments, failedReasons } from "../models/resultWizardModel";

const ConvertTimeToSeconds = timeString => {
  try {
    const momentTime = moment(timeString, timeFormat);
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

export const WinnerTime = (timeStr, timeDiffStr, position) => {
  if (position === 1) {
    return timeStr;
  }
  const time = timeStr.length > 5 ? moment(timeStr, "HH:mm:ss") : moment(`00:${timeStr}`, "HH:mm:ss");
  const timeDiff = timeDiffStr.length > 5 ? moment(timeDiffStr, "HH:mm:ss") : moment(`00:${timeDiffStr}`, "HH:mm:ss");

  time.subtract(timeDiff.second(), "seconds");
  time.subtract(timeDiff.minute(), "minutes");
  time.subtract(timeDiff.hour(), "hours");
  return time.hour() > 0 ? time.format("HH:mm:ss") : time.format("mm:ss");
};

export const GetAge = (birthDateStr, raceDateStr) => {
  const raceYear = moment(raceDateStr, "YYYY-MM-DD").year();
  const birthYear = moment(birthDateStr, "YYYY-MM-DD").year();

  return raceYear - birthYear;
};

export const GetFees = (entryFees, entryFeeIds, age, isOpenClass) => {
  const fees = { originalFee: 0, lateFee: 0 };
  if (entryFeeIds === undefined) {
    return fees;
  }
  const originalFees = entryFees.filter(
    fee => !fee.ValidFromDate && entryFeeIds.includes(fee.EntryFeeId) && fee["@attributes"].valueOperator === "fixed"
  );
  const lateFees = entryFees.filter(
    fee => fee.ValidFromDate && entryFeeIds.includes(fee.EntryFeeId) && fee["@attributes"].valueOperator === "fixed"
  );
  const extraPercentage = entryFees.find(
    fee => entryFeeIds.includes(fee.EntryFeeId) && fee["@attributes"].valueOperator === "percent"
  );

  if (isOpenClass) {
    if (age <= 16) {
      fees.originalFee = Math.min(...originalFees.map(fee => parseInt(fee.Amount)));
    } else {
      fees.originalFee = Math.max(...originalFees.map(fee => parseInt(fee.Amount)));
    }
  } else {
    fees.originalFee = originalFees.map(fee => parseInt(fee.Amount)).reduce((a, b) => a + b, 0);
    fees.lateFee = lateFees.map(fee => parseInt(fee.Amount)).reduce((a, b) => a + b, 0);
    if (extraPercentage !== undefined) {
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
    return undefined;
  }
  try {
    return parseInt(lengthString);
  } catch (e) {
    return undefined;
  }
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
      return 0;
    }
  }

  const positionPoint = 20 * Math.log10(result.nofStartsInClass / result.position);
  const competitorTime = ConvertTimeToSeconds(result.competitorTime);
  const winnerTime = ConvertTimeToSeconds(result.winnerTime);
  const timeDivisor = winnerTime > 0 ? Math.pow(competitorTime / winnerTime, 1.5) : 0;

  return timeDivisor > 0 ? Math.round((basePoint + positionPoint) / timeDivisor) : 0;
};

export const GetRaceOldPoint = (raceEventClassification, raceClassClassification, result) => {
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
      return 0;
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

export const CalculateCompetitorsFee = raceEvent => {
  if (raceEvent.results && raceEvent.results.length > 0) {
    raceEvent.results.forEach(result => {
      switch (raceEvent.paymentModel) {
        case payments.defaultFee0And100IfNotStarted:
          result.setValue(
            "feeToClub",
            result.failedReason === failedReasons.NotStarted ? result.originalFee + result.lateFee : result.lateFee
          );
          break;
        case payments.defaultFee0And100IfNotFinished:
          result.setValue(
            "feeToClub",
            result.failedReason === failedReasons.NotStarted || result.failedReason === failedReasons.NotFinished
              ? result.originalFee + result.lateFee
              : result.lateFee
          );
          break;
        case payments.defaultFee50And100IfNotFinished:
          result.setValue(
            "feeToClub",
            result.failedReason === failedReasons.NotStarted || result.failedReason === failedReasons.NotFinished
              ? result.originalFee + result.lateFee
              : result.originalFee / 2 + result.lateFee
          );
          break;
        case payments.defaultFeePaidByCompetitor:
          result.setValue("feeToClub", 0);
          break;
        default:
      }
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

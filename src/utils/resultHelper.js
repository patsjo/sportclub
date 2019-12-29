import moment from "moment";
import { timeFormat } from "./formHelper";

export const FAILED_REASON_APPROVED = "GODK";
export const FAILED_REASON_COMPLETED = "FULLFÖ";

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

export const GetFee = (entryFees, entryFeeIds, age, isOpenClass) => {
  if (entryFeeIds === undefined) {
    return 0;
  }
  const originalFees = entryFees.filter(
    fee => entryFeeIds.includes(fee.EntryFeeId) && fee["@attributes"].valueOperator === "fixed"
  );
  const extraPercentage = entryFees.find(
    fee => entryFeeIds.includes(fee.EntryFeeId) && fee["@attributes"].valueOperator === "percent"
  );
  let amount = 0;

  if (isOpenClass) {
    if (age <= 16) {
      amount = Math.min(...originalFees.map(fee => parseInt(fee.Amount)));
    } else {
      amount = Math.max(...originalFees.map(fee => parseInt(fee.Amount)));
    }
  } else {
    amount = originalFees.map(fee => parseInt(fee.Amount)).reduce((a, b) => a + b, 0);
    if (extraPercentage !== undefined) {
      amount = Math.round((amount * (100 + parseInt(extraPercentage.Amount))) / 100, 2);
    }
  }
  return amount;
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
    if (result.failedReason === FAILED_REASON_APPROVED || result.failedReason === FAILED_REASON_COMPLETED) {
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
    if (result.failedReason === FAILED_REASON_APPROVED || result.failedReason === FAILED_REASON_COMPLETED) {
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

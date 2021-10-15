<?php

//############################################################
//# File:    save.php                                        #
//# Created: 2019-12-26                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2019-12-26  PatSjo  Initial version                      #
//# 2021-05-12  PatSjo  Added missingTime, speedRanking and  #
//#                     technicalRanking                     #
//# 2021-05-20  PatSjo  Added COMPETITOR_INFO                #
//# 2021-08-21  PatSjo  Change to JSON in and out            #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");

ValidLogin();
if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  NotAuthorized();
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
header("Access-Control-Allow-Headers: *");
header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

if(!isset($input->iType))
{
  $input->iType = "";
}

OpenDatabase();
  
if ($input->iType == "COMPETITOR")
{
  $input->iFirstName = stripslashes($input->iFirstName);
  $input->iLastName = stripslashes($input->iLastName);
  $input->iGender = stripslashes($input->iGender);
  $input->iBirthDay = string2Date($input->iBirthDay);

  $query = sprintf("INSERT INTO RACE_COMPETITORS " .
                   "(" .
                   "  FIRST_NAME, LAST_NAME, BIRTHDAY, GENDER" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  '%s', '%s', " . str_replace("''", "Null", "'" . date2String($input->iBirthDay) . "'") . " ,'%s' " .
                   ")",
                   \db\mysql_real_escape_string($input->iFirstName),
                   \db\mysql_real_escape_string($input->iLastName),
                   \db\mysql_real_escape_string($input->iGender));

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $competitorId = \db\mysql_insert_id();
        
  if ($competitorId == 0)
  {
    trigger_error("Can't get the 'competitor_id' auto_increment value", E_USER_ERROR);
  }

  if(!isset($input->iStartDate) || $input->iStartDate == "" || $input->iStartDate == "null")
  {
    $input->iStartDate = null;
  }
  else
  {
    $input->iStartDate = string2Date($input->iStartDate);
  }
  if(!isset($input->iEndDate) || $input->iEndDate == "" || $input->iEndDate == "null")
  {
    $input->iEndDate = null;
  }
  else
  {
    $input->iEndDate = string2Date($input->iEndDate);
  }

  $query = sprintf("INSERT INTO RACE_COMPETITORS_CLUB " .
                   "(" .
                   "  COMPETITOR_ID, CLUB_ID, START_DATE, END_DATE" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  %d, %d, " .
                   str_replace("''", "Null", "'" . date2String($input->iStartDate) . "'") . ", " .
                   str_replace("''", "Null", "'" . date2String($input->iEndDate) . "'") .
                   ")",
                   $competitorId,
                   $input->iClubId);
               
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  if (isset($input->iEventorCompetitorId) && !(is_null($input->iEventorCompetitorId) || $input->iEventorCompetitorId == "null")) {
    $query = sprintf("INSERT INTO RACE_COMPETITORS_EVENTOR " .
                   "(" .
                   "  EVENTOR_COMPETITOR_ID, COMPETITOR_ID" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  %d, %d" .
                   ")",
                   $input->iEventorCompetitorId,
                   $competitorId);

    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  }

  $sql2 = "SELECT * FROM RACE_COMPETITORS INNER JOIN RACE_COMPETITORS_CLUB ON (RACE_COMPETITORS.COMPETITOR_ID = RACE_COMPETITORS_CLUB.COMPETITOR_ID) WHERE RACE_COMPETITORS.COMPETITOR_ID = " . $competitorId;
  $result2 = \db\mysql_query($sql2);
  if (!$result2)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
    
  if (\db\mysql_num_rows($result2) > 0)
  {
    while($row2 = \db\mysql_fetch_assoc($result2))
    {
      $x = new stdClass();
      $x->competitorId         = intval($row2['COMPETITOR_ID']);
      $x->firstName            = $row2['FIRST_NAME'];
      $x->lastName             = $row2['LAST_NAME'];
      $x->birthDay             = $row2['BIRTHDAY'];
      $x->startDate            = is_null($row2['START_DATE']) ? NULL : date2String(strtotime($row2['START_DATE']));
      $x->endDate              = is_null($row2['END_DATE']) ? NULL : date2String(strtotime($row2['END_DATE']));
      $x->eventorCompetitorIds = array();

      $sql3 = "SELECT * FROM RACE_COMPETITORS_EVENTOR WHERE COMPETITOR_ID = " . $competitorId;
      $result3 = \db\mysql_query($sql3);
      if (!$result3)
      {
        trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
      }
        
      if (\db\mysql_num_rows($result3) > 0)
      {
        while($row3 = \db\mysql_fetch_assoc($result3))
        {
          array_push($x->eventorCompetitorIds, intval($row3['EVENTOR_COMPETITOR_ID']));
        }    
      }
      \db\mysql_free_result($result3);
    }
  }
  \db\mysql_free_result($result2);
}
elseif ($input->iType == "COMPETITOR_INFO")
{
  $input->iSeniorAchievements = stripslashes($input->iSeniorAchievements);
  if (empty($input->iSeniorAchievements) || $input->iSeniorAchievements == "null" || $input->iSeniorAchievements == "undefined") $input->iSeniorAchievements = null;
  $input->iJuniorAchievements = stripslashes($input->iJuniorAchievements);
  if (empty($input->iJuniorAchievements) || $input->iJuniorAchievements == "null" || $input->iJuniorAchievements == "undefined") $input->iJuniorAchievements = null;
  $input->iYouthAchievements = stripslashes($input->iYouthAchievements);
  if (empty($input->iYouthAchievements) || $input->iYouthAchievements == "null" || $input->iYouthAchievements == "undefined") $input->iYouthAchievements = null;
  if (empty($input->iThumbnail) || $input->iThumbnail == "null" || $input->iThumbnail == "undefined") $input->iThumbnail = null;

  $query = sprintf("UPDATE RACE_COMPETITORS " .
                   "SET SENIOR_ACHIEVEMENTS = %s, " .
                   "    JUNIOR_ACHIEVEMENTS = %s, " .
                   "    YOUTH_ACHIEVEMENTS = %s, " .
                   "    THUMBNAIL = %s " .
                   "WHERE COMPETITOR_ID = " . $input->iCompetitorId,
                   is_null($input->iSeniorAchievements) ? "NULL" : "'" . \db\mysql_real_escape_string($input->iSeniorAchievements) . "'",
                   is_null($input->iJuniorAchievements) ? "NULL" : "'" . \db\mysql_real_escape_string($input->iJuniorAchievements) . "'",
                   is_null($input->iYouthAchievements) ? "NULL" : "'" . \db\mysql_real_escape_string($input->iYouthAchievements) . "'",
                   is_null($input->iThumbnail) ? "NULL" : "'" . \db\mysql_real_escape_string($input->iThumbnail) . "'");

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $x = new stdClass();
  $x->competitorId = $input->iCompetitorId;
  $x->seniorAchievements = $input->iSeniorAchievements;
  $x->juniorAchievements = $input->iJuniorAchievements;
  $x->youthAchievements = $input->iYouthAchievements;
  $x->thumbnail = $input->iThumbnail;
}
elseif ($input->iType == "EVENTOR_COMPETITOR_ID")
{
    $query = sprintf("INSERT INTO RACE_COMPETITORS_EVENTOR " .
                   "(" .
                   "  EVENTOR_COMPETITOR_ID, COMPETITOR_ID" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  %d, %d" .
                   ")",
                   $input->iEventorCompetitorId,
                   $input->iCompetitorId);

    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

    $x = new stdClass();
    $x->competitorId = $input->iCompetitorId;
    $x->eventorCompetitorId = $input->iEventorCompetitorId;
}
elseif ($input->iType == "EVENT")
{
  $eventId = $input->eventId;

  $query = "DELETE FROM RACE_EVENT_RESULTS_MULTI_DAY WHERE RESULT_ID IN (SELECT RESULT_ID FROM RACE_EVENT_RESULTS WHERE EVENT_ID = " . $eventId . ")";
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $query = "DELETE FROM RACE_EVENT_RESULTS WHERE EVENT_ID = " . $eventId;
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $query = "DELETE FROM RACE_EVENT_RESULTS_TEAM WHERE EVENT_ID = " . $eventId;
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $query = "DELETE FROM RACE_EVENT WHERE EVENT_ID = " . $eventId;
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $x = $input;
  $raceDateTime = getRequestTime($input->raceTime, $input->raceDate);

  $query = sprintf("INSERT INTO RACE_EVENT " .
                 "(" .
                 "  EVENTOR_ID, EVENTOR_RACE_ID, NAME," .
                 "  ORGANISER_NAME, RACEDATE, RACETIME," .
                 "  SPORT_CODE, IS_RELAY, EVENT_CLASSIFICATION_ID, RACE_LIGHT_CONDITION," .
                 "  RACE_DISTANCE, PAYMENT_MODEL, MEETS_AWARD_REQUIREMENTS," .
                 "  RANKING_BASE_TIME_PER_KILOMETER, RANKING_BASE_POINT, RANKING_BASE_DESCRIPTION," .
                 "  LONGITUDE, LATITUDE, INVOICE_VERIFIED" .
                 ")" .
                 " VALUES " .
                 "(" .
                 "  %s, %s, '%s', '%s', '%s', %s, '%s', %s, '%s', %s, %s, %d, %d, '%s', %f, '%s', %s, %s, %s" .
                 ")",
                 is_null($x->eventorId) ? "NULL" : $x->eventorId,
                 is_null($x->eventorRaceId) ? "NULL" : $x->eventorRaceId,
                 $x->name,
                 $x->organiserName, $x->raceDate, is_null($raceDateTime) ? "NULL" : "'" . $raceDateTime . "'",
                 $x->sportCode, intval($x->isRelay),
                 $x->eventClassificationId, is_null($x->raceLightCondition) ? "NULL" : "'" . $x->raceLightCondition . "'",
                 is_null($x->raceDistance) ? "NULL" : "'" . $x->raceDistance . "'", $x->paymentModel, intval($x->meetsAwardRequirements),
                 $x->rankingBasetimePerKilometer,
                 $x->rankingBasepoint, $x->rankingBaseDescription,
                 is_null($x->longitude) ? "NULL" : $x->longitude,
                 is_null($x->latitude) ? "NULL" : $x->latitude,
                 intval($x->invoiceVerified));

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  $x->eventId = \db\mysql_insert_id();

  foreach($x->results as $result)
  {
    $query = sprintf("INSERT INTO RACE_EVENT_RESULTS " .
                    "(" .
                    "  EVENT_ID, COMPETITOR_ID, CLASS_NAME," .
                    "  DEVIANT_EVENT_CLASSIFICATION_ID, CLASS_CLASSIFICATION_ID, DIFFICULTY," .
                    "  LENGTH_IN_METER, FAILED_REASON, COMPETITOR_TIME," .
                    "  WINNER_TIME, SECOND_TIME, POSITION," .
                    "  NOF_STARTS_IN_CLASS, ORIGINAL_FEE, LATE_FEE," .
                    "  FEE_TO_CLUB, AWARD, POINTS," .
                    "  POINTS_OLD, POINTS_1000, RANKING," .
                    "  MISSING_TIME, SPEED_RANKING, TECHNICAL_RANKING," .
                    "  SERVICEFEE_TO_CLUB, SERVICEFEE_DESCRIPTION" .
                    ")" .
                    " VALUES " .
                    "(" .
                    "  %d, %d, '%s', %s, %d, %s, %s, %s, %s, %s, %s, %s, %s, %f, %f, %f, %s, %s, %s, %s, %s, %s, %s, %s, %f, %s" .
                    ")",
                    $x->eventId, $result->competitorId, $result->className,
                    is_null($result->deviantEventClassificationId) ? "NULL" : "'" . $result->deviantEventClassificationId . "'",
                    $result->classClassificationId,
                    is_null($result->difficulty) ? "NULL" : "'" . $result->difficulty . "'",
                    is_null($result->lengthInMeter) ? "NULL" : $result->lengthInMeter,
                    is_null($result->failedReason) ? "NULL" : "'" . $result->failedReason . "'",
                    is_null($result->competitorTime) ? "NULL" : "'" . $result->competitorTime . "'",
                    is_null($result->winnerTime) ? "NULL" : "'" . $result->winnerTime . "'",
                    is_null($result->secondTime) ? "NULL" : "'" . $result->secondTime . "'",
                    is_null($result->position) ? "NULL" : $result->position,
                    is_null($result->nofStartsInClass) ? "NULL" : $result->nofStartsInClass,
                    $result->originalFee, $result->lateFee,
                    $result->feeToClub, is_null($result->award) ? "NULL" : "'" . $result->award . "'",
                    is_null($result->points) ? "NULL" : $result->points,
                    is_null($result->pointsOld) ? "NULL" : $result->pointsOld,
                    is_null($result->points1000) ? "NULL" : $result->points1000,
                    is_null($result->ranking) ? "NULL" : $result->ranking,
                    (!isset($result->missingTime) || is_null($result->missingTime)) ? "NULL" : "'" . $result->missingTime . "'",
                    (!isset($result->speedRanking) || is_null($result->speedRanking)) ? "NULL" : $result->speedRanking,
                    (!isset($result->technicalRanking) || is_null($result->technicalRanking)) ? "NULL" : $result->technicalRanking,
                    (!isset($result->serviceFeeToClub) || is_null($result->serviceFeeToClub)) ? 0.0 : $result->serviceFeeToClub,
                    (!isset($result->serviceFeeDescription) || is_null($result->serviceFeeDescription)) ? "NULL" : "'" . $result->serviceFeeDescription . "'");

    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
    $result->resultId = \db\mysql_insert_id();

    if (!is_null($result->resultMultiDay)) {
      $query = sprintf("INSERT INTO RACE_EVENT_RESULTS_MULTI_DAY " .
      "(" .
      "  RESULT_ID, TOTAL_LENGTH_IN_METER, TOTAL_FAILED_REASON," .
      "  TOTAL_NOF_STARTS_IN_CLASS, STAGE," .
      "  TOTAL_STAGES, TOTAL_TIME," .
      "  TOTAL_WINNER_TIME, TOTAL_SECOND_TIME, TOTAL_POSITION" .
      ")" .
      " VALUES " .
      "(" .
      "  %d, %d, %s, %d, %d, %d, %s, %s, %s, %s" .
      ")",
      $result->resultId,
      is_null($result->resultMultiDay->totalLengthInMeter) ? "NULL" : $result->resultMultiDay->totalLengthInMeter,
      is_null($result->resultMultiDay->totalFailedReason) ? "NULL" : "'" . $result->resultMultiDay->totalFailedReason . "'",
      is_null($result->resultMultiDay->totalNofStartsInClass) ? "NULL" : $result->resultMultiDay->totalNofStartsInClass,
      is_null($result->resultMultiDay->stage) ? "NULL" : $result->resultMultiDay->stage,
      is_null($result->resultMultiDay->totalStages) ? "NULL" : $result->resultMultiDay->totalStages,
      is_null($result->resultMultiDay->totalTime) ? "NULL" : "'" . $result->resultMultiDay->totalTime . "'",
      is_null($result->resultMultiDay->totalWinnerTime) ? "NULL" : "'" . $result->resultMultiDay->totalWinnerTime . "'",
      is_null($result->resultMultiDay->totalSecondTime) ? "NULL" : "'" . $result->resultMultiDay->totalSecondTime . "'",
      is_null($result->resultMultiDay->totalPosition) ? "NULL" : $result->resultMultiDay->totalPosition);

      \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
      $result->resultMultiDay->multiDayResultId = \db\mysql_insert_id();
    }
  }

  foreach($x->teamResults as $result)
  {
    $query = sprintf("INSERT INTO RACE_EVENT_RESULTS_TEAM " .
                    "(" .
                    "  EVENT_ID, CLASS_NAME, TEAM_NAME," .
                    "  DEVIANT_EVENT_CLASSIFICATION_ID, CLASS_CLASSIFICATION_ID, DIFFICULTY," .
                    "  COMPETITOR_ID, LENGTH_IN_METER, FAILED_REASON, TEAM_FAILED_REASON," .
                    "  COMPETITOR_TIME, WINNER_TIME, SECOND_TIME," .
                    "  POSITION, NOF_STARTS_IN_CLASS, STAGE," .
                    "  TOTAL_STAGES, DEVIANT_RACE_LIGHT_CONDITION, DELTA_POSITIONS," .
                    "  DELTA_TIME_BEHIND, TOTAL_STAGE_POSITION, TOTAL_STAGE_TIME_BEHIND," .
                    "  TOTAL_POSITION, TOTAL_NOF_STARTS_IN_CLASS, TOTAL_TIME_BEHIND, POINTS_1000, RANKING," .
                    "  MISSING_TIME, SPEED_RANKING, TECHNICAL_RANKING," .
                    "  SERVICEFEE_TO_CLUB, SERVICEFEE_DESCRIPTION" .
                    ")" .
                    " VALUES " .
                    "(" .
                    "  %d, '%s', '%s', %s, %d, %s, %d, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %f, %s" .
                    ")",
                    $x->eventId,
                    $result->className,
                    $result->teamName,
                    is_null($result->deviantEventClassificationId) ? "NULL" : "'" . $result->deviantEventClassificationId . "'",
                    $result->classClassificationId,
                    is_null($result->difficulty) ? "NULL" : "'" . $result->difficulty . "'",
                    $result->competitorId,
                    is_null($result->lengthInMeter) ? "NULL" : $result->lengthInMeter,
                    is_null($result->failedReason) ? "NULL" : "'" . $result->failedReason . "'",
                    is_null($result->teamFailedReason) ? "NULL" : "'" . $result->teamFailedReason . "'",
                    is_null($result->competitorTime) ? "NULL" : "'" . $result->competitorTime . "'",
                    is_null($result->winnerTime) ? "NULL" : "'" . $result->winnerTime . "'",
                    is_null($result->secondTime) ? "NULL" : "'" . $result->secondTime . "'",
                    is_null($result->position) ? "NULL" : $result->position,
                    is_null($result->nofStartsInClass) ? "NULL" : $result->nofStartsInClass,
                    is_null($result->stage) ? "NULL" : $result->stage,
                    is_null($result->totalStages) ? "NULL" : $result->totalStages,
                    is_null($result->deviantRaceLightCondition) ? "NULL" : "'" . $result->deviantRaceLightCondition . "'",
                    is_null($result->deltaPositions) ? "NULL" : $result->deltaPositions,
                    is_null($result->deltaTimeBehind) ? "NULL" : "'" . $result->deltaTimeBehind . "'",
                    is_null($result->totalStagePosition) ? "NULL" : $result->totalStagePosition,
                    is_null($result->totalStageTimeBehind) ? "NULL" : "'" . $result->totalStageTimeBehind . "'",
                    is_null($result->totalPosition) ? "NULL" : $result->totalPosition,
                    is_null($result->totalNofStartsInClass) ? "NULL" : $result->totalNofStartsInClass,
                    is_null($result->totalTimeBehind) ? "NULL" : "'" . $result->totalTimeBehind . "'",
                    is_null($result->points1000) ? "NULL" : $result->points1000,
                    is_null($result->ranking) ? "NULL" : $result->ranking,
                    (!isset($result->missingTime) || is_null($result->missingTime)) ? "NULL" : "'" . $result->missingTime . "'",
                    (!isset($result->speedRanking) || is_null($result->speedRanking)) ? "NULL" : $result->speedRanking,
                    (!isset($result->technicalRanking) || is_null($result->technicalRanking)) ? "NULL" : $result->technicalRanking,
                    (!isset($result->serviceFeeToClub) || is_null($result->serviceFeeToClub)) ? 0.0 : $result->serviceFeeToClub,
                    (!isset($result->serviceFeeDescription) || is_null($result->serviceFeeDescription)) ? "NULL" : "'" . $result->serviceFeeDescription . "'");

    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
    $result->teamResultId = \db\mysql_insert_id();
  }
}
elseif ($input->iType == "EVENT_VERIFY")
{
  $x = $input;

  $query = "UPDATE RACE_EVENT " .
    "SET INVOICE_VERIFIED = " . intval($x->invoiceVerified) . " " .
    "WHERE EVENT_ID = " . $x->eventId;
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  foreach($x->results as $result)
  {
    $query = sprintf("UPDATE RACE_EVENT_RESULTS " .
      "SET ORIGINAL_FEE = %f, " .
      "    LATE_FEE = %f, " .
      "    FEE_TO_CLUB = %f, " .
      "    SERVICEFEE_TO_CLUB = %f, " .
      "    SERVICEFEE_DESCRIPTION = %s " .
      "WHERE RESULT_ID = " . $result->resultId,
      $result->originalFee,
      $result->lateFee,
      $result->feeToClub,
      (!isset($result->serviceFeeToClub) || is_null($result->serviceFeeToClub)) ? 0.0 : $result->serviceFeeToClub,
      (!isset($result->serviceFeeDescription) || is_null($result->serviceFeeDescription)) ? "NULL" : "'" . $result->serviceFeeDescription . "'"
    );
    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  }

  foreach($x->teamResults as $result)
  {
    $query = sprintf("UPDATE RACE_EVENT_RESULTS_TEAM " .
      "SET SERVICEFEE_TO_CLUB = %f, " .
      "    SERVICEFEE_DESCRIPTION = %s " .
      "WHERE TEAM_RESULT_ID = " . $result->teamResultId,
      (!isset($result->serviceFeeToClub) || is_null($result->serviceFeeToClub)) ? 0.0 : $result->serviceFeeToClub,
      (!isset($result->serviceFeeDescription) || is_null($result->serviceFeeDescription)) ? "NULL" : "'" . $result->serviceFeeDescription . "'"
    );
    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  }
}
else
{
  trigger_error(sprintf('Unsupported type (%s)', $input->iType), E_USER_ERROR);
}
  
mysqli_commit($db_conn);
CloseDatabase();

header("Content-Type: application/json");
echo json_encode($x);
exit();
?>
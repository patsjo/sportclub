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
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
set_error_handler("error_handler");

ValidLogin();
if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  NotAuthorized();
}

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

$iType = "";

if (isset($_REQUEST['iType'])) {
  $iType = $_REQUEST['iType'];
}

OpenDatabase();
if (!$db_conn->set_charset('utf8')) {
  die('Could not set character set to utf8');
}
  
if ($iType == "COMPETITOR")
{
  $iFirstName = stripslashes($_REQUEST['iFirstName']);
  $iLastName = stripslashes($_REQUEST['iLastName']);
  $iBirthDay = string2Date($_REQUEST['iBirthDay']);

  $query = sprintf("INSERT INTO RACE_COMPETITORS " .
                   "(" .
                   "  FIRST_NAME, LAST_NAME, BIRTHDAY" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  '%s', '%s', " . str_replace("''", "Null", "'" . date2String($iBirthDay) . "'") .
                   ")",
                   \db\mysql_real_escape_string($iFirstName),
                   \db\mysql_real_escape_string($iLastName));

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $competitorId = \db\mysql_insert_id();
        
  if ($competitorId == 0)
  {
    trigger_error("Can't get the 'competitor_id' auto_increment value", E_USER_ERROR);
  }

  $iClubId = intval($_REQUEST['iClubId']);
  $iStartDate = string2Date($_REQUEST['iStartDate']);
  if (is_null($_REQUEST['iEndDate']) || $_REQUEST['iEndDate'] == "null")
  {
    $iEndDate = NULL;
  } else {
    $iEndDate = string2Date($_REQUEST['iEndDate']);
  }

  $query = sprintf("INSERT INTO RACE_COMPETITORS_CLUB " .
                   "(" .
                   "  COMPETITOR_ID, CLUB_ID, START_DATE, END_DATE" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  %d, %d, " .
                   str_replace("''", "Null", "'" . date2String($iStartDate) . "'") . ", " .
                   str_replace("''", "Null", "'" . date2String($iEndDate) . "'") .
                   ")",
                   $competitorId,
                   $iClubId);
               
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  if (isset($_REQUEST['iEventorCompetitorId']) && !(is_null($_REQUEST['iEventorCompetitorId']) || $_REQUEST['iEventorCompetitorId'] == "null")) {
    $iEventorCompetitorId = intval($_REQUEST['iEventorCompetitorId']);

    $query = sprintf("INSERT INTO RACE_COMPETITORS_EVENTOR " .
                   "(" .
                   "  EVENTOR_COMPETITOR_ID, COMPETITOR_ID" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  %d, %d" .
                   ")",
                   $iEventorCompetitorId,
                   $competitorId);

    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  }

      $sql2 = "SELECT * FROM RACE_COMPETITORS INNER JOIN RACE_COMPETITORS_CLUB ON (RACE_COMPETITORS.COMPETITOR_ID = RACE_COMPETITORS_CLUB.COMPETITOR_ID) WHERE RACE_COMPETITORS.COMPETITOR_ID = " . $competitorId;
      $result2 = \db\mysql_query($sql2);
      if (!$result2)
      {
        die('SQL Error: ' . \db\mysql_error());
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
            die('SQL Error: ' . \db\mysql_error());
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
elseif ($iType == "EVENTOR_COMPETITOR_ID")
{
    $iCompetitorId = intval($_REQUEST['iCompetitorId']);
    $iEventorCompetitorId = intval($_REQUEST['iEventorCompetitorId']);

    $query = sprintf("INSERT INTO RACE_COMPETITORS_EVENTOR " .
                   "(" .
                   "  EVENTOR_COMPETITOR_ID, COMPETITOR_ID" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  %d, %d" .
                   ")",
                   $iEventorCompetitorId,
                   $iCompetitorId);

    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

    $x = new stdClass();
    $x->competitorId = $iCompetitorId;
    $x->eventorCompetitorId = $iEventorCompetitorId;
}
elseif ($iType == "EVENT")
{
  $eventId = getRequestInt("eventId");

  $query = "DELETE FROM RACE_EVENT_RESULTS_MULTI_DAY WHERE RESULT_ID IN (SELECT RESULT_ID FROM RACE_EVENT_RESULTS WHERE EVENT_ID = " . $eventId . ")";
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $query = "DELETE FROM RACE_EVENT_RESULTS WHERE EVENT_ID = " . $eventId;
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $query = "DELETE FROM RACE_EVENT_RESULTS_TEAM WHERE EVENT_ID = " . $eventId;
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $query = "DELETE FROM RACE_EVENT WHERE EVENT_ID = " . $eventId;
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $x = new stdClass();
  $x->eventorId = getRequestInt("eventorId");
  $x->eventorRaceId = getRequestInt("eventorRaceId");
  $x->name = getRequestString("name");
  $x->organiserName = getRequestString("organiserName");
  $x->raceDate = getRequestDate("raceDate");
  $raceDateTime = getRequestTime("raceTime", "raceDate");
  $x->raceTime = getRequestTime("raceTime");
  $x->sportCode = getRequestString("sportCode");
  $x->isRelay = getRequestBool("isRelay");
  $x->eventClassificationId = getRequestString("eventClassificationId");
  $x->raceLightCondition = getRequestString("raceLightCondition");
  $x->raceDistance = getRequestString("raceDistance");
  $x->paymentModel = getRequestInt("paymentModel");
  $x->meetsAwardRequirements = getRequestBool("meetsAwardRequirements");
  $x->rankingBasetimePerKilometer = getRequestString("rankingBasetimePerKilometer");
  $x->rankingBasepoint = getRequestDecimal("rankingBasepoint");
  $x->rankingBaseDescription = getRequestString("rankingBaseDescription");
  $x->longitude = getRequestDecimal("longitude");
  $x->latitude = getRequestDecimal("latitude");
  $x->results = json_decode($_REQUEST['results']);
  $x->teamResults = json_decode($_REQUEST['teamResults']);

  $query = sprintf("INSERT INTO RACE_EVENT " .
                 "(" .
                 "  EVENTOR_ID, EVENTOR_RACE_ID, NAME," .
                 "  ORGANISER_NAME, RACEDATE, RACETIME," .
                 "  SPORT_CODE, IS_RELAY, EVENT_CLASSIFICATION_ID, RACE_LIGHT_CONDITION," .
                 "  RACE_DISTANCE, PAYMENT_MODEL, MEETS_AWARD_REQUIREMENTS," .
                 "  RANKING_BASE_TIME_PER_KILOMETER, RANKING_BASE_POINT, RANKING_BASE_DESCRIPTION," .
                 "  LONGITUDE, LATITUDE" .
                 ")" .
                 " VALUES " .
                 "(" .
                 "  %s, %s, '%s', '%s', '%s', %s, '%s', %s, '%s', %s, %s, %d, %d, '%s', %f, '%s', %s, %s" .
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
                 is_null($x->latitude) ? "NULL" : $x->latitude);

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
                    "  POINTS_OLD, POINTS_1000, RANKING" .
                    ")" .
                    " VALUES " .
                    "(" .
                    "  %d, %d, '%s', %s, %d, %s, %s, %s, %s, %s, %s, %s, %s, %f, %f, %f, %s, %s, %s, %s, %s" .
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
                    is_null($result->ranking) ? "NULL" : $result->ranking);

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
                    "  TOTAL_POSITION, TOTAL_NOF_STARTS_IN_CLASS, TOTAL_TIME_BEHIND, POINTS_1000, RANKING" .
                    ")" .
                    " VALUES " .
                    "(" .
                    "  %d, '%s', '%s', %s, %d, %s, %d, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s" .
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
                    is_null($result->ranking) ? "NULL" : $result->ranking);

    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
    $result->teamResultId = \db\mysql_insert_id();
  }
}
else
{
  trigger_error(sprintf('Unsupported type (%s)', $iType), E_USER_ERROR);
}
  
  header("Access-Control-Allow-Credentials: true");
  header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
  header("Access-Control-Allow-Headers: *");
  header("Content-Type: application/json; charset=ISO-8859-1");
  echo utf8_decode(json_encode($x));
  CloseDatabase();
  exit();
?>
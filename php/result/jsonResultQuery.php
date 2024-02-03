<?php
//############################################################
//# File:    jsonResultQuery.php                             #
//# Created: 2019-12-25                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iType (Default EVENTS)                       #
//# Parameters: iFromDate                                    #
//# Parameters: iToDate                                      #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2019-12-25  PatSjo  Initial version                      #
//# 2021-05-12  PatSjo  Added missingTime, speedRanking and  #
//#                     technicalRanking                     #
//# 2021-08-21  PatSjo  Change to JSON in and out            #
//# 2022-04-17  PatSjo  Added exclude competitor             #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();

global $user_id;
setUserID();
$isCoach = $user_id > 0 && ValidGroup($cCOACH_GROUP_ID);

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

if(!isset($input->iIncludeFees))
{
  $input->iIncludeFees = false;
}
if(!isset($input->offset))
{
  $input->offset = 0;
}
if(!isset($input->limit))
{
  $input->limit = 10000;
}
if(!isset($input->iType))
{
  $input->iType = "";
}
if(!isset($input->iFromDate) || $input->iFromDate == "")
{
  $input->iFromDate = null;
}
else
{
  $input->iFromDate = string2Date($input->iFromDate);
}
if(!isset($input->iToDate) || $input->iToDate == "")
{
  $input->iToDate = null;
}
else
{
  $input->iToDate = string2Date($input->iToDate);
}
if(!isset($input->iEventorId))
{
  $input->iEventorId = null;
}

$rows = array();

if ($input->iType == "CLUBS" || $input->iType == "FEES")
{
  ValidLogin();
}

OpenDatabase();

if (is_null($input->iFromDate))
{
  $whereStartDate = "";
}
else
{
  $whereStartDate = " AND DATE_FORMAT(RACEDATE, '%Y-%m-%d') >= '" . date2String($input->iFromDate) . "'";
}

if (is_null($input->iToDate))
{
  $whereEndDate = "";
}
else
{
  $whereEndDate = " AND DATE_FORMAT(RACEDATE, '%Y-%m-%d') <= '" . date2String($input->iToDate) . "'";
}

if (is_null($input->iEventorId))
  {
  $whereEventorId = "";
}
else
{
  $whereEventorId = " AND EVENTOR_ID = " . $input->iEventorId;
}

if ($input->iType == "EVENT" || $input->iType == "COMPETITOR")
{
  $rows = new stdClass();
  $rows->results     = array();
  $rows->teamResults = array();
  $select = "";
  $innerJoin = "";
  $where = "";
  $orderBy = "";
  $raceDate = null;

  if ($input->iType == "EVENT")
  {
    $where = "EVENT_ID = " . $input->iEventId;
    $sql = "SELECT * FROM RACE_EVENT WHERE " . $where;
    $result = \db\mysql_query($sql);
    if (!$result)
    {
      trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
    }

    if (\db\mysql_num_rows($result) > 0)
    {
      while($row = \db\mysql_fetch_assoc($result))
      {
        $rows->eventId                     = intval($row['EVENT_ID']);
        $rows->eventorId                   = intval($row['EVENTOR_ID']);
        $rows->eventorRaceId               = is_null($row['EVENTOR_RACE_ID']) ? NULL : intval($row['EVENTOR_RACE_ID']);
        $rows->name                        = $row['NAME'];
        $rows->organiserName               = $row['ORGANISER_NAME'];
        $rows->raceDate                    = date2String(strtotime($row['RACEDATE']));
        $raceDate                          = $rows->raceDate;
        $rows->raceTime                    = is_null($row['RACETIME']) ? NULL : time2StringWithSeconds(strtotime($row['RACETIME']));
        $rows->sportCode                   = $row['SPORT_CODE'];
        $rows->isRelay                     = boolval($row['IS_RELAY']);
        $rows->eventClassificationId       = $row['EVENT_CLASSIFICATION_ID'];
        $rows->raceLightCondition          = $row['RACE_LIGHT_CONDITION'];
        $rows->raceDistance                = $row['RACE_DISTANCE'];
        $rows->paymentModel                = intval($row['PAYMENT_MODEL']);
        $rows->meetsAwardRequirements      = boolval($row['MEETS_AWARD_REQUIREMENTS']);
        $rows->rankingBasetimePerKilometer = $row['RANKING_BASE_TIME_PER_KILOMETER'];
        $rows->rankingBasepoint            = floatval($row['RANKING_BASE_POINT']);
        $rows->rankingBaseDescription      = $row['RANKING_BASE_DESCRIPTION'];
        $rows->longitude                   = is_null($row['LONGITUDE']) ? NULL : floatval($row['LONGITUDE']);
        $rows->latitude                    = is_null($row['LATITUDE']) ? NULL : floatval($row['LATITUDE']);
        $rows->invoiceVerified             = boolval($row['INVOICE_VERIFIED']);
      }
    }
    \db\mysql_free_result($result);
    $select = "C.EXCLUDE_RESULTS, C.EXCLUDE_TIME, C.FIRST_NAME, C.LAST_NAME, C.GENDER, ";
    $innerJoin = " INNER JOIN RACE_COMPETITORS C ON (R.COMPETITOR_ID = C.COMPETITOR_ID) ";
  }
  else
  {
    $select = "C.EXCLUDE_RESULTS, C.EXCLUDE_TIME, E.EVENT_ID, E.EVENTOR_ID, E.EVENTOR_RACE_ID, E.NAME, E.ORGANISER_NAME, E.RACEDATE, E.RACETIME, E.SPORT_CODE, E.EVENT_CLASSIFICATION_ID, E.RACE_LIGHT_CONDITION, E.RACE_DISTANCE, ";
    $where = " R.COMPETITOR_ID = " . $input->iCompetitorId . $whereStartDate . $whereEndDate;
    $innerJoin = " INNER JOIN RACE_COMPETITORS C ON (R.COMPETITOR_ID = C.COMPETITOR_ID) INNER JOIN RACE_EVENT E ON (R.EVENT_ID = E.EVENT_ID) ";
    $orderBy = " ORDER BY E.RACEDATE, E.RACETIME ";
  }

  $sql = "SELECT " . $select . "R.*, MD.MULTI_DAY_RESULT_ID, MD.STAGE, MD.TOTAL_STAGES, " .
    "  MD.TOTAL_LENGTH_IN_METER, MD.TOTAL_FAILED_REASON, MD.TOTAL_TIME, " .
    "  MD.TOTAL_WINNER_TIME, MD.TOTAL_SECOND_TIME, " .
    "  MD.TOTAL_POSITION, MD.TOTAL_NOF_STARTS_IN_CLASS " .
    "FROM RACE_EVENT_RESULTS AS R " . $innerJoin .
    "LEFT OUTER JOIN RACE_EVENT_RESULTS_MULTI_DAY AS MD ON (R.RESULT_ID = MD.RESULT_ID) " .
    "WHERE " . $where . $orderBy;
  $result = \db\mysql_query($sql);

  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      if ($input->iType == "COMPETITOR")
      {
        $x->eventId                     = intval($row['EVENT_ID']);
        $x->eventorId                   = intval($row['EVENTOR_ID']);
        $x->eventorRaceId               = is_null($row['EVENTOR_RACE_ID']) ? NULL : intval($row['EVENTOR_RACE_ID']);
        $x->name                        = $row['NAME'];
        $x->organiserName               = $row['ORGANISER_NAME'];
        $x->raceDate                    = date2String(strtotime($row['RACEDATE']));
        $raceDate                       = $x->raceDate;
        $x->raceTime                    = is_null($row['RACETIME']) ? NULL : time2StringWithSeconds(strtotime($row['RACETIME']));
        $x->sportCode                   = $row['SPORT_CODE'];
        $x->eventClassificationId       = $row['EVENT_CLASSIFICATION_ID'];
        $x->raceLightCondition          = $row['RACE_LIGHT_CONDITION'];
        $x->raceDistance                = $row['RACE_DISTANCE'];
      }
      $x->resultId                     = intval($row['RESULT_ID']);
      $x->competitorId                 = intval($row['COMPETITOR_ID']);
      $excludeResults                  = false;

      if (!$isCoach && (strcasecmp($row['EXCLUDE_RESULTS'], 'YES') == 0 || (!is_null($row['EXCLUDE_TIME']) && $raceDate < date2String(strtotime($row['EXCLUDE_TIME'])))))
      {
        $excludeResults = true;
      }

      if ($input->iType == "EVENT")
      {
        $x->firstName                    = $row['FIRST_NAME'];
        $x->lastName                     = $row['LAST_NAME'];
        $x->gender                       = $row['GENDER'];
      }
      $x->className                    = $row['CLASS_NAME'];
      $x->deviantEventClassificationId = $row['DEVIANT_EVENT_CLASSIFICATION_ID'];
      $x->classClassificationId        = intval($row['CLASS_CLASSIFICATION_ID']);
      $x->difficulty                   = $excludeResults ? NULL : $row['DIFFICULTY'];
      $x->lengthInMeter                = $excludeResults ? NULL : (is_null($row['LENGTH_IN_METER']) ? NULL : intval($row['LENGTH_IN_METER']));
      $x->failedReason                 = $excludeResults && is_null($row['FAILED_REASON']) ? 'FULLFÖ' : $row['FAILED_REASON'];
      $x->competitorTime               = $excludeResults ? NULL : (is_null($row['COMPETITOR_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['COMPETITOR_TIME'])));
      $x->winnerTime                   = $excludeResults ? NULL : (is_null($row['WINNER_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['WINNER_TIME'])));
      $x->secondTime                   = $excludeResults ? NULL : (is_null($row['SECOND_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['SECOND_TIME'])));
      $x->position                     = $excludeResults ? NULL : (is_null($row['POSITION']) ? NULL : intval($row['POSITION']));
      $x->nofStartsInClass             = $excludeResults ? NULL : (is_null($row['NOF_STARTS_IN_CLASS']) ? NULL : intval($row['NOF_STARTS_IN_CLASS']));
      $x->originalFee                  = is_null($row['ORIGINAL_FEE']) ? NULL : floatval($row['ORIGINAL_FEE']);
      $x->lateFee                      = is_null($row['LATE_FEE']) ? NULL : floatval($row['LATE_FEE']);
      $x->feeToClub                    = is_null($row['FEE_TO_CLUB']) ? NULL : floatval($row['FEE_TO_CLUB']);
      $x->serviceFeeToClub             = floatval($row['SERVICEFEE_TO_CLUB']);
      $x->serviceFeeDescription        = $row['SERVICEFEE_DESCRIPTION'];
      $x->award                        = $excludeResults ? NULL : $row['AWARD'];
      $x->points                       = $excludeResults ? NULL : (is_null($row['POINTS']) ? NULL : intval($row['POINTS']));
      $x->pointsOld                    = $excludeResults ? NULL : (is_null($row['POINTS_OLD']) ? NULL : intval($row['POINTS_OLD']));
      $x->points1000                   = $excludeResults ? NULL : (is_null($row['POINTS_1000']) ? NULL : intval($row['POINTS_1000']));
      $x->ranking                      = $excludeResults ? NULL : (is_null($row['RANKING']) ? NULL : floatval($row['RANKING']));
      $x->missingTime                  = $excludeResults ? NULL : $row['MISSING_TIME'];
      $x->speedRanking                 = $excludeResults ? NULL : (is_null($row['SPEED_RANKING']) ? NULL : floatval($row['SPEED_RANKING']));
      $x->technicalRanking             = $excludeResults ? NULL : (is_null($row['TECHNICAL_RANKING']) ? NULL : floatval($row['TECHNICAL_RANKING']));

      if (is_null($row['MULTI_DAY_RESULT_ID']) || $excludeResults)
      {
        $x->resultMultiDay = NULL;
      }
      else
      {
        $x->resultMultiDay = new stdClass();
        $x->resultMultiDay->multiDayResultId      = intval($row['MULTI_DAY_RESULT_ID']);
        $x->resultMultiDay->stage                 = is_null($row['STAGE']) ? NULL : intval($row['STAGE']);
        $x->resultMultiDay->totalStages           = is_null($row['TOTAL_STAGES']) ? NULL : intval($row['TOTAL_STAGES']);
        $x->resultMultiDay->totalLengthInMeter    = is_null($row['TOTAL_LENGTH_IN_METER']) ? NULL : intval($row['TOTAL_LENGTH_IN_METER']);
        $x->resultMultiDay->totalFailedReason     = $row['TOTAL_FAILED_REASON'];
        $x->resultMultiDay->totalTime             = is_null($row['TOTAL_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['TOTAL_TIME']));
        $x->resultMultiDay->totalWinnerTime       = is_null($row['TOTAL_WINNER_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['TOTAL_WINNER_TIME']));
        $x->resultMultiDay->totalSecondTime       = is_null($row['TOTAL_SECOND_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['TOTAL_SECOND_TIME']));
        $x->resultMultiDay->totalPosition         = is_null($row['TOTAL_POSITION']) ? NULL : intval($row['TOTAL_POSITION']);
        $x->resultMultiDay->totalNofStartsInClass = is_null($row['TOTAL_NOF_STARTS_IN_CLASS']) ? NULL : intval($row['TOTAL_NOF_STARTS_IN_CLASS']);
      }
      array_push($rows->results, $x);
    }
  }
  \db\mysql_free_result($result);

  $sql = "SELECT " . $select . "R.* FROM RACE_EVENT_RESULTS_TEAM R " . $innerJoin . " WHERE " . $where . $orderBy;
  $result = \db\mysql_query($sql);

  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      if ($input->iType == "COMPETITOR")
      {
        $x->eventId                     = intval($row['EVENT_ID']);
        $x->eventorId                   = intval($row['EVENTOR_ID']);
        $x->eventorRaceId               = is_null($row['EVENTOR_RACE_ID']) ? NULL : intval($row['EVENTOR_RACE_ID']);
        $x->name                        = $row['NAME'];
        $x->organiserName               = $row['ORGANISER_NAME'];
        $x->raceDate                    = date2String(strtotime($row['RACEDATE']));
        $x->raceTime                    = is_null($row['RACETIME']) ? NULL : time2StringWithSeconds(strtotime($row['RACETIME']));
        $x->sportCode                   = $row['SPORT_CODE'];
        $x->eventClassificationId       = $row['EVENT_CLASSIFICATION_ID'];
        $x->raceLightCondition          = $row['RACE_LIGHT_CONDITION'];
        $x->raceDistance                = $row['RACE_DISTANCE'];
      }
      $x->teamResultId                 = intval($row['TEAM_RESULT_ID']);
      $x->className                    = $row['CLASS_NAME'];
      $x->deviantEventClassificationId = $row['DEVIANT_EVENT_CLASSIFICATION_ID'];
      $x->classClassificationId        = intval($row['CLASS_CLASSIFICATION_ID']);
      $x->teamName                     = $row['TEAM_NAME'];
      $x->competitorId                 = intval($row['COMPETITOR_ID']);
      $excludeResults                  = false;
      
      if (!$isCoach && (strcasecmp($row['EXCLUDE_RESULTS'], 'YES') == 0 || (!is_null($row['EXCLUDE_TIME']) && $raceDate < date2String(strtotime($row['EXCLUDE_TIME'])))))
      {
        $excludeResults = true;
      }
      
      $x->difficulty                   = $excludeResults ? NULL : $row['DIFFICULTY'];
      if ($input->iType == "EVENT")
      {
        $x->firstName                    = $row['FIRST_NAME'];
        $x->lastName                     = $row['LAST_NAME'];
        $x->gender                       = $row['GENDER'];
      }
      $x->lengthInMeter                = $excludeResults ? NULL : (is_null($row['LENGTH_IN_METER']) ? NULL : intval($row['LENGTH_IN_METER']));
      $x->failedReason                 = $excludeResults && is_null($row['FAILED_REASON']) ? 'FULLFÖ' : $row['FAILED_REASON'];
      $x->teamFailedReason             = $row['TEAM_FAILED_REASON'];
      $x->competitorTime               = $excludeResults ? NULL : (is_null($row['COMPETITOR_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['COMPETITOR_TIME'])));
      $x->winnerTime                   = $excludeResults ? NULL : (is_null($row['WINNER_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['WINNER_TIME'])));
      $x->secondTime                   = $excludeResults ? NULL : (is_null($row['SECOND_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['SECOND_TIME'])));
      $x->position                     = $excludeResults ? NULL : (is_null($row['POSITION']) ? NULL : intval($row['POSITION']));
      $x->nofStartsInClass             = $excludeResults ? NULL : (is_null($row['NOF_STARTS_IN_CLASS']) ? NULL : intval($row['NOF_STARTS_IN_CLASS']));
      $x->stage                        = is_null($row['STAGE']) ? NULL : intval($row['STAGE']);
      $x->totalStages                  = is_null($row['TOTAL_STAGES']) ? NULL : intval($row['TOTAL_STAGES']);
      $x->deviantRaceLightCondition    = $row['DEVIANT_RACE_LIGHT_CONDITION'];
      $x->deltaPositions               = $excludeResults ? NULL : (is_null($row['DELTA_POSITIONS']) ? NULL : intval($row['DELTA_POSITIONS']));
      $x->deltaTimeBehind              = $excludeResults ? NULL : $row['DELTA_TIME_BEHIND'];
      $x->totalStagePosition           = $excludeResults ? NULL : (is_null($row['TOTAL_STAGE_POSITION']) ? NULL : intval($row['TOTAL_STAGE_POSITION']));
      $x->totalStageTimeBehind         = $excludeResults ? NULL : $row['TOTAL_STAGE_TIME_BEHIND'];
      $x->totalPosition                = $excludeResults ? NULL : (is_null($row['TOTAL_POSITION']) ? NULL : intval($row['TOTAL_POSITION']));
      $x->totalNofStartsInClass        = $excludeResults ? NULL : (is_null($row['TOTAL_NOF_STARTS_IN_CLASS']) ? NULL : intval($row['TOTAL_NOF_STARTS_IN_CLASS']));
      $x->totalTimeBehind              = $excludeResults ? NULL : $row['TOTAL_TIME_BEHIND'];
      $x->points1000                   = $excludeResults ? NULL : (is_null($row['POINTS_1000']) ? NULL : intval($row['POINTS_1000']));
      $x->ranking                      = $excludeResults ? NULL : (is_null($row['RANKING']) ? NULL : floatval($row['RANKING']));
      $x->missingTime                  = $excludeResults ? NULL : $row['MISSING_TIME'];
      $x->speedRanking                 = $excludeResults ? NULL : (is_null($row['SPEED_RANKING']) ? NULL : floatval($row['SPEED_RANKING']));
      $x->technicalRanking             = $excludeResults ? NULL : (is_null($row['TECHNICAL_RANKING']) ? NULL : floatval($row['TECHNICAL_RANKING']));
      $x->serviceFeeToClub             = floatval($row['SERVICEFEE_TO_CLUB']);
      $x->serviceFeeDescription        = $row['SERVICEFEE_DESCRIPTION'];
      array_push($rows->teamResults, $x);
    }
  }
}
elseif ($input->iType == "EVENTS")
{
  if ($input->iIncludeFees)
    $sql = "SELECT RACE_EVENT.EVENT_ID, EVENTOR_ID, EVENTOR_RACE_ID, NAME, RACEDATE, RACETIME, IS_RELAY, INVOICE_VERIFIED, FEE, FEE_TO_CLUB, SERVICEFEE_TO_CLUB " .
      "FROM RACE_EVENT " .
      "LEFT OUTER JOIN (" .
      "  SELECT EVENT_ID, SUM(ORIGINAL_FEE + LATE_FEE) AS FEE, SUM(FEE_TO_CLUB) AS FEE_TO_CLUB, SUM(SERVICEFEE_TO_CLUB) AS SERVICEFEE_TO_CLUB " .
      "  FROM RACE_EVENT_RESULTS " .
      "  GROUP BY EVENT_ID " .
      "  UNION ALL " .
      "  SELECT EVENT_ID, 0 AS FEE, 0 AS FEE_TO_CLUB, SUM(SERVICEFEE_TO_CLUB) AS SERVICEFEE_TO_CLUB " .
      "  FROM RACE_EVENT_RESULTS_TEAM " .
      "  GROUP BY EVENT_ID " .
      ") ALL_RACE_EVENT_RESULTS ON (RACE_EVENT.EVENT_ID = ALL_RACE_EVENT_RESULTS.EVENT_ID) " .
      "WHERE 1=1" . $whereStartDate . $whereEndDate . $whereEventorId . " ORDER BY RACEDATE ASC";
  else
    $sql = "SELECT EVENT_ID, EVENTOR_ID, EVENTOR_RACE_ID, NAME, RACEDATE, RACETIME, IS_RELAY, INVOICE_VERIFIED " .
      "FROM RACE_EVENT " .
      "WHERE 1=1" . $whereStartDate . $whereEndDate . $whereEventorId . " ORDER BY RACEDATE ASC";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->eventId               = intval($row['EVENT_ID']);
      $x->eventorId             = intval($row['EVENTOR_ID']);
      $x->eventorRaceId         = is_null($row['EVENTOR_RACE_ID']) ? NULL : intval($row['EVENTOR_RACE_ID']);
      $x->name                  = $row['NAME'];
      $x->date                  = date2String(strtotime($row['RACEDATE']));
      $x->time                  = is_null($row['RACETIME']) ? NULL : time2StringWithSeconds(strtotime($row['RACETIME']));
      $x->isRelay               = boolval($row['IS_RELAY']);
      $x->invoiceVerified       = boolval($row['INVOICE_VERIFIED']);
      if ($input->iIncludeFees) {
        $x->fee = is_null($row['FEE']) ? NULL : floatval($row['FEE']);
        $x->feeToClub = is_null($row['FEE_TO_CLUB']) ? NULL : floatval($row['FEE_TO_CLUB']);
        $x->serviceFeeToClub = is_null($row['SERVICEFEE_TO_CLUB']) ? NULL : floatval($row['SERVICEFEE_TO_CLUB']);
      }
      array_push($rows, $x);
    }
  }
}
elseif ($input->iType == "CLUBS")
{
  $eventClassifications = array();
  $clubs = array();

  $sql = "SELECT * FROM RACE_EVENT_CLASSIFICATION";
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->eventClassificationId = $row['EVENT_CLASSIFICATION_ID'];
      $x->description           = $row['DESCRIPTION'];
      $x->basePoint             = intval($row['BASE_POINT']);
      $x->base1000Point         = intval($row['BASE_1000_POINT']);
      $x->oldBasePoint          = intval($row['OLD_BASE_POINT']);
      $x->oldPositionBasePoint  = intval($row['OLD_POSITION_BASE_POINT']);
      $x->classClassifications  = array();

      $sql2 = "SELECT * FROM RACE_CLASS_CLASSIFICATION WHERE EVENT_CLASSIFICATION_ID = '" . $x->eventClassificationId . "' ORDER BY DECREASE_BASE_POINT ASC";
      $result2 = \db\mysql_query($sql2);
      if (!$result2)
      {
        trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
      }
    
      if (\db\mysql_num_rows($result2) > 0)
      {
        while($row2 = \db\mysql_fetch_assoc($result2))
        {
          $y = new stdClass();
          $y->classClassificationId = intval($row2['CLASS_CLASSIFICATION_ID']);
          $y->description           = $row2['DESCRIPTION'];
          $y->classTypeShortName    = is_null($row2['CLASSTYPE_SHORTNAME']) ? NULL : $row2['CLASSTYPE_SHORTNAME'];
          $y->ageUpperLimit         = is_null($row2['AGE_UPPER_LIMIT']) ? NULL : intval($row2['AGE_UPPER_LIMIT']);
          $y->ageLowerLimit         = is_null($row2['AGE_LOWER_LIMIT']) ? NULL : intval($row2['AGE_LOWER_LIMIT']);
          $y->decreaseBasePoint     = intval($row2['DECREASE_BASE_POINT']);
          $y->decreaseBase1000Point = intval($row2['DECREASE_BASE_1000_POINT']);
          $y->decreaseOldBasePoint  = intval($row2['DECREASE_OLD_BASE_POINT']);
          array_push($x->classClassifications, $y);
        }
      }
      \db\mysql_free_result($result2);

      array_push($eventClassifications, $x);
    }
  }
  \db\mysql_free_result($result);

  $sql = "SELECT * FROM RACE_CLUBS";
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->clubId                = intval($row['CLUB_ID']);
      $x->name                  = $row['CLUB_NAME'];
      $x->eventorOrganisationId = intval($row['EVENTOR_ORGANISATION_ID']);
      $x->competitors           = array();
      $x->families              = array();

      $sql2 = "SELECT * FROM RACE_COMPETITORS INNER JOIN RACE_COMPETITORS_CLUB ON (RACE_COMPETITORS.COMPETITOR_ID = RACE_COMPETITORS_CLUB.COMPETITOR_ID) WHERE CLUB_ID = " . $x->clubId;
      $result2 = \db\mysql_query($sql2);
      if (!$result2)
      {
        trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
      }
    
      if (\db\mysql_num_rows($result2) > 0)
      {
        while($row2 = \db\mysql_fetch_assoc($result2))
        {
          $y = new stdClass();
          $y->competitorId         = intval($row2['COMPETITOR_ID']);
          $y->firstName            = $row2['FIRST_NAME'];
          $y->lastName             = $row2['LAST_NAME'];
          $y->familyId             = is_null($row2['FAMILY_ID']) ? NULL : intval($row2['FAMILY_ID']);
          $y->birthDay             = $row2['BIRTHDAY'];
          $y->gender               = $row2['GENDER'];
          $y->excludeResults       = strcasecmp($row2['EXCLUDE_RESULTS'], 'YES') == 0;
          $y->excludeTime          = is_null($row2['EXCLUDE_TIME']) ? NULL : date2String(strtotime($row2['EXCLUDE_TIME']));
          $y->startDate            = is_null($row2['START_DATE']) ? NULL : date2String(strtotime($row2['START_DATE']));
          $y->endDate              = is_null($row2['END_DATE']) ? NULL : date2String(strtotime($row2['END_DATE']));
          $y->eventorCompetitorIds = array();

          $sql3 = "SELECT * FROM RACE_COMPETITORS_EVENTOR WHERE COMPETITOR_ID = " . $y->competitorId;
          $result3 = \db\mysql_query($sql3);
          if (!$result3)
          {
            trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
          }
        
          if (\db\mysql_num_rows($result3) > 0)
          {
            while($row3 = \db\mysql_fetch_assoc($result3))
            {
              array_push($y->eventorCompetitorIds, intval($row3['EVENTOR_COMPETITOR_ID']));
            }    
          }
          \db\mysql_free_result($result3);
          array_push($x->competitors, $y);
        }
      }
      \db\mysql_free_result($result2);
  
      $sql2 = "SELECT * FROM RACE_FAMILIES WHERE FAMILY_ID IN (SELECT FAMILY_ID FROM RACE_COMPETITORS INNER JOIN RACE_COMPETITORS_CLUB ON (RACE_COMPETITORS.COMPETITOR_ID = RACE_COMPETITORS_CLUB.COMPETITOR_ID) WHERE CLUB_ID = " . $x->clubId . ")";
      $result2 = \db\mysql_query($sql2);
      if (!$result2)
      {
        trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
      }
    
      if (\db\mysql_num_rows($result2) > 0)
      {
        while($row2 = \db\mysql_fetch_assoc($result2))
        {
          $y = new stdClass();
          $y->familyId             = intval($row2['FAMILY_ID']);
          $y->familyName           = $row2['FAMILY_NAME'];
          array_push($x->families, $y);
        }
      }
      \db\mysql_free_result($result2);

      array_push($clubs, $x);
    }

    $domainClassLevel = new stdClass();
    $domainClassLevel->name = "RACE_CLASS_LEVEL";
    $domainClassLevel->values = array();
    $sql = "SELECT * FROM RACE_CLASS_LEVEL ORDER BY SHORTNAME ASC";
    $result = \db\mysql_query($sql);
    if (!$result)
    {
      trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
    }
  
    if (\db\mysql_num_rows($result) > 0)
    {
      while($row = \db\mysql_fetch_assoc($result))
      {
        $x = new stdClass();
        $x->classShortName       = $row['SHORTNAME'];
        $x->classTypeShortName   = $row['CLASSTYPE_SHORTNAME'];
        $x->age                  = intval($row['AGE']);
        $x->difficulty           = $row['DIFFICULTY'];
        array_push($domainClassLevel->values, $x);
      }
    }
    
    $sports = new stdClass();
    $sports->name = "RACE_SPORT";
    $sports->values = array();
    $sql = "SELECT * FROM RACE_SPORT ORDER BY DESCRIPTION ASC";
    $result = \db\mysql_query($sql);
    if (!$result)
    {
      trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
    }
  
    if (\db\mysql_num_rows($result) > 0)
    {
      while($row = \db\mysql_fetch_assoc($result))
      {
        $x = new stdClass();
        $x->sportCode     = $row['SPORT_CODE'];
        $x->description   = $row['DESCRIPTION'];
        array_push($sports->values, $x);
      }
    }

    $rows = new stdClass();
    $rows->clubs                = $clubs;
    $rows->eventClassifications = $eventClassifications;
    $rows->classLevels          = $domainClassLevel->values;
    $rows->sports               = $sports->values;
  }
}
elseif ($input->iType == "TOP")
{
  if(!isset($input->iBirthDate) || $input->iBirthDate == "" || $input->iBirthDate == "null")
  {
    $input->iBirthDate = mktime(0, 0, 0, 1, 1, 1900);
  }
  else
  {
    $input->iBirthDate = string2Date($input->iBirthDate);
  }

  $sql = "SELECT COMPETITOR_ID, FIRST_NAME, LAST_NAME, GENDER, BIRTHDAY, AVG(RANKING) AS AVG_RANKING " .
    "FROM (SELECT RACE_EVENT_RESULTS.COMPETITOR_ID, FIRST_NAME, LAST_NAME, GENDER, BIRTHDAY, " .
    "             rank() OVER ( partition by COMPETITOR_ID order by RANKING ASC ) AS ranking_order, RANKING " .
    "      FROM (SELECT COMPETITOR_ID, RACEDATE, LEAST(RANKING, 150.0) AS RANKING " .
    "            FROM RACE_EVENT  " .
    "            INNER JOIN RACE_EVENT_RESULTS ON (RACE_EVENT.EVENT_ID = RACE_EVENT_RESULTS.EVENT_ID) " .
    "            WHERE RANKING IS NOT NULL " . $whereStartDate . $whereEndDate .
    "            UNION ALL " .
    "            SELECT COMPETITOR_ID, RACEDATE, LEAST(RANKING, 150.0) AS RANKING " .
    "            FROM RACE_EVENT " .
    "            INNER JOIN RACE_EVENT_RESULTS_TEAM ON (RACE_EVENT.EVENT_ID = RACE_EVENT_RESULTS_TEAM.EVENT_ID) " .
    "            WHERE RANKING IS NOT NULL " . $whereStartDate . $whereEndDate . ") RACE_EVENT_RESULTS " .
    "      INNER JOIN RACE_COMPETITORS ON (RACE_EVENT_RESULTS.COMPETITOR_ID = RACE_COMPETITORS.COMPETITOR_ID) " .
    "      INNER JOIN RACE_COMPETITORS_CLUB ON (RACE_COMPETITORS.COMPETITOR_ID = RACE_COMPETITORS_CLUB.COMPETITOR_ID) " .
    "      WHERE (END_DATE > CURDATE() OR END_DATE IS NULL) AND DATE_FORMAT(BIRTHDAY, '%Y-%m-%d') <= '" . date2String($input->iBirthDate) . "' " .
    ($isCoach ? "" : "        AND (UPPER(EXCLUDE_RESULTS) = 'NO' AND (EXCLUDE_TIME IS NULL OR DATE_FORMAT(EXCLUDE_TIME, '%Y-%m-%d') <= DATE_FORMAT(RACEDATE, '%Y-%m-%d'))) ") .
    ") ALL_RESULTS " .
    "WHERE ranking_order <= 6 " .
    "GROUP BY COMPETITOR_ID, FIRST_NAME, LAST_NAME, GENDER, BIRTHDAY " .
    "HAVING AVG(RANKING) < 150.0 " .
    "ORDER BY AVG(RANKING) ASC";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->competitorId          = intval($row['COMPETITOR_ID']);
      $x->name                  = $row['FIRST_NAME'] . " " . $row['LAST_NAME'];
      $x->gender                = $row['GENDER'];
      $x->birthYear             = intval(date("Y", strtotime($row['BIRTHDAY'])));
      $x->ranking               = is_null($row['AVG_RANKING']) ? NULL : floatval($row['AVG_RANKING']);
      array_push($rows, $x);
    }
  }
}
elseif ($input->iType == "POINTS")
{
  $sql = "SELECT RACE_EVENT_RESULTS.COMPETITOR_ID, FIRST_NAME, LAST_NAME, GENDER, BIRTHDAY, " .
    "   GROUP_CONCAT(POINTS SEPARATOR ',') AS POINTS," .
    "   GROUP_CONCAT(POINTS_OLD SEPARATOR ',') AS POINTS_OLD," .
    "   GROUP_CONCAT(POINTS_1000 SEPARATOR ',') AS POINTS_1000," .
    "   GROUP_CONCAT(LEAST(RANKING, 150.0) SEPARATOR ',') AS RANKING," .
    "   GROUP_CONCAT(LEAST(SPEED_RANKING, 150.0) SEPARATOR ',') AS SPEED_RANKING," .
    "   GROUP_CONCAT(LEAST(TECHNICAL_RANKING, 150.0) SEPARATOR ',') AS TECHNICAL_RANKING," .
    "   GROUP_CONCAT(LEAST(RANKING_RELAY, 150.0) SEPARATOR ',') AS RANKING_RELAY " .
    "FROM (SELECT COMPETITOR_ID, RACEDATE, POINTS, POINTS_OLD, POINTS_1000, RANKING, SPEED_RANKING, TECHNICAL_RANKING, NULL AS RANKING_RELAY FROM RACE_EVENT " .
    "      INNER JOIN RACE_EVENT_RESULTS ON (RACE_EVENT.EVENT_ID = RACE_EVENT_RESULTS.EVENT_ID) ".
    "      WHERE (POINTS IS NOT NULL OR POINTS_OLD IS NOT NULL OR POINTS_1000 IS NOT NULL OR RANKING IS NOT NULL)" . $whereStartDate . $whereEndDate . " " .
    "      UNION ALL " .
    "      SELECT COMPETITOR_ID, RACEDATE, NULL AS POINTS, NULL AS POINTS_OLD, POINTS_1000, RANKING, SPEED_RANKING, TECHNICAL_RANKING, RANKING AS RANKING_RELAY FROM RACE_EVENT " .
    "      INNER JOIN RACE_EVENT_RESULTS_TEAM ON (RACE_EVENT.EVENT_ID = RACE_EVENT_RESULTS_TEAM.EVENT_ID) ".
    "      WHERE (POINTS_1000 IS NOT NULL OR RANKING IS NOT NULL)" . $whereStartDate . $whereEndDate . ") RACE_EVENT_RESULTS " .
    "INNER JOIN RACE_COMPETITORS ON (RACE_EVENT_RESULTS.COMPETITOR_ID = RACE_COMPETITORS.COMPETITOR_ID) " .
    "WHERE (UPPER(EXCLUDE_RESULTS) = 'NO' AND (EXCLUDE_TIME IS NULL OR DATE_FORMAT(EXCLUDE_TIME, '%Y-%m-%d') <= DATE_FORMAT(RACEDATE, '%Y-%m-%d'))) " .
    "GROUP BY RACE_EVENT_RESULTS.COMPETITOR_ID, FIRST_NAME, LAST_NAME, GENDER, BIRTHDAY";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->competitorId          = intval($row['COMPETITOR_ID']);
      $x->name                  = $row['FIRST_NAME'] . " " . $row['LAST_NAME'];
      $x->gender                = $row['GENDER'];
      $x->birthYear             = intval(date("Y", strtotime($row['BIRTHDAY'])));
      $x->points                = is_null($row['POINTS']) ? array() : array_map('intval', explode(",", $row['POINTS']));
      $x->pointsOld             = is_null($row['POINTS_OLD']) ? array() : array_map('intval', explode(",", $row['POINTS_OLD']));
      $x->points1000            = is_null($row['POINTS_1000']) ? array() : array_map('intval', explode(",", $row['POINTS_1000']));
      $x->ranking               = is_null($row['RANKING']) ? array() : array_map('floatval', explode(",", $row['RANKING']));
      $x->speedRanking          = is_null($row['SPEED_RANKING']) ? array() : array_map('floatval', explode(",", $row['SPEED_RANKING']));
      $x->technicalRanking      = is_null($row['TECHNICAL_RANKING']) ? array() : array_map('floatval', explode(",", $row['TECHNICAL_RANKING']));
      $x->rankingRelay          = is_null($row['RANKING_RELAY']) ? array() : array_map('floatval', explode(",", $row['RANKING_RELAY']));
      rsort($x->points);
      rsort($x->pointsOld);
      rsort($x->points1000);
      sort($x->ranking);
      sort($x->speedRanking);
      sort($x->technicalRanking);
      sort($x->rankingRelay);
      array_push($rows, $x);
    }
  }
}
elseif ($input->iType == "FEES")
{
  $sql = "SELECT RACE_EVENT_RESULTS.COMPETITOR_ID, FIRST_NAME, LAST_NAME," .
    "   SUM(ORIGINAL_FEE) AS ORIGINAL_FEE," .
    "   SUM(LATE_FEE) AS LATE_FEE," .
    "   SUM(FEE_TO_CLUB) AS FEE_TO_CLUB, " .
    "   SUM(SERVICEFEE_TO_CLUB) AS SERVICEFEE_TO_CLUB " .
    "FROM RACE_EVENT " .
    "INNER JOIN RACE_EVENT_RESULTS ON (RACE_EVENT.EVENT_ID = RACE_EVENT_RESULTS.EVENT_ID) ".
    "INNER JOIN RACE_COMPETITORS ON (RACE_EVENT_RESULTS.COMPETITOR_ID = RACE_COMPETITORS.COMPETITOR_ID) ".
    "WHERE 1=1 " . $whereStartDate . $whereEndDate . " " .
    "GROUP BY RACE_EVENT_RESULTS.COMPETITOR_ID, FIRST_NAME, LAST_NAME " .
    "ORDER BY LAST_NAME, FIRST_NAME";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->competitorId          = intval($row['COMPETITOR_ID']);
      $x->name                  = $row['FIRST_NAME'] . " " . $row['LAST_NAME'];
      $x->originalFee           = is_null($row['ORIGINAL_FEE']) ? NULL : floatval($row['ORIGINAL_FEE']);
      $x->lateFee               = is_null($row['LATE_FEE']) ? NULL : floatval($row['LATE_FEE']);
      $x->feeToClub             = is_null($row['FEE_TO_CLUB']) ? NULL : floatval($row['FEE_TO_CLUB']);
      $x->serviceFeeToClub      = is_null($row['SERVICEFEE_TO_CLUB']) ? NULL : floatval($row['SERVICEFEE_TO_CLUB']);
      array_push($rows, $x);
    }
  }
}
elseif ($input->iType == "COMPETITOR_INFO")
{
  $sql = "SELECT * FROM RACE_COMPETITORS WHERE COMPETITOR_ID = " . $input->iCompetitorId .
    ($isCoach ? "" : " AND (UPPER(EXCLUDE_RESULTS) = 'NO' AND (EXCLUDE_TIME IS NULL OR DATE_FORMAT(EXCLUDE_TIME, '%Y-%m-%d') <= '" . date2String(time()) . "'))");

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  $rows = new stdClass();

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $rows->competitorId = $input->iCompetitorId;
      $rows->seniorAchievements = $row['SENIOR_ACHIEVEMENTS'];
      $rows->juniorAchievements = $row['JUNIOR_ACHIEVEMENTS'];
      $rows->youthAchievements = $row['YOUTH_ACHIEVEMENTS'];
      $rows->thumbnail = $row['THUMBNAIL'];
    }
  }
}
elseif ($input->iType == "STATISTICS")
{
  $sql = "SELECT eventyear, SUM(individual) AS individual, SUM(relay) AS relay " .
    "FROM ( " .
    "SELECT YEAR(racedate) AS eventyear, COUNT(*) AS individual, 0 AS relay " .
    "FROM `RACE_EVENT_RESULTS` AS R " .
    "INNER JOIN RACE_EVENT AS e ON e.EVENT_ID = R.EVENT_ID " .
    "WHERE (`FAILED_REASON` IS NULL OR `FAILED_REASON` != 'EJ START') " .
    "GROUP BY YEAR(racedate) " .
    "UNION ALL " .
    "SELECT  YEAR(racedate) AS eventyear, 0 AS individual, COUNT(*) AS relay " .
    "FROM `RACE_EVENT_RESULTS_TEAM` AS R " .
    "INNER JOIN RACE_EVENT AS e ON e.EVENT_ID = R.EVENT_ID " .
    "WHERE (`FAILED_REASON` IS NULL OR `FAILED_REASON` != 'EJ START') " .
    "GROUP BY YEAR(racedate) " .
    ") AS stat GROUP BY eventyear ORDER BY eventyear";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  $statistics = new stdClass();
  $statistics->typeOfChart = "line";
  $statistics->title = "startsPerYear";
  $statistics->dataKey = "year";
  $statistics->valueKeys = array();
  array_push($statistics->valueKeys, "individual");
  array_push($statistics->valueKeys, "relay");
  $statistics->data = array();

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $data = new stdClass();
      $data->year = intval($row['eventyear']);
      $data->individual = intval($row['individual']);
      $data->relay = intval($row['relay']);
      array_push($statistics->data, $data);
    }
  }
  array_push($rows, $statistics);
  \db\mysql_free_result($result);

  $sql = "SELECT eventyear, " .
    "  SUM(CASE WHEN age <= 16 and gender = 'MALE' THEN competitors ELSE 0 END) AS boy, " .
    "  SUM(CASE WHEN age <= 16 and gender = 'FEMALE' THEN competitors ELSE 0 END) AS girl, " .
    "  SUM(CASE WHEN age >= 17 and age <= 20 and gender = 'MALE' THEN competitors ELSE 0 END) AS juniorman, " .
    "  SUM(CASE WHEN age >= 17 and age <= 20 and gender = 'FEMALE' THEN competitors ELSE 0 END) AS juniorwoman, " .
    "  SUM(CASE WHEN age >= 21 and age <= 64 and gender = 'MALE' THEN competitors ELSE 0 END) AS man, " .
    "  SUM(CASE WHEN age >= 21 and age <= 64 and gender = 'FEMALE' THEN competitors ELSE 0 END) AS woman, " .
    "  SUM(CASE WHEN age >= 65 and gender = 'MALE' THEN competitors ELSE 0 END) AS oldman, " .
    "  SUM(CASE WHEN age >= 65 and gender = 'FEMALE' THEN competitors ELSE 0 END) AS oldwoman " .
    "FROM ( " .
    "SELECT eventyear, gender, eventyear - YEAR(birthday) AS age, COUNT(*) AS competitors " .
    "FROM ( " .
    "SELECT YEAR(racedate) AS eventyear, COMPETITOR_ID " .
    "FROM `RACE_EVENT_RESULTS` AS R " .
    "INNER JOIN RACE_EVENT AS e ON e.EVENT_ID = R.EVENT_ID " .
    "WHERE (`FAILED_REASON` IS NULL OR `FAILED_REASON` != 'EJ START') " .
    "GROUP BY YEAR(racedate), COMPETITOR_ID " .
    "UNION " .
    "SELECT  YEAR(racedate) AS eventyear, COMPETITOR_ID " .
    "FROM `RACE_EVENT_RESULTS_TEAM` AS R " .
    "INNER JOIN RACE_EVENT AS e ON e.EVENT_ID = R.EVENT_ID " .
    "WHERE (`FAILED_REASON` IS NULL OR `FAILED_REASON` != 'EJ START') " .
    "GROUP BY YEAR(racedate), COMPETITOR_ID " .
    ") AS stat " .
    "INNER JOIN RACE_COMPETITORS AS c ON c.COMPETITOR_ID = stat.COMPETITOR_ID " .
    "GROUP BY eventyear, gender, eventyear - YEAR(birthday) " .
    ") AS statouter " .
    "GROUP BY eventyear ORDER BY eventyear";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  $statistics = new stdClass();
  $statistics->typeOfChart = "stackedbar";
  $statistics->title = "competitorsPerAgespan";
  $statistics->dataKey = "year";
  $statistics->valueKeys = array();
  array_push($statistics->valueKeys, "boy");
  array_push($statistics->valueKeys, "girl");
  array_push($statistics->valueKeys, "juniorman");
  array_push($statistics->valueKeys, "juniorwoman");
  array_push($statistics->valueKeys, "man");
  array_push($statistics->valueKeys, "woman");
  array_push($statistics->valueKeys, "oldman");
  array_push($statistics->valueKeys, "oldwoman");
  $statistics->data = array();

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $data = new stdClass();
      $data->year = intval($row['eventyear']);
      $data->boy = intval($row['boy']);
      $data->girl = intval($row['girl']);
      $data->juniorman = intval($row['juniorman']);
      $data->juniorwoman = intval($row['juniorwoman']);
      $data->man = intval($row['man']);
      $data->woman = intval($row['woman']);
      $data->oldman = intval($row['oldman']);
      $data->oldwoman = intval($row['oldwoman']);
      array_push($statistics->data, $data);
    }
  }
  array_push($rows, $statistics);
  \db\mysql_free_result($result);

  $sql = "SELECT eventyear, " .
    "  SUM(CASE WHEN SPORT_CODE = 'OL' and RACE_DISTANCE = 'Relay' THEN eventstarts ELSE 0 END) AS olrelay, " .
    "  SUM(CASE WHEN SPORT_CODE != 'OL' and RACE_DISTANCE = 'Relay' THEN eventstarts ELSE 0 END) AS otherrelay, " .
    "  SUM(CASE WHEN SPORT_CODE = 'OL' and RACE_DISTANCE != 'Relay' and RACE_LIGHT_CONDITION = 'Night' THEN eventstarts ELSE 0 END) AS night, " .
    "  SUM(CASE WHEN SPORT_CODE = 'OL' and RACE_DISTANCE = 'Long' and RACE_LIGHT_CONDITION != 'Night' THEN eventstarts ELSE 0 END) AS longdistance, " .
    "  SUM(CASE WHEN SPORT_CODE = 'OL' and RACE_DISTANCE = 'Middle' and RACE_LIGHT_CONDITION != 'Night' THEN eventstarts ELSE 0 END) AS middle, " .
    "  SUM(CASE WHEN SPORT_CODE = 'OL' and RACE_DISTANCE = 'Sprint' and RACE_LIGHT_CONDITION != 'Night' THEN eventstarts ELSE 0 END) AS sprint, " .
    "  SUM(CASE WHEN SPORT_CODE = 'OL' and RACE_DISTANCE = 'UltraLong' and RACE_LIGHT_CONDITION != 'Night' THEN eventstarts ELSE 0 END) AS ultralong, " .
    "  SUM(CASE WHEN SPORT_CODE = 'SKIO' THEN eventstarts ELSE 0 END) AS skio, " .
    "  SUM(CASE WHEN SPORT_CODE = 'MTBO' THEN eventstarts ELSE 0 END) AS mtbo, " .
    "  SUM(CASE WHEN SPORT_CODE = 'INOL' THEN eventstarts ELSE 0 END) AS indoor, " .
    "  SUM(CASE WHEN SPORT_CODE = 'PREO' THEN eventstarts ELSE 0 END) AS preo, " .
    "  SUM(CASE WHEN SPORT_CODE != 'OL' AND SPORT_CODE != 'SKIO' AND SPORT_CODE != 'MTBO' AND SPORT_CODE != 'INOL' AND SPORT_CODE != 'PREO' THEN eventstarts ELSE 0 END) AS other " .
    "FROM ( " .
    "SELECT YEAR(racedate) AS eventyear, SPORT_CODE, RACE_DISTANCE, RACE_LIGHT_CONDITION, COUNT(*) AS eventstarts " .
    "FROM `RACE_EVENT_RESULTS` AS R " .
    "INNER JOIN RACE_EVENT AS e ON e.EVENT_ID = R.EVENT_ID " .
    "WHERE (`FAILED_REASON` IS NULL OR `FAILED_REASON` != 'EJ START') " .
    "GROUP BY YEAR(racedate), SPORT_CODE, RACE_DISTANCE, RACE_LIGHT_CONDITION " .
    "UNION " .
    "SELECT  YEAR(racedate) AS eventyear, SPORT_CODE, 'Relay' AS RACE_DISTANCE, RACE_LIGHT_CONDITION, COUNT(*) AS eventstarts " .
    "FROM `RACE_EVENT_RESULTS_TEAM` AS R " .
    "INNER JOIN RACE_EVENT AS e ON e.EVENT_ID = R.EVENT_ID " .
    "WHERE (`FAILED_REASON` IS NULL OR `FAILED_REASON` != 'EJ START') " .
    "GROUP BY YEAR(racedate), SPORT_CODE, RACE_DISTANCE, RACE_LIGHT_CONDITION " .
    ") AS stat " .
    "GROUP BY eventyear ORDER BY eventyear";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  $statistics = new stdClass();
  $statistics->typeOfChart = "stackedbar";
  $statistics->title = "startsPerSportAndDistance";
  $statistics->dataKey = "year";
  $statistics->valueKeys = array();
  array_push($statistics->valueKeys, "long");
  array_push($statistics->valueKeys, "relay");
  array_push($statistics->valueKeys, "night");
  array_push($statistics->valueKeys, "middle");
  array_push($statistics->valueKeys, "sprint");
  array_push($statistics->valueKeys, "ultralong");
  array_push($statistics->valueKeys, "skio");
  array_push($statistics->valueKeys, "mtbo");
  array_push($statistics->valueKeys, "indoor");
  array_push($statistics->valueKeys, "preo");
  array_push($statistics->valueKeys, "other");
  array_push($statistics->valueKeys, "otherrelay");
  $statistics->data = array();

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $data = new stdClass();
      $data->year = intval($row['eventyear']);
      $data->relay = intval($row['olrelay']);
      $data->long = intval($row['longdistance']);
      $data->night = intval($row['night']);
      $data->middle = intval($row['middle']);
      $data->sprint = intval($row['sprint']);
      $data->ultralong = intval($row['ultralong']);
      $data->skio = intval($row['skio']);
      $data->mtbo = intval($row['mtbo']);
      $data->indoor = intval($row['indoor']);
      $data->preo = intval($row['preo']);
      $data->other = intval($row['other']);
      $data->otherrelay = intval($row['otherrelay']);
      array_push($statistics->data, $data);
    }
  }
  array_push($rows, $statistics);
  \db\mysql_free_result($result);

  $sql = "SELECT eventyear, " .
    "  ROUND(SUM(CASE WHEN DIFFICULTY = 'Grön' THEN LENGTH_IN_METER ELSE 0 END)/1000) AS green, " .
    "  ROUND(SUM(CASE WHEN DIFFICULTY = 'Vit' THEN LENGTH_IN_METER ELSE 0 END)/1000) AS white, " .
    "  ROUND(SUM(CASE WHEN DIFFICULTY = 'Gul' THEN LENGTH_IN_METER ELSE 0 END)/1000) AS yellow, " .
    "  ROUND(SUM(CASE WHEN DIFFICULTY = 'Orange' THEN LENGTH_IN_METER ELSE 0 END)/1000) AS orange, " .
    "  ROUND(SUM(CASE WHEN DIFFICULTY = 'Röd' THEN LENGTH_IN_METER ELSE 0 END)/1000) AS red, " .
    "  ROUND(SUM(CASE WHEN DIFFICULTY = 'Lila' THEN LENGTH_IN_METER ELSE 0 END)/1000) AS purple, " .
    "  ROUND(SUM(CASE WHEN DIFFICULTY = 'Blå' THEN LENGTH_IN_METER ELSE 0 END)/1000) AS blue, " .
    "  ROUND(SUM(CASE WHEN DIFFICULTY = 'Svart' THEN LENGTH_IN_METER ELSE 0 END)/1000) AS black " .
    "FROM ( " .
      "SELECT YEAR(racedate) AS eventyear, DIFFICULTY, SUM(LENGTH_IN_METER) AS LENGTH_IN_METER " .
    "FROM `RACE_EVENT_RESULTS` AS R " .
    "INNER JOIN RACE_EVENT AS e ON e.EVENT_ID = R.EVENT_ID " .
    "WHERE (`FAILED_REASON` IS NULL OR `FAILED_REASON` = 'FULLFÖ') " .
    "GROUP BY YEAR(racedate), DIFFICULTY " .
    "UNION " .
    "SELECT  YEAR(racedate) AS eventyear, DIFFICULTY, SUM(LENGTH_IN_METER) AS LENGTH_IN_METER " .
    "FROM `RACE_EVENT_RESULTS_TEAM` AS R " .
    "INNER JOIN RACE_EVENT AS e ON e.EVENT_ID = R.EVENT_ID " .
    "WHERE (`TEAM_FAILED_REASON` IS NULL OR `TEAM_FAILED_REASON` = 'FULLFÖ') " .
    "GROUP BY YEAR(racedate), DIFFICULTY " .
    ") AS stat " .
    "GROUP BY eventyear ORDER BY eventyear";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  $statistics = new stdClass();
  $statistics->typeOfChart = "stackedbar";
  $statistics->title = "kmPerLevel";
  $statistics->dataKey = "year";
  $statistics->valueKeys = array();
  $statistics->valueColors = array();
  array_push($statistics->valueKeys, "green");
  array_push($statistics->valueColors, "#30f403");
  array_push($statistics->valueKeys, "white");
  array_push($statistics->valueColors, "#C0C0C0");
  array_push($statistics->valueKeys, "yellow");
  array_push($statistics->valueColors, "#f4df03");
  array_push($statistics->valueKeys, "orange");
  array_push($statistics->valueColors, "#f47e03");
  array_push($statistics->valueKeys, "red");
  array_push($statistics->valueColors, "#f40303");
  array_push($statistics->valueKeys, "purple");
  array_push($statistics->valueColors, "#c603f4");
  array_push($statistics->valueKeys, "blue");
  array_push($statistics->valueColors, "#0303c6");
  array_push($statistics->valueKeys, "black");
  array_push($statistics->valueColors, "#00161f");
  $statistics->data = array();

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $data = new stdClass();
      $data->year = intval($row['eventyear']);
      $data->green = intval($row['green']);
      $data->white = intval($row['white']);
      $data->yellow = intval($row['yellow']);
      $data->orange = intval($row['orange']);
      $data->red = intval($row['red']);
      $data->purple = intval($row['purple']);
      $data->blue = intval($row['blue']);
      $data->black = intval($row['black']);
      array_push($statistics->data, $data);
    }
  }
  array_push($rows, $statistics);
  \db\mysql_free_result($result);

  $sql = "SELECT eventyear, " .
    "  SUM(CASE WHEN POSITION = 1 THEN eventstarts ELSE 0 END) AS gold, " .
    "  SUM(CASE WHEN POSITION = 2 THEN eventstarts ELSE 0 END) AS silver, " .
    "  SUM(CASE WHEN POSITION = 3 THEN eventstarts ELSE 0 END) AS bronze, " .
    "  SUM(CASE WHEN POSITION >= 4 AND POSITION <= 10 THEN eventstarts ELSE 0 END) AS top10, " .
    "  SUM(CASE WHEN POSITION >= 11 AND POSITION <= 30 THEN eventstarts ELSE 0 END) AS top30 " .
    "FROM ( " .
    "SELECT YEAR(racedate) AS eventyear, POSITION, COUNT(*) AS eventstarts " .
    "FROM `RACE_EVENT_RESULTS` AS R " .
    "INNER JOIN RACE_EVENT AS e ON e.EVENT_ID = R.EVENT_ID " .
    "INNER JOIN RACE_CLASS_CLASSIFICATION AS cc ON cc.EVENT_CLASSIFICATION_ID = COALESCE(DEVIANT_EVENT_CLASSIFICATION_ID, e.EVENT_CLASSIFICATION_ID) AND cc.CLASS_CLASSIFICATION_ID = R.CLASS_CLASSIFICATION_ID " .
    "WHERE (`FAILED_REASON` IS NULL OR `FAILED_REASON` = 'FULLFÖ') " .
    "  AND COALESCE(DEVIANT_EVENT_CLASSIFICATION_ID, e.EVENT_CLASSIFICATION_ID) IN ('A', 'B') " .
    "  AND POSITION IS NOT NULL " .
    "  AND POSITION <= 30 " .
    "  AND AGE_LOWER_LIMIT IS NULL " .
    "GROUP BY YEAR(racedate), POSITION " .
    "UNION " .
    "SELECT  YEAR(racedate) AS eventyear, TOTAL_POSITION AS POSITION, COUNT(*) AS eventstarts " .
    "FROM `RACE_EVENT_RESULTS_TEAM` AS R " .
    "INNER JOIN RACE_EVENT AS e ON e.EVENT_ID = R.EVENT_ID " .
    "INNER JOIN RACE_CLASS_CLASSIFICATION AS cc ON cc.EVENT_CLASSIFICATION_ID = COALESCE(DEVIANT_EVENT_CLASSIFICATION_ID, e.EVENT_CLASSIFICATION_ID) AND cc.CLASS_CLASSIFICATION_ID = R.CLASS_CLASSIFICATION_ID " .
    "WHERE (`TEAM_FAILED_REASON` IS NULL OR `TEAM_FAILED_REASON` = 'FULLFÖ') " .
    "  AND COALESCE(DEVIANT_EVENT_CLASSIFICATION_ID, e.EVENT_CLASSIFICATION_ID) IN ('A', 'B') " .
    "  AND TOTAL_POSITION IS NOT NULL " .
    "  AND TOTAL_POSITION <= 30 " .
    "  AND AGE_LOWER_LIMIT IS NULL " .
    "GROUP BY YEAR(racedate), TOTAL_POSITION " .
    ") AS stat " .
    "GROUP BY eventyear ORDER BY eventyear";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  $statistics = new stdClass();
  $statistics->typeOfChart = "stackedbar";
  $statistics->title = "championchips";
  $statistics->dataKey = "year";
  $statistics->valueKeys = array();
  $statistics->valueColors = array();
  array_push($statistics->valueKeys, "gold");
  array_push($statistics->valueColors, "#daa520");
  array_push($statistics->valueKeys, "silver");
  array_push($statistics->valueColors, "#808080");
  array_push($statistics->valueKeys, "bronze");
  array_push($statistics->valueColors, "#b08d57");
  array_push($statistics->valueKeys, "top10");
  array_push($statistics->valueColors, "#0303c6");
  array_push($statistics->valueKeys, "top30");
  array_push($statistics->valueColors, "#00161f");
  $statistics->data = array();

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $data = new stdClass();
      $data->year = intval($row['eventyear']);
      $data->gold = intval($row['gold']);
      $data->silver = intval($row['silver']);
      $data->bronze = intval($row['bronze']);
      $data->top10 = intval($row['top10']);
      $data->top30 = intval($row['top30']);
      array_push($statistics->data, $data);
    }
  }
  array_push($rows, $statistics);
}
else
{
  trigger_error('Wrong iType parameter', E_USER_ERROR);
}

\db\mysql_free_result($result);
CloseDatabase();

header("Access-Control-Allow-Credentials: true");
if (isset($_SERVER['HTTP_ORIGIN']))
{
  header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
}
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");
ini_set( 'precision', 20 );
ini_set( 'serialize_precision', 14 );
echo json_encode($rows);
?>
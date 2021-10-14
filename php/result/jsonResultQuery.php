<?php
//############################################################
//# File:    jsonResultQuery.php                             #
//# Created: 2019-12-25                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iType (Default EVENTS)                     #
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
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

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

if ($input->iType == "EVENT" || $input->iType == "COMPETITOR")
{
  $rows = new stdClass();
  $rows->results     = array();
  $rows->teamResults = array();
  $select = "";
  $innerJoin = "";
  $where = "";
  $orderBy = "";

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
    $select = "C.FIRST_NAME, C.LAST_NAME, C.GENDER, ";
    $innerJoin = " INNER JOIN RACE_COMPETITORS C ON (R.COMPETITOR_ID = C.COMPETITOR_ID) ";
  }
  else
  {
    $select = "E.EVENT_ID, E.EVENTOR_ID, E.EVENTOR_RACE_ID, E.NAME, E.ORGANISER_NAME, E.RACEDATE, E.RACETIME, E.SPORT_CODE, E.EVENT_CLASSIFICATION_ID, E.RACE_LIGHT_CONDITION, E.RACE_DISTANCE, ";
    $where = " COMPETITOR_ID = " . $input->iCompetitorId . $whereStartDate . $whereEndDate;
    $innerJoin = " INNER JOIN RACE_EVENT E ON (R.EVENT_ID = E.EVENT_ID) ";
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
        $x->raceTime                    = is_null($row['RACETIME']) ? NULL : time2StringWithSeconds(strtotime($row['RACETIME']));
        $x->sportCode                   = $row['SPORT_CODE'];
        $x->eventClassificationId       = $row['EVENT_CLASSIFICATION_ID'];
        $x->raceLightCondition          = $row['RACE_LIGHT_CONDITION'];
        $x->raceDistance                = $row['RACE_DISTANCE'];
      }
      $x->resultId                     = intval($row['RESULT_ID']);
      $x->competitorId                 = intval($row['COMPETITOR_ID']);
      if ($input->iType == "EVENT")
      {
        $x->firstName                    = $row['FIRST_NAME'];
        $x->lastName                     = $row['LAST_NAME'];
        $x->gender                       = $row['GENDER'];
      }
      $x->className                    = $row['CLASS_NAME'];
      $x->deviantEventClassificationId = $row['DEVIANT_EVENT_CLASSIFICATION_ID'];
      $x->classClassificationId        = intval($row['CLASS_CLASSIFICATION_ID']);
      $x->difficulty                   = $row['DIFFICULTY'];
      $x->lengthInMeter                = is_null($row['LENGTH_IN_METER']) ? NULL : intval($row['LENGTH_IN_METER']);
      $x->failedReason                 = $row['FAILED_REASON'];
      $x->competitorTime               = is_null($row['COMPETITOR_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['COMPETITOR_TIME']));
      $x->winnerTime                   = is_null($row['WINNER_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['WINNER_TIME']));
      $x->secondTime                   = is_null($row['SECOND_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['SECOND_TIME']));
      $x->position                     = is_null($row['POSITION']) ? NULL : intval($row['POSITION']);
      $x->nofStartsInClass             = is_null($row['NOF_STARTS_IN_CLASS']) ? NULL : intval($row['NOF_STARTS_IN_CLASS']);
      $x->originalFee                  = is_null($row['ORIGINAL_FEE']) ? NULL : floatval($row['ORIGINAL_FEE']);
      $x->lateFee                      = is_null($row['LATE_FEE']) ? NULL : floatval($row['LATE_FEE']);
      $x->feeToClub                    = is_null($row['FEE_TO_CLUB']) ? NULL : floatval($row['FEE_TO_CLUB']);
      $x->serviceFeeToClub             = floatval($row['SERVICEFEE_TO_CLUB']);
      $x->serviceFeeDescription        = $row['SERVICEFEE_DESCRIPTION'];
      $x->award                        = $row['AWARD'];
      $x->points                       = is_null($row['POINTS']) ? NULL : intval($row['POINTS']);
      $x->pointsOld                    = is_null($row['POINTS_OLD']) ? NULL : intval($row['POINTS_OLD']);
      $x->points1000                   = is_null($row['POINTS_1000']) ? NULL : intval($row['POINTS_1000']);
      $x->ranking                      = is_null($row['RANKING']) ? NULL : floatval($row['RANKING']);
      $x->missingTime                  = is_null($row['MISSING_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['MISSING_TIME']));
      $x->speedRanking                 = is_null($row['SPEED_RANKING']) ? NULL : floatval($row['SPEED_RANKING']);
      $x->technicalRanking             = is_null($row['TECHNICAL_RANKING']) ? NULL : floatval($row['TECHNICAL_RANKING']);
      if (is_null($row['MULTI_DAY_RESULT_ID']))
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
      $x->difficulty                   = $row['DIFFICULTY'];
      $x->teamName                     = $row['TEAM_NAME'];
      $x->competitorId                 = intval($row['COMPETITOR_ID']);
      if ($input->iType == "EVENT")
      {
        $x->firstName                    = $row['FIRST_NAME'];
        $x->lastName                     = $row['LAST_NAME'];
        $x->gender                       = $row['GENDER'];
      }
      $x->lengthInMeter                = is_null($row['LENGTH_IN_METER']) ? NULL : intval($row['LENGTH_IN_METER']);
      $x->failedReason                 = $row['FAILED_REASON'];
      $x->teamFailedReason             = $row['TEAM_FAILED_REASON'];
      $x->competitorTime               = is_null($row['COMPETITOR_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['COMPETITOR_TIME']));
      $x->winnerTime                   = is_null($row['WINNER_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['WINNER_TIME']));
      $x->secondTime                   = is_null($row['SECOND_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['SECOND_TIME']));
      $x->position                     = is_null($row['POSITION']) ? NULL : intval($row['POSITION']);
      $x->nofStartsInClass             = is_null($row['NOF_STARTS_IN_CLASS']) ? NULL : intval($row['NOF_STARTS_IN_CLASS']);
      $x->stage                        = is_null($row['STAGE']) ? NULL : intval($row['STAGE']);
      $x->totalStages                  = is_null($row['TOTAL_STAGES']) ? NULL : intval($row['TOTAL_STAGES']);
      $x->deviantRaceLightCondition    = $row['DEVIANT_RACE_LIGHT_CONDITION'];
      $x->deltaPositions               = is_null($row['DELTA_POSITIONS']) ? NULL : intval($row['DELTA_POSITIONS']);
      $x->deltaTimeBehind              = is_null($row['DELTA_TIME_BEHIND']) ? NULL : time2StringWithSeconds(strtotime($row['DELTA_TIME_BEHIND']));
      $x->totalStagePosition           = is_null($row['TOTAL_STAGE_POSITION']) ? NULL : intval($row['TOTAL_STAGE_POSITION']);
      $x->totalStageTimeBehind         = is_null($row['TOTAL_STAGE_TIME_BEHIND']) ? NULL : time2StringWithSeconds(strtotime($row['TOTAL_STAGE_TIME_BEHIND']));
      $x->totalPosition                = is_null($row['TOTAL_POSITION']) ? NULL : intval($row['TOTAL_POSITION']);
      $x->totalNofStartsInClass        = is_null($row['TOTAL_NOF_STARTS_IN_CLASS']) ? NULL : intval($row['TOTAL_NOF_STARTS_IN_CLASS']);
      $x->totalTimeBehind              = is_null($row['TOTAL_TIME_BEHIND']) ? NULL : time2StringWithSeconds(strtotime($row['TOTAL_TIME_BEHIND']));
      $x->points1000                   = is_null($row['POINTS_1000']) ? NULL : intval($row['POINTS_1000']);
      $x->ranking                      = is_null($row['RANKING']) ? NULL : floatval($row['RANKING']);
      $x->missingTime                  = is_null($row['MISSING_TIME']) ? NULL : time2StringWithSeconds(strtotime($row['MISSING_TIME']));
      $x->speedRanking                 = is_null($row['SPEED_RANKING']) ? NULL : floatval($row['SPEED_RANKING']);
      $x->technicalRanking             = is_null($row['TECHNICAL_RANKING']) ? NULL : floatval($row['TECHNICAL_RANKING']);
      $x->serviceFeeToClub             = floatval($row['SERVICEFEE_TO_CLUB']);
      $x->serviceFeeDescription        = $row['SERVICEFEE_DESCRIPTION'];
      array_push($rows->teamResults, $x);
    }
  }
}
elseif ($input->iType == "EVENTS")
{
  $sql = "SELECT * FROM RACE_EVENT WHERE 1=1" . $whereStartDate . $whereEndDate . " ORDER BY RACEDATE ASC";
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
          $y->birthDay             = $row2['BIRTHDAY'];
          $y->gender               = $row2['GENDER'];
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
    "      FROM (SELECT COMPETITOR_ID, LEAST(RANKING, 150.0) AS RANKING " .
    "            FROM RACE_EVENT  " .
    "            INNER JOIN RACE_EVENT_RESULTS ON (RACE_EVENT.EVENT_ID = RACE_EVENT_RESULTS.EVENT_ID) " .
    "            WHERE RANKING IS NOT NULL " . $whereStartDate . $whereEndDate .
    "            UNION ALL " .
    "            SELECT COMPETITOR_ID, LEAST(RANKING, 150.0) AS RANKING " .
    "            FROM RACE_EVENT " .
    "            INNER JOIN RACE_EVENT_RESULTS_TEAM ON (RACE_EVENT.EVENT_ID = RACE_EVENT_RESULTS_TEAM.EVENT_ID) " .
    "            WHERE RANKING IS NOT NULL " . $whereStartDate . $whereEndDate . ") RACE_EVENT_RESULTS " .
    "      INNER JOIN RACE_COMPETITORS ON (RACE_EVENT_RESULTS.COMPETITOR_ID = RACE_COMPETITORS.COMPETITOR_ID) " .
    "      INNER JOIN RACE_COMPETITORS_CLUB ON (RACE_COMPETITORS.COMPETITOR_ID = RACE_COMPETITORS_CLUB.COMPETITOR_ID) " .
    "      WHERE (END_DATE > CURDATE() OR END_DATE IS NULL) AND DATE_FORMAT(BIRTHDAY, '%Y-%m-%d') <= '" . date2String($input->iBirthDate) . "' " .
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
    "FROM (SELECT COMPETITOR_ID, POINTS, POINTS_OLD, POINTS_1000, RANKING, SPEED_RANKING, TECHNICAL_RANKING, NULL AS RANKING_RELAY FROM RACE_EVENT " .
    "      INNER JOIN RACE_EVENT_RESULTS ON (RACE_EVENT.EVENT_ID = RACE_EVENT_RESULTS.EVENT_ID) ".
    "      WHERE (POINTS IS NOT NULL OR POINTS_OLD IS NOT NULL OR POINTS_1000 IS NOT NULL OR RANKING IS NOT NULL)" . $whereStartDate . $whereEndDate . " " .
    "      UNION ALL " .
    "      SELECT COMPETITOR_ID, NULL AS POINTS, NULL AS POINTS_OLD, POINTS_1000, RANKING, SPEED_RANKING, TECHNICAL_RANKING, RANKING AS RANKING_RELAY FROM RACE_EVENT " .
    "      INNER JOIN RACE_EVENT_RESULTS_TEAM ON (RACE_EVENT.EVENT_ID = RACE_EVENT_RESULTS_TEAM.EVENT_ID) ".
    "      WHERE (POINTS_1000 IS NOT NULL OR RANKING IS NOT NULL)" . $whereStartDate . $whereEndDate . ") RACE_EVENT_RESULTS " .
    "INNER JOIN RACE_COMPETITORS ON (RACE_EVENT_RESULTS.COMPETITOR_ID = RACE_COMPETITORS.COMPETITOR_ID) ".
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
  $sql = "SELECT * FROM RACE_COMPETITORS WHERE COMPETITOR_ID = " . $input->iCompetitorId;
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
else
{
  trigger_error('Wrong iType parameter', E_USER_ERROR);
}

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

\db\mysql_free_result($result);

?>
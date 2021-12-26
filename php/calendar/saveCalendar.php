<?php

//############################################################
//# File:    saveCalendar.php                                #
//# Created: 2020-02-16                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2020-02-16  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");

cors();
// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

if(!isset($input->iType))
{
  $input->iType = "";
}
if(!isset($input->queryStartDate) || $input->queryStartDate == "" || $input->queryStartDate == "null")
{
  $input->queryStartDate = null;
}
else
{
  $input->queryStartDate = string2Date($input->queryStartDate);
}
if(!isset($input->queryEndDate) || $input->queryEndDate == "" || $input->queryEndDate == "null")
{
  $input->queryEndDate = null;
}
else
{
  $input->queryEndDate = string2Date($input->queryEndDate);
}

function dateDifference($start_date, $end_date)
{
    $diff = strtotime($end_date) - strtotime($start_date);
    return ceil($diff / 86400);
}

function addDays($date, $days)
{
  return Date("Y-m-d", strtotime($days . ' day', strtotime($date)));
}

ValidLogin();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

OpenDatabase();
  
if ($input->iType == "ACTIVITY")
{
  $x = new stdClass();
  $x->activityId            = getRequestInt($input->iActivityID);
  $x->activityTypeId        = getRequestInt($input->iActivityTypeID);
  $x->groupId               = getRequestInt($input->iGroupID);
  $x->date                  = getRequestDate($input->iActivityDay);
  $x->time                  = getRequestTime($input->iActivityTime);
  $x->activityDurationMinutes = getRequestInt($input->iActivityDurationMinutes);
  $x->place                 = getRequestString($input->iPlace);
  $x->header                = getRequestString($input->iHeader);
  $x->description           = getRequestString($input->iDescr);
  $x->url                   = getRequestString($input->iURL);
  $x->longitude             = getRequestDecimal($input->iLongitude);
  $x->latitude              = getRequestDecimal($input->iLatitude);
  $x->responsibleUserId     = getRequestInt($input->iResponsibleUserID);
  $x->firstRepeatingDate    = getRequestDate($input->iFirstRepeatingDate);
  $x->lastRepeatingDate     = getRequestDate($input->iLastRepeatingDate);
  $x->repeatingGid          = getRequestString($input->iRepeatingGid);
  if ($x->repeatingGid == "")
  {
    $x->repeatingGid = null;
  }
  $x->repeatingModified     = $input->iRepeatingModified;
  $x->isRepeating           = $input->iIsRepeating;

  if ($x->activityId > 0 && (!$x->isRepeating || $x->repeatingModified))
  {
    $queryWhere = "WHERE activity_id = " . $x->activityId;
    $query =
      "UPDATE activity " .
      "SET group_id = " . $x->groupId . ", activity_type_id = " . $x->activityTypeId . ", " .
      "    activity_time = " . (is_null($x->time) ? "NULL" : "'" . $x->time . "'") . ", " .
      "    activity_duration_minutes = " . (is_null($x->activityDurationMinutes) ? "NULL" : $x->activityDurationMinutes) . ", " .
      "    place = '" . str_replace("'", "", $x->place) . "', header = '" . str_replace("''", "Null", $x->header) . "', " .
      "    descr = '" . str_replace("'", "", $x->description) . "', " .
      "    url = '" . str_replace("'", "", $x->url) . "', " .
      "    longitude = " . (is_null($x->longitude) ? "NULL" : $x->longitude) . ", " .
      "    latitude = " . (is_null($x->latitude) ? "NULL" : $x->latitude) . ", " .
      "    responsible_user_id = " . $x->responsibleUserId . ", " .
      "    repeating_modified = " . intval($x->repeatingModified) . ", " .
      "    mod_by_user_id = " . $user_id . ", mod_date = '" . datetime2String(time()) . "'" .
      $queryWhere;
      \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  }
  else
  {
    $newDates = array();
    if ($x->activityId == 0 && !$x->isRepeating)
    {
      array_push($newDates, $x->date);
    }
    else
    {
      $dateDiff = ceil(dateDifference($x->date, $x->firstRepeatingDate) / 7) * 7;
      $date = addDays($x->date, $dateDiff);
      while ($date <= $x->lastRepeatingDate)
      {
        array_push($newDates, $date);
        $date = addDays($date, 7);
      }
      if ($x->activityId > 0)
      {
        $deleteQuery = "DELETE FROM activity WHERE repeating_modified = 0 AND repeating_gid = '" . $x->repeatingGid . "'";
        \db\mysql_query($deleteQuery) || trigger_error(sprintf('SQL-Error (%s)', substr($deleteQuery, 0, 1024)), E_USER_ERROR);
      }
    }
    $x->dates = $newDates;
    unset($x->date);
  
    foreach($newDates as $date)
    {
      $query =
      "INSERT INTO activity " .
      "(" .
      "  group_id, activity_type_id," .
      "  activity_day, activity_time, activity_duration_minutes, place," .
      "  header, descr, url," .
      "  longitude, latitude," .
      "  responsible_user_id, repeating_gid, repeating_modified," .
      "  cre_by_user_id, cre_date, mod_by_user_id, mod_date" .
      ") " .
      "VALUES " .
      "(" .
      $x->groupId . "," . $x->activityTypeId . "," .
      "'" . $date . "'" . "," .
      (is_null($x->time) ? "NULL" : "'" . $x->time . "'") . "," .
      (is_null($x->activityDurationMinutes) ? "NULL" : $x->activityDurationMinutes) . "," .
      "'" . str_replace("'", "", $x->place) . "','" . str_replace("'", "", $x->header) . "'," .
      "'" . str_replace("'", "", $x->description) . "','" .
      str_replace("'", "", $x->url) . "'," .
      (is_null($x->longitude) ? "NULL" : $x->longitude) . "," .
      (is_null($x->latitude) ? "NULL" : $x->latitude) . "," .
      $x->responsibleUserId . "," .
      (is_null($x->repeatingGid) ? "NULL" : "'" . $x->repeatingGid . "'") . "," .
      intval($x->repeatingModified) . "," .
      $user_id . ",'" . datetime2String(time()) . "'," .
      $user_id . ",'" . datetime2String(time()) . "'" .
      ")";
  
      \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
      if ($x->activityId == 0)
      {
        $x->activityId = \db\mysql_insert_id();
      }
    }
  }
  $input = $x;
}
elseif ($input->iType == "EVENTS")
{
  if (!(ValidGroup($cADMIN_GROUP_ID)))
  {
    NotAuthorized();
  }

  $query = "DELETE FROM CALENDAR_RACE_EVENT WHERE DATE_FORMAT(RACEDATE, '%Y-%m-%d') BETWEEN '" . date2String($input->queryStartDate) . "' AND '" . date2String($input->queryEndDate) . "'";
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  foreach($input->events as $event)
  {
    $query = sprintf("INSERT INTO CALENDAR_RACE_EVENT " .
                  "(" .
                  "  EVENTOR_ID, EVENTOR_RACE_ID, NAME," .
                  "  ORGANISER_NAME, RACEDATE, RACETIME," .
                  "  LONGITUDE, LATITUDE" .
                  ")" .
                  " VALUES " .
                  "(" .
                  "  %s, %s, '%s', '%s', '%s', %s, %s, %s" .
                  ")",
                  is_null($event->eventorId) ? "NULL" : $event->eventorId,
                  is_null($event->eventorRaceId) ? "NULL" : $event->eventorRaceId,
                  $event->name,
                  $event->organiserName,
                  $event->raceDate,
                  is_null($event->raceTime) ? "NULL" : "'" . $event->raceDate . " " . $event->raceTime . "'",
                  is_null($event->longitude) ? "NULL" : $event->longitude,
                  is_null($event->latitude) ? "NULL" : $event->latitude);

    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
    $event->calendarEventId = \db\mysql_insert_id();
  }
}
else
{
  trigger_error(sprintf('Unsupported type (%s)', $input->iType), E_USER_ERROR);
}
  
CloseDatabase();

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");

unset($input->iType);
unset($input->queryStartDate);
unset($input->queryEndDate);

echo json_encode($input);
?>
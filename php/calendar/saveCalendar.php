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
set_error_handler("error_handler");

ValidLogin();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

$iType = "";

if (isset($_REQUEST['iType'])) {
  $iType = $_REQUEST['iType'];
}
if(isset($_REQUEST['queryStartDate']) && $_REQUEST['queryStartDate']!="")
{
  $queryStartDate = string2Date($_REQUEST['queryStartDate']);
}
if(isset($_REQUEST['queryEndDate']) && $_REQUEST['queryEndDate']!="")
{
  $queryEndDate = string2Date($_REQUEST['queryEndDate']);
}

OpenDatabase();
if (!$db_conn->set_charset('utf8')) {
  die('Could not set character set to utf8');
}
  
if ($iType == "ACTIVITY")
{
  $x = new stdClass();
  $x->activityId            = getRequestInt("iActivityID");
  $x->activityTypeId        = getRequestInt("iActivityTypeID");
  $x->groupId               = getRequestInt("iGroupID");
  $x->date                  = getRequestDate("iActivityDay");
  $x->time                  = getRequestTime("iActivityTime");
  $x->place                 = getRequestString("iPlace");
  $x->header                = getRequestString("iHeader");
  $x->description           = getRequestString("iDescr");
  $x->url                   = getRequestString("iURL");
  $x->longitude             = getRequestDecimal("iLongitude");
  $x->latitude              = getRequestDecimal("iLatitude");
  $x->responsibleUserId     = getRequestInt("iResponsibleUserID");

  if ($x->activityId == 0)
  {
    $query =
        "INSERT INTO activity " .
        "(" .
        "  group_id, activity_type_id," .
        "  activity_day, activity_time, place," .
        "  header, descr, url," .
        "  longitude, latitude," .
        "  responsible_user_id," .
        "  cre_by_user_id, cre_date, mod_by_user_id, mod_date" .
        ") " .
        "VALUES " .
        "(" .
        $x->groupId . "," . $x->activityTypeId . "," .
        "'" . $x->date . "'" . "," .
        (is_null($x->time) ? "NULL" : "'" . $x->time . "'") . "," .
        "'" . str_replace("'", "", $x->place) . "','" . str_replace("'", "", $x->header) . "'," .
        "'" . str_replace("'", "", $x->description) . "','" .
        str_replace("'", "", $x->url) . "'," .
        (is_null($x->longitude) ? "NULL" : $x->longitude) . "," .
        (is_null($x->latitude) ? "NULL" : $x->latitude) . "," .
        $x->responsibleUserId . "," .
        $user_id . ",'" . datetime2String(time()) . "'," .
        $user_id . ",'" . datetime2String(time()) . "'" .
        ")";
  }
  else
  {
    $query =
        "UPDATE activity " .
        "SET group_id = " . $x->groupId . ", activity_type_id = " . $x->activityTypeId . ", " .
        "    activity_day = '" . $x->date . "', " .
        "    activity_time = " . (is_null($x->time) ? "NULL" : "'" . $x->time . "'") . ", " .
        "    place = '" . str_replace("'", "", $x->place) . "', header = '" . str_replace("''", "Null", $x->header) . "', " .
        "    descr = '" . str_replace("'", "", $x->description) . "', " .
        "    url = '" . str_replace("'", "", $x->url) . "', " .
        "    longitude = " . (is_null($x->longitude) ? "NULL" : $x->longitude) . ", " .
        "    latitude = " . (is_null($x->latitude) ? "NULL" : $x->latitude) . ", " .
        "    responsible_user_id = " . $x->responsibleUserId . ", " .
        "    mod_by_user_id = " . $user_id . ", mod_date = '" . datetime2String(time()) . "'" .
        "WHERE activity_id = " . $x->activityId;
  }

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  if ($x->activityId == 0)
  {
    $x->activityId = \db\mysql_insert_id();
  }
}
elseif ($iType == "EVENTS")
{
  if (!(ValidGroup($cADMIN_GROUP_ID)))
  {
    NotAuthorized();
  }
  $eventId = getRequestInt("eventId");

  $query = "DELETE FROM CALENDAR_RACE_EVENT WHERE DATE_FORMAT(RACEDATE, '%Y-%m-%d') BETWEEN '" . date2String($queryStartDate) . "' AND '" . date2String($queryEndDate) . "'";
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $x = json_decode($_REQUEST['events']);
  foreach($x as $event)
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
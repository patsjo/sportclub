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
  
if ($iType == "EVENTS")
{
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
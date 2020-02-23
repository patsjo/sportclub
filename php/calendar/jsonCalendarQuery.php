<?php
//############################################################
//# File:    jsonCalendarQuery.php                           #
//# Created: 2019-12-25                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iType (Default ACTIVITIES)                   #
//# Parameters: iFromDate                                    #
//# Parameters: iToDate                                      #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2020-02-08  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();

$iType = "";
$iFromDate = NULL;
$iToDate = NULL;
$rows = array();

if(isset($_REQUEST['iType']) && $_REQUEST['iType']!="")
{
  $iType = $_REQUEST['iType'];
}
if(isset($_REQUEST['iFromDate']) && $_REQUEST['iFromDate']!="")
{
  $iFromDate = string2Date($_REQUEST['iFromDate']);
}
if(isset($_REQUEST['iToDate']) && $_REQUEST['iToDate']!="")
{
  $iToDate = string2Date($_REQUEST['iToDate']);
}

OpenDatabase();
if (!$db_conn->set_charset('utf8')) {
  die('Could not set character set to latin1_swedish_ci');
}
if (is_null($iFromDate))
{
  $whereStartDate = "";
}
else
{
  $whereStartDate = " AND DATE_FORMAT(activity_day, '%Y-%m-%d') >= '" . date2String($iFromDate) . "'";
}

if (is_null($iToDate))
{
  $whereEndDate = "";
}
else
{
  $whereEndDate = " AND DATE_FORMAT(activity_day, '%Y-%m-%d') <= '" . date2String($iToDate) . "'";
}

if ($iType == "ACTIVITIES")
{
  $sql = "SELECT * FROM activity WHERE 1=1" . $whereStartDate . $whereEndDate . " ORDER BY activity_day ASC, activity_time ASC";
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->activityId            = intval($row['activity_id']);
      $x->activityTypeId        = intval($row['activity_type_id']);
      $x->groupId               = intval($row['group_id']);
      $x->date                  = date2String(strtotime($row['activity_day']));
      $x->time                  = is_null($row['activity_time']) ? NULL : time2String(strtotime($row['activity_time']));
      $x->place                 = $row['place'];
      $x->header                = $row['header'];
      $x->description           = $row['descr'];
      $x->url                   = $row['url'];
      $x->longitude             = is_null($row['longitude']) ? NULL : floatval($row['longitude']);
      $x->latitude              = is_null($row['latitude']) ? NULL : floatval($row['latitude']);
      $x->responsibleUserId     = intval($row['responsible_user_id']);
      array_push($rows, $x);
    }
  }
}
elseif ($iType == "EVENTS")
{
  if (is_null($iFromDate))
  {
    $whereStartDate = "";
  }
  else
  {
    $whereStartDate = " AND DATE_FORMAT(RACEDATE, '%Y-%m-%d') >= '" . date2String($iFromDate) . "'";
  }

  if (is_null($iToDate))
  {
    $whereEndDate = "";
  }
  else
  {
    $whereEndDate = " AND DATE_FORMAT(RACEDATE, '%Y-%m-%d') <= '" . date2String($iToDate) . "'";
  }

  $sql = "SELECT * FROM CALENDAR_RACE_EVENT WHERE 1=1" . $whereStartDate . $whereEndDate . " ORDER BY RACEDATE ASC, RACETIME ASC";
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->calendarEventId       = intval($row['CALENDAR_EVENT_ID']);
      $x->eventorId             = intval($row['EVENTOR_ID']);
      $x->eventorRaceId         = is_null($row['EVENTOR_RACE_ID']) ? NULL : intval($row['EVENTOR_RACE_ID']);
      $x->name                  = $row['NAME'];
      $x->organiserName         = $row['ORGANISER_NAME'];
      $x->date                  = date2String(strtotime($row['RACEDATE']));
      $x->time                  = is_null($row['RACETIME']) ? NULL : time2String(strtotime($row['RACETIME']));
      $x->longitude             = is_null($row['LONGITUDE']) ? NULL : floatval($row['LONGITUDE']);
      $x->latitude              = is_null($row['LATITUDE']) ? NULL : floatval($row['LATITUDE']);
      array_push($rows, $x);
    }
  }
}
elseif ($iType == "DOMAINS")
{
  $rows = new stdClass();
  $rows->activityTypes = array();
  $rows->groups = array();
  $rows->users = array();

  $sql = "SELECT * FROM activity_type ORDER BY DESCR ASC";
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->code        = intval($row['activity_type_id']);
      $x->description = $row['descr'];
      array_push($rows->activityTypes, $x);
    }
  }
  \db\mysql_free_result($result);

  $sql = "SELECT * FROM groups WHERE UPPER(show_in_calendar) = 'YES' ORDER BY DESCRIPTION ASC";
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }

  $x = new stdClass();
  $x->code        = 0;
  $x->description = '[Alla]';
  array_push($rows->groups, $x);

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->code        = intval($row['group_id']);
      $x->description = $row['description'];
      array_push($rows->groups, $x);
    }
  }
  \db\mysql_free_result($result);

  $sql = "SELECT * FROM users ORDER BY last_name ASC, first_name ASC";
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->code        = intval($row['user_id']);
      $x->description = $row['first_name'] . " " . $row['last_name'];
      array_push($rows->users, $x);
    }
  }
}
else
{
  die('Wrong iType parameter');
}

header("Content-Type: application/json; charset=ISO-8859-1");
ini_set( 'precision', 20 );
ini_set( 'serialize_precision', 14 );
echo utf8_decode(json_encode($rows));

\db\mysql_free_result($result);

?>
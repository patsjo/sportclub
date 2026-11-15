<?php
//############################################################
//# File:    ics.php                                         #
//# Created: 2026-11-15                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# The calendar as an iCalendar feed (RFC 5545) to subscribe#
//# to from Google, Outlook or Apple calendars. Holds the    #
//# activities and the Eventor races imported into the       #
//# calendar.                                                #
//# -------------------------------------------------------- #
//# Parameters: monthsBack    (0-6, default 1)               #
//# Parameters: monthsForward (1-12, default 3)              #
//# Parameters: types         (activity type ids and/or      #
//#                            "eventor", comma separated,   #
//#                            default all)                  #
//# Parameters: groups        (group ids, comma separated,   #
//#                            default all)                  #
//# Parameters: name          (name of the calendar)         #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-15  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();

// Kept in sync with the limits of the modal that creates the link (CalendarSubscribeModal.tsx)
define('ICS_MONTHS_BACK_MIN', 0);
define('ICS_MONTHS_BACK_MAX', 6);
define('ICS_MONTHS_BACK_DEFAULT', 1);
define('ICS_MONTHS_FORWARD_MIN', 1);
define('ICS_MONTHS_FORWARD_MAX', 12);
define('ICS_MONTHS_FORWARD_DEFAULT', 3);
// An activity with a time but no duration, and a race with a start time, get these lengths
define('ICS_ACTIVITY_DEFAULT_MINUTES', 60);
define('ICS_RACE_DEFAULT_MINUTES', 180);

function icsMonths($name, $default, $min, $max)
{
  if (!isset($_GET[$name]) || !is_numeric($_GET[$name]))
  {
    return $default;
  }
  return max($min, min($max, intval($_GET[$name])));
}

// The positive integers of a comma separated parameter, and in $oWords the other values in lower case
function icsList($name, &$oWords)
{
  $ids = array();
  $oWords = array();
  if (!isset($_GET[$name]) || !is_string($_GET[$name]))
  {
    return $ids;
  }
  foreach (explode(',', $_GET[$name]) as $value)
  {
    $value = strtolower(trim($value));
    if ($value == '')
    {
      continue;
    }
    if (preg_match('/^[0-9]+$/', $value))
    {
      if (intval($value) > 0)
      {
        array_push($ids, intval($value));
      }
    }
    else
    {
      array_push($oWords, $value);
    }
  }
  return array_values(array_unique($ids));
}

// Escapes a TEXT value (RFC 5545 3.3.11)
function icsText($value)
{
  $value = str_replace("\r\n", "\n", (string)$value);
  $value = str_replace("\r", "\n", $value);
  return str_replace(array("\\", ";", ",", "\n"), array("\\\\", "\\;", "\\,", "\\n"), $value);
}

// Folds a content line to at most 75 octets per line, never inside a multi-byte UTF-8 character (RFC 5545 3.1)
function icsLine($line)
{
  $out = "";
  $limit = 75;
  while (strlen($line) > $limit)
  {
    $cut = $limit;
    while ($cut > 0 && (ord($line[$cut]) & 0xC0) == 0x80)
    {
      $cut--;
    }
    $out .= substr($line, 0, $cut) . "\r\n ";
    $line = substr($line, $cut);
    // The leading space of the continuation line counts in its 75 octets
    $limit = 74;
  }
  return $out . $line . "\r\n";
}

function icsUtc($localDateTime)
{
  $dateTime = new DateTime($localDateTime, new DateTimeZone('Europe/Stockholm'));
  $dateTime->setTimezone(new DateTimeZone('UTC'));
  return $dateTime->format('Ymd\THis\Z');
}

// The lines of the start and the end, as an all-day event when there is no time
function icsStartEnd($day, $time, $minutes)
{
  if (is_null($time) || $time == "")
  {
    $start = new DateTime($day);
    $end = clone $start;
    $end->modify('+1 day');
    return icsLine("DTSTART;VALUE=DATE:" . $start->format('Ymd')) .
           icsLine("DTEND;VALUE=DATE:" . $end->format('Ymd'));
  }
  $start = new DateTime($day . ' ' . $time, new DateTimeZone('Europe/Stockholm'));
  $end = clone $start;
  $end->modify('+' . $minutes . ' minutes');
  $start->setTimezone(new DateTimeZone('UTC'));
  $end->setTimezone(new DateTimeZone('UTC'));
  return icsLine("DTSTART:" . $start->format('Ymd\THis\Z')) .
         icsLine("DTEND:" . $end->format('Ymd\THis\Z'));
}

function icsGeo($latitude, $longitude)
{
  if (is_null($latitude) || is_null($longitude))
  {
    return "";
  }
  return icsLine("GEO:" . floatval($latitude) . ";" . floatval($longitude));
}

$monthsBack    = icsMonths('monthsBack', ICS_MONTHS_BACK_DEFAULT, ICS_MONTHS_BACK_MIN, ICS_MONTHS_BACK_MAX);
$monthsForward = icsMonths('monthsForward', ICS_MONTHS_FORWARD_DEFAULT, ICS_MONTHS_FORWARD_MIN, ICS_MONTHS_FORWARD_MAX);

// No type selected includes all the activities and the races from Eventor
$activityTypeIds = icsList('types', $typeWords);
$typeFilter = count($activityTypeIds) > 0 || count($typeWords) > 0;
$includeActivities = !$typeFilter || count($activityTypeIds) > 0;
$includeRaces = !$typeFilter || in_array('eventor', $typeWords);
// No group selected includes all. The activities for all the groups (group 0) are always included, and so are the
// races from Eventor that have no group
$groupIds = icsList('groups', $groupWords);

$fromDate = new DateTime('today');
$fromDate->modify('-' . $monthsBack . ' months');
$toDate = new DateTime('today');
$toDate->modify('+' . $monthsForward . ' months');
$fromDateString = $fromDate->format('Y-m-d');
$toDateString = $toDate->format('Y-m-d');

// The host without the port, e.g. okorion.com
$host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST']) : '';
$host = strtolower(preg_replace('/[^A-Za-z0-9.-]/', '', $host));
if ($host == '')
{
  $host = 'sportclub';
}
// The name of the file is the host without "www." and the top level domain, e.g. okorion.ics
$fileName = preg_replace('/^www\./', '', $host);
if (strpos($fileName, '.') !== false)
{
  $fileName = substr($fileName, 0, strrpos($fileName, '.'));
}
$fileName = str_replace('.', '-', $fileName);
if ($fileName == '')
{
  $fileName = 'kalender';
}
$calendarName = isset($_GET['name']) ? trim(mb_substr(strip_tags((string)$_GET['name']), 0, 64, 'UTF-8')) : '';
if ($calendarName == '')
{
  $calendarName = $host;
}
$dtStamp = gmdate('Ymd\THis\Z');

$ics = icsLine("BEGIN:VCALENDAR") .
       icsLine("VERSION:2.0") .
       icsLine("PRODID:-//sportclub//" . $host . "//SV") .
       icsLine("CALSCALE:GREGORIAN") .
       icsLine("METHOD:PUBLISH") .
       icsLine("NAME:" . icsText($calendarName)) .
       icsLine("X-WR-CALNAME:" . icsText($calendarName)) .
       icsLine("X-WR-TIMEZONE:Europe/Stockholm") .
       icsLine("REFRESH-INTERVAL;VALUE=DURATION:PT4H") .
       icsLine("X-PUBLISHED-TTL:PT4H");

OpenDatabase();

$activityWhere = "WHERE a.activity_day >= '" . $fromDateString . "' AND a.activity_day <= '" . $toDateString . "' ";
if (count($activityTypeIds) > 0)
{
  $activityWhere .= "AND a.activity_type_id IN (" . implode(",", $activityTypeIds) . ") ";
}
if (count($groupIds) > 0)
{
  $activityWhere .= "AND a.group_id IN (0," . implode(",", $groupIds) . ") ";
}

if ($includeActivities)
{
  $sql = "SELECT a.*, t.descr AS activity_type_descr, g.description AS group_descr " .
         "FROM activity a " .
         "LEFT OUTER JOIN activity_type t ON (a.activity_type_id = t.activity_type_id) " .
         "LEFT OUTER JOIN `groups` g ON (a.group_id = g.group_id) " .
         $activityWhere .
         "ORDER BY a.activity_day ASC, a.activity_time ASC";
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while($row = \db\mysql_fetch_assoc($result))
  {
    $day = date2String(strtotime($row['activity_day']));
    $time = is_null($row['activity_time']) ? NULL : time2StringWithSeconds(strtotime($row['activity_time']));
    $minutes = is_null($row['activity_duration_minutes']) || intval($row['activity_duration_minutes']) <= 0
      ? ICS_ACTIVITY_DEFAULT_MINUTES
      : intval($row['activity_duration_minutes']);

    $descr = array();
    if (intval($row['group_id']) > 0 && !is_null($row['group_descr']) && $row['group_descr'] != '')
    {
      array_push($descr, 'Grupp: ' . $row['group_descr']);
    }
    if (!is_null($row['descr']) && trim($row['descr']) != '')
    {
      array_push($descr, trim($row['descr']));
    }
    if (!is_null($row['url']) && trim($row['url']) != '')
    {
      array_push($descr, trim($row['url']));
    }

    $ics .= icsLine("BEGIN:VEVENT") .
            icsLine("UID:activity-" . intval($row['activity_id']) . "@" . $host) .
            icsLine("DTSTAMP:" . $dtStamp) .
            icsStartEnd($day, $time, $minutes) .
            icsLine("SUMMARY:" . icsText($row['header']));
    if (!is_null($row['mod_date']) && substr($row['mod_date'], 0, 4) > '1970')
    {
      $ics .= icsLine("LAST-MODIFIED:" . icsUtc($row['mod_date']));
    }
    if (!is_null($row['activity_type_descr']) && $row['activity_type_descr'] != '')
    {
      $ics .= icsLine("CATEGORIES:" . icsText($row['activity_type_descr']));
    }
    if (count($descr) > 0)
    {
      $ics .= icsLine("DESCRIPTION:" . icsText(implode("\n\n", $descr)));
    }
    if (!is_null($row['place']) && trim($row['place']) != '')
    {
      $ics .= icsLine("LOCATION:" . icsText(trim($row['place'])));
    }
    elseif (!is_null($row['latitude']) && !is_null($row['longitude']))
    {
      $ics .= icsLine("LOCATION:" . icsText(floatval($row['latitude']) . "," . floatval($row['longitude'])));
    }
    $ics .= icsGeo($row['latitude'], $row['longitude']);
    if (!is_null($row['url']) && preg_match('/^https?:\/\//i', trim($row['url'])))
    {
      $ics .= icsLine("URL:" . trim($row['url']));
    }
    $ics .= icsLine("END:VEVENT");
  }
  \db\mysql_free_result($result);
}

if ($includeRaces)
{
  $sql = "SELECT * FROM CALENDAR_RACE_EVENT " .
         "WHERE RACEDATE >= '" . $fromDateString . "' AND RACEDATE <= '" . $toDateString . "' " .
         "ORDER BY RACEDATE ASC, RACETIME ASC";
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while($row = \db\mysql_fetch_assoc($result))
  {
    $day = date2String(strtotime($row['RACEDATE']));
    $time = is_null($row['RACETIME']) ? NULL : time2StringWithSeconds(strtotime($row['RACETIME']));
    $eventorUrl = is_null($row['EVENTOR_ID']) || intval($row['EVENTOR_ID']) <= 0
      ? NULL
      : 'https://eventor.orientering.se/Events/Show/' . intval($row['EVENTOR_ID']);

    $descr = array();
    if (!is_null($row['ORGANISER_NAME']) && $row['ORGANISER_NAME'] != '')
    {
      array_push($descr, 'Arrangör: ' . $row['ORGANISER_NAME']);
    }
    if (!is_null($eventorUrl))
    {
      array_push($descr, $eventorUrl);
    }

    $ics .= icsLine("BEGIN:VEVENT") .
            icsLine("UID:race-" . intval($row['CALENDAR_EVENT_ID']) . "@" . $host) .
            icsLine("DTSTAMP:" . $dtStamp) .
            icsStartEnd($day, $time, ICS_RACE_DEFAULT_MINUTES) .
            icsLine("SUMMARY:" . icsText($row['NAME'])) .
            icsLine("CATEGORIES:Tävling");
    if (count($descr) > 0)
    {
      $ics .= icsLine("DESCRIPTION:" . icsText(implode("\n\n", $descr)));
    }
    if (!is_null($row['LATITUDE']) && !is_null($row['LONGITUDE']))
    {
      $ics .= icsLine("LOCATION:" . icsText(floatval($row['LATITUDE']) . "," . floatval($row['LONGITUDE'])));
    }
    $ics .= icsGeo($row['LATITUDE'], $row['LONGITUDE']);
    if (!is_null($eventorUrl))
    {
      $ics .= icsLine("URL:" . $eventorUrl);
    }
    $ics .= icsLine("END:VEVENT");
  }
  \db\mysql_free_result($result);
}

CloseDatabase();

$ics .= icsLine("END:VCALENDAR");

header("Content-Type: text/calendar; charset=utf-8");
header("Content-Disposition: inline; filename=\"" . $fileName . ".ics\"");
header("Cache-Control: max-age=900");
echo $ics;

?>

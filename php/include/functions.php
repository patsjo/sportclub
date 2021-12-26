<?php

//############################################################
//# File:    functions.php                                   #
//# Created: 2001-09-23                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2001-09-23  PatSjo  Initial version                      #
//# 2001-10-07  PatSjo  Adds getBrowser and validBrowser     #
//# 2003-12-21  PatSjo  Adds htmlHeader and htmlFooter       #
//# 2004-11-10  Niklas  Added <CENTER> before first table in #
//#                     htmlHeader in order to solve Mozilla #
//#                     problems.                            #
//#                     Removed Mozilla from valid browsers. #
//# 2005-12-31  PatSjo  Changes from ASP to PHP              #
//# 2013-11-20  PatSjo  Added some more functions            #
//# 2013-12-03  PatSjo  Added function getGaussEasterSunday  #
//# 2019-11-27  PatSjo  Added function getGaussEasterSunday  #
//# 2020-01-12  PatSjo  Added functions for saving           #
//# 2021-08-21  PatSjo  Remove HTML functions                #
//# 2021-08-21  PatSjo  Change to JSON in and out            #
//############################################################

function FillAtStart ($iString, $iFillCharacter, $iLength)
{
  $retValue = $iString;

  while (strlen($retValue) < $iLength)
  {
    $retValue = $iFillCharacter . retValue;
  }
  return $retValue;
}

function getGaussEasterSunday($iYear)
{
  $a = $iYear % 19;
  $b = $iYear % 4;
  $c = $iYear % 7;
  $k = floor($iYear / 100);
  $p = floor((13 + 8*$k)/25);
  $q = floor($k/4);
  $M = (15 - $p + $k - $q) % 30;
  $N = (4 + $k - $q) % 7;
  $d = (19*$a + $M) % 30;
  $e = (2*$b + 4*$c + 6*$d + $N) % 7;
  $easterSunday = mktime(0, 0, 0, 3, 1, $iYear) + 86400 * (-1 + 22 + $d + $e);

  if (($d == 29) && ($e == 6))
  {
    $easterSunday = $easterSunday - 7 * 86400;
  }

  if (($d == 28) && ($e == 6) && (((11*$M + 11) % 30) < 19))
  {
    $easterSunday = $easterSunday - 7 * 86400;
  }
  return $easterSunday;
}

function getHolidayName($iDate)
{
  if (is_null($iDate))
  {
    return NULL;
  }

  $year = intval(date("Y", $iDate));
  $mmddStr = date("md", $iDate);
  // N = ISO-8601 numeric representation of the day of the week (added in PHP 5.1.0)
  // N = Day of week, 1 (for Monday) through 7 (for Sunday)
  $dayOfWeek = intval(date("N", $iDate));
  $easterSunday = getGaussEasterSunday($year);

  if ($mmddStr == "1224")
  {
    return "Julafton";
  }
  elseif ($mmddStr == "1231")
  {
    return "Ny�rsafton";
  }
  elseif ($mmddStr == "0101")
  {
    return "Ny�rsdagen";
  }
  elseif ($mmddStr == "0106")
  {
    return "Trettondagen";
  }
  elseif ($mmddStr == "0501")
  {
    return "F�rsta maj";
  }
  elseif ($mmddStr == "0606")
  {
    return "Nationaldagen";
  }
  elseif ($mmddStr == "1225")
  {
    return "Juldagen";
  }
  elseif ($mmddStr == "1226")
  {
    return "Annandag jul";
  }
  elseif ($mmddStr == "1031")
  {
    return "Halloween";
  }
  elseif ($mmddStr == "0214")
  {
    return "Alla hj�rtans dag";
  }
  elseif (($dayOfWeek == 5) && in_array($mmddStr, array("0619", "0620", "0621", "0622", "0623", "0624", "0625")))
  {
    return "Midsommarafton";
  }
  elseif (($dayOfWeek == 6) && in_array($mmddStr, array("0620", "0621", "0622", "0623", "0624", "0625", "0626")))
  {
    return "Midsommardagen";
  }
  elseif (($dayOfWeek == 6) && in_array($mmddStr, array("1031", "1101", "1102", "1103", "1104", "1105", "1106")))
  {
    return "Alla helgons dag";
  }
  elseif (dateDiff($easterSunday, $iDate) == -2)
  {
    return "L�ngfredagen";
  }
  elseif (dateDiff($easterSunday, $iDate) == -1)
  {
    return "P�skafton";
  }
  elseif (dateDiff($easterSunday, $iDate) == 0)
  {
    return "P�skdagen";
  }
  elseif (dateDiff($easterSunday, $iDate) == 1)
  {
    return "Annandag p�sk";
  }
  elseif (dateDiff($easterSunday, $iDate) == 39)
  {
    return "Kristi Himmelsf�rdsdag";
  }
  else
  {
    return NULL;
  }
}

function getHolidayColor($iDate) // red = Holiday, grey = no workday, black = workday
{
  if (is_null($iDate))
  {
    return NULL;
  }

  $year = intval(date("Y", $iDate));
  $mmddStr = date("md", $iDate);
  // N = ISO-8601 numeric representation of the day of the week (added in PHP 5.1.0)
  // N = Day of week, 1 (for Monday) through 7 (for Sunday)
  $dayOfWeek = intval(date("N", $iDate));
  $easterSunday = getGaussEasterSunday($year);

  if (in_array($mmddStr, array("1224", "1231")))
  {
    return "grey";
  }
  elseif (in_array($mmddStr, array("0101", "0106", "0501", "0606", "1225", "1226")))
  {
    return "red";
  }
  elseif (($dayOfWeek == 5) && in_array($mmddStr, array("0619", "0620", "0621", "0622", "0623", "0624", "0625")))
  {
    return "red";
  }
  elseif (($dayOfWeek == 6) && in_array($mmddStr, array("0620", "0621", "0622", "0623", "0624", "0625", "0626")))
  {
    return "red";
  }
  elseif (($dayOfWeek == 6) && in_array($mmddStr, array("1031", "1101", "1102", "1103", "1104", "1105", "1106")))
  {
    return "red";
  }
  elseif (in_array(dateDiff($easterSunday, $iDate), array(-2, 1, 39)))
  {
    return "red";
  }
  elseif ($dayOfWeek == 6)
  {
    return "grey";
  }
  elseif ($dayOfWeek == 7)
  {
    return "red";
  }
  else
  {
    return "black";
  }
}

function getMonthName($iDate)
{
  if (is_null($iDate))
  {
    return NULL;
  }

  // n = Numeric representation of a month, without leading zeros
  $monthNumber = intval(date("n", $iDate));

  if ($monthNumber == 1)
  {
    return "Januari";
  }
  elseif ($monthNumber == 2)
  {
    return "Februari";
  }
  elseif ($monthNumber == 3)
  {
    return "Mars";
  }
  elseif ($monthNumber == 4)
  {
    return "April";
  }
  elseif ($monthNumber == 5)
  {
    return "Maj";
  }
  elseif ($monthNumber == 6)
  {
    return "Juni";
  }
  elseif ($monthNumber == 7)
  {
    return "Juli";
  }
  elseif ($monthNumber == 8)
  {
    return "Augusti";
  }
  elseif ($monthNumber == 9)
  {
    return "September";
  }
  elseif ($monthNumber == 10)
  {
    return "Oktober";
  }
  elseif ($monthNumber == 11)
  {
    return "November";
  }
  else
  {
    return "December";
  }
}

function getWeekdayNumber($iDate)
{
  if (is_null($iDate))
  {
    return 0;
  }

  // N = ISO-8601 numeric representation of the day of the week (added in PHP 5.1.0)
  // N = Day of week, 1 (for Monday) through 7 (for Sunday)
  return intval(date("N", $iDate));
}

function getWeekdayName($iDate)
{
  if (is_null($iDate))
  {
    return NULL;
  }

  // N = ISO-8601 numeric representation of the day of the week (added in PHP 5.1.0)
  // N = Day of week, 1 (for Monday) through 7 (for Sunday)
  $dayOfWeek = intval(date("N", $iDate));

  if ($dayOfWeek == 1)
  {
    return "M�n";
  }
  elseif ($dayOfWeek == 2)
  {
    return "Tis";
  }
  elseif ($dayOfWeek == 3)
  {
    return "Ons";
  }
  elseif ($dayOfWeek == 4)
  {
    return "Tor";
  }
  elseif ($dayOfWeek == 5)
  {
    return "Fre";
  }
  elseif ($dayOfWeek == 6)
  {
    return "L�r";
  }
  else
  {
    return "S�n";
  }
}

function getWeekdayDate($iDate)
{
  if (is_null($iDate))
  {
    return NULL;
  }

  // j = Day of the month, without leading zeros 
  // n = Numeric representation of a month, without leading zeros

  return getWeekdayName($iDate) . "&nbsp;" . date("j", $iDate) . "/" . date("n", $iDate);
}

function getYear($iDate)
{
  if (is_null($iDate))
  {
    return NULL;
  }

  // Y = A full numeric representation of a year, 4 digits
  // m = Numeric representation of a month, with leading zeros
  // d = Day of the month, 2 digits with leading zeros

  $dateStr = date("Y-m-d", $iDate);
  $year = intval(substr($dateStr, 0, 4));
  return $year;
}

function getMonth($iDate)
{
  if (is_null($iDate))
  {
    return NULL;
  }

  // Y = A full numeric representation of a year, 4 digits
  // m = Numeric representation of a month, with leading zeros
  // d = Day of the month, 2 digits with leading zeros

  $dateStr = date("Y-m-d", $iDate);
  $month = intval(substr($dateStr, 5, 2));
  return $month;
}

function getDay($iDate)
{
  if (is_null($iDate))
  {
    return NULL;
  }

  // Y = A full numeric representation of a year, 4 digits
  // m = Numeric representation of a month, with leading zeros
  // d = Day of the month, 2 digits with leading zeros

  $dateStr = date("Y-m-d", $iDate);
  $day = intval(substr($dateStr, 8));
  return $day;
}

function date2String($iDate)
{
  // Assumes the date is at the format YYYY-MM-DD

  if (is_null($iDate))
  {
    return NULL;
  }

  // Y = A full numeric representation of a year, 4 digits
  // m = Numeric representation of a month, with leading zeros
  // d = Day of the month, 2 digits with leading zeros

  return date("Y-m-d", $iDate);
}

function string2Date($iDateString)
{
  // Assumes the date is at the format YYYY-MM-DD

  if (is_null($iDateString))
  {
    return NULL;
  }

  $year = intval(substr($iDateString, 0, 4));
  $month = intval(substr($iDateString, 5, 2));
  $day = intval(substr($iDateString, 8));
  if (($year < 1900) || ($year > 2100) || ($month <= 0) || ($month > 12) || ($day <= 0) || ($day > 31))
  {
    trigger_error(sprintf('Felaktigt datum %s, skall vara p� formatet YYYY-MM-DD.', $iDateString), E_USER_ERROR);
  }

  return mktime(0, 0, 0, $month, $day, $year);
}

function time2String($iTime)
{
  // Assumes the date is at the format HH24:MI

  if (is_null($iTime))
  {
    return NULL;
  }

  // H = 24-hour format of an hour with leading zeros
  // i = Minutes with leading zeros

  return date("H:i", $iTime);
}

function time2StringWithSeconds($iTime)
{
  // Assumes the date is at the format HH24:MI

  if (is_null($iTime))
  {
    return NULL;
  }

  // H = 24-hour format of an hour with leading zeros
  // i = Minutes with leading zeros

  return date("H:i:s", $iTime);
}

function string2Time($iTimeString)
{
  // Assumes the date is at the format HH24:MI

  if (is_null($iTimeString))
  {
    return NULL;
  }

  $hour = intval(substr($iTimeString, 0, 2));
  $minute = intval(substr($iTimeString, 3, 2));
  $second = 0;
  if (strlen($iTimeString) > 5) {
    $second = intval(substr($iTimeString, 6));
  }
  if (($hour < 0) || ($hour >= 24) || ($minute < 0) || ($minute >= 60))
  {
    trigger_error(sprintf('Felaktig tid %s, skall vara p� formatet HH:MM.', $iTimeString), E_USER_ERROR);
  }
  return mktime($hour, $minute, $second, 1, 1, 1970);
}

function dateTime2String($iDateTime)
{
  // Assumes the datetime is at the format YYYY-MM-DD HH24:MI:SS

  if (is_null($iDateTime))
  {
    return NULL;
  }

  // Y = A full numeric representation of a year, 4 digits
  // m = Numeric representation of a month, with leading zeros
  // d = Day of the month, 2 digits with leading zeros
  // H = 24-hour format of an hour with leading zeros
  // i = Minutes with leading zeros
  // s = Seconds, with leading zeros

  return date("Y-m-d H:i:s", $iDateTime);
}

function string2DateTime($iDateTimeString)
{
  // Assumes the datetime is at the format YYYY-MM-DD HH24:MI:SS

  if (is_null($iDateTimeString))
  {
    return NULL;
  }

  $year = intval(substr($iDateTimeString, 0, 4));
  $month = intval(substr($iDateTimeString, 5, 2));
  $day = intval(substr($iDateTimeString, 8, 2));
  $hour = intval(substr($iDateTimeString, 11, 2));
  $minute = intval(substr($iDateTimeString, 14, 2));
  $second = intval(substr($iDateTimeString, 17));
  if (($year < 1900) || ($year > 2100) || ($month <= 0) || ($month > 12) || ($day <= 0) || ($day > 31))
  {
    trigger_error(sprintf('Felaktigt datum/tid %s, skall vara p� formatet YYYY-MM-DD HH:MM:SS.', $iDateTimeString), E_USER_ERROR);
  }
  if (($hour < 0) || ($hour >= 24) || ($minute < 0) || ($minute >= 60) || ($second < 0) || ($second >= 60))
  {
    trigger_error(sprintf('Felaktigt datum/tid %s, skall vara p� formatet YYYY-MM-DD HH:MM:SS.', $iDateTimeString), E_USER_ERROR);
  }
  return mktime($hour, $minute, $second, $month, $day, $year);
}

function dateDiff($iDateOne, $iDateTwo)
{
  return (floor(strtotime(date("Y-m-d", $iDateTwo))/86400) - floor(strtotime(date("Y-m-d", $iDateOne))/86400));
}

function NVL($value, $replace)
{
  if (!isset($value))
  {
    return $replace;
  }
  else
  {
    return $value;
  }
}

function getRequestString($param)
{
  if (!isset($param) || is_null($param) || $param == "null")
  {
    return "";
  } else {
    return $param;
  }
}

function getRequestInt($param)
{
  if ((!isset($param) || is_null($param) || $param == "null") && ($param !== 0))
  {
    return null;
  } else {
    return intval($param);
  }
}

function getRequestDecimal($param)
{
  if (!isset($param) || is_null($param) || $param == "null")
  {
    return null;
  } else {
    return floatval($param);
  }
}

function getRequestDate($param)
{
  if (!isset($param) || is_null($param) || $param == "null")
  {
    return null;
  } else {
    return Date("Y-m-d", string2Date($param));
  }
}

function getRequestDateTime($param)
{
  if (!isset($param) || is_null($param) || $param == "null")
  {
    return null;
  } else {
    return Date("Y-m-d G:i:s", string2DateTime($param));
  }
}

function getRequestTime($param, $paramDate = null)
{
  if (!isset($param) || is_null($param) || $param == "null")
  {
    return null;
  }
  elseif (!isset($paramDate) || is_null($paramDate) || $paramDate == "null")
  {
    return Date("G:i:s", string2Time($param));
  }
  else
  {
    return Date("Y-m-d G:i:s", string2DateTime($paramDate . " " . $param));
  }
}

error_reporting(E_USER_ERROR | E_ERROR | E_USER_WARNING | E_USER_NOTICE);
function error_handler($errno, $errstr, $errfile, $errline)
{
  ob_flush();
  flush();  // needed ob_flush

  if (isset($db_conn)) {
    mysqli_rollback($db_conn);
  }
  ob_end_clean();
  header('HTTP/1.1 500 Internal Server Error');
  $error = new stdClass();
  $error->message = $errstr;
  $error->phpFile = $errfile;
  $error->phpLineNumber = $errline;
  header("Content-Type: application/json");
  ini_set( 'precision', 20 );
  ini_set( 'serialize_precision', 14 );
  echo json_encode($error);
  die(0);
}

ob_start();
$old_error_handler = set_error_handler("error_handler");
date_default_timezone_set("Europe/Stockholm");
ini_set("magic_quotes_gpc", false);
ini_set("magic_quotes_runtime", false);
?>
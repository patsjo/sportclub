<?php

//############################################################
//# File:    kalender.php                                    #
//# Created: 2001-09-29                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2001-09-29  PatSjo  Initial version                      #
//# 2003-12-24  PatSjo  Added parameters "CompetitionType",  #
//#                     "URL" and "departureJamjo"           #
//# 2005-08-27  PatSjo  Changes from Access to MySQL         #
//# 2006-01-09  PatSjo  str_replaced &nbsp; with a ordinary space#
//# 2005-12-31  PatSjo  Changes from ASP to PHP              #
//# 2021-08-21  PatSjo  Remove HTML functions                #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");

function getActivityInfo($iActivityID,
                         &$oActivityTypeID, &$oActivityDay, &$oActivityTime,
                         &$oPlace, &$oHeader, &$oDescr,
                         &$oURL, &$oDepartureLammhult,
                         &$oDepartureSandsbro, &$oDepartureOsterleden, &$oDepartureHejargatan,
                         &$oResponsibleUserID, &$oGroupID)
{
  OpenDatabase();

  $sql = "SELECT a.activity_day, a.activity_id, a.activity_time, " .
         "       a.place, a.header, a.descr, " .
         "       a.departure_lammhult, a.departure_sandsbro, a.departure_osterleden, " .
         "       a.departure_hejargatan, a.responsible_user_id, a.mod_date, " .
         "       a.url, a.activity_type_id, a.group_id " .
         "FROM activity AS a " .
         "WHERE a.activity_id = " . $iActivityID;

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if ($row = \db\mysql_fetch_assoc($result))
  {
    $oActivityTypeID      = intval($row['activity_type_id']);
    $oActivityDay         = strtotime($row['activity_day']);
    $oActivityTime        = is_null($row['activity_time']) ? NULL : strtotime($row['activity_time']);
    $oPlace               = $row['place'];
    $oHeader              = $row['header'];
    $oDescr               = $row['descr'];
    $oURL                 = $row['url'];
    $oDepartureLammhult   = is_null($row['departure_lammhult']) ? NULL : strtotime($row['departure_lammhult']);
    $oDepartureSandsbro   = is_null($row['departure_sandsbro']) ? NULL : strtotime($row['departure_sandsbro']);
    $oDepartureOsterleden = is_null($row['departure_osterleden']) ? NULL : strtotime($row['departure_osterleden']);
    $oDepartureHejargatan = is_null($row['departure_hejargatan']) ? NULL : strtotime($row['departure_hejargatan']);
    $oResponsibleUserID   = intval($row['responsible_user_id']);
    $oGroupID             = intval($row['group_id']);
  }

  \db\mysql_free_result($result);
}

function saveActivity($iActivityID, $iGroupID, $iActivityTypeID,
                      $iActivityDay, $iActivityTime, $iPlace,
                      $iHeader, $iDescr, $iURL,                    $iDepartureLammhult, $iDepartureSandsbro,
                      $iDepartureOsterleden, $iDepartureHejargatan, $iResponsibleUserID,
                      &$oErrCode, &$oErrText)
{
  global $user_id;

  OpenDatabase();

  if ($iActivityID == 0)
  {
    $sql =
        "INSERT INTO activity " .
        "(" .
        "  group_id, activity_type_id," .
        "  activity_day, activity_time, place," .
        "  header, descr, url," .
        "  departure_lammhult, departure_sandsbro," .
        "  departure_osterleden, departure_hejargatan, responsible_user_id," .
        "  cre_by_user_id, cre_date, mod_by_user_id, mod_date" .
        ") " .
        "VALUES " .
        "(" .
        $iGroupID . "," . $iActivityTypeID . "," .
        str_replace("''", "Null", "'" . date2String($iActivityDay) . "'") . "," .
        str_replace("''", "Null", "'" . time2String($iActivityTime) . "'") . "," .
        "'" . str_replace("'", "", $iPlace) . "','" . str_replace("'", "", $iHeader) . "'," .
        "'" . str_replace("'", "", $iDescr) . "','" .
        str_replace("'", "", $iURL) . "'," .
        str_replace("''", "Null", "'" . time2String($iDepartureLammhult) . "'") . "," .
        str_replace("''", "Null", "'" . time2String($iDepartureSandsbro) . "'") . "," .
        str_replace("''", "Null", "'" . time2String($iDepartureOsterleden) . "'") . "," .
        str_replace("''", "Null", "'" . time2String($iDepartureHejargatan) . "'") . "," .
        $iResponsibleUserID . "," .
        $user_id . ",'" . datetime2String(time()) . "'," .
        $user_id . ",'" . datetime2String(time()) . "'" .
        ")";
  }
  else
  {
    $sql =
        "UPDATE activity " .
        "SET group_id = " . $iGroupID . ", activity_type_id = " . $iActivityTypeID . ", " .
        "    activity_day = " . str_replace("''", "Null", "'" . date2String($iActivityDay) . "'") . ", " .
        "    activity_time = " . str_replace("''", "Null", "'" . time2String($iActivityTime) . "'") . ", " .
        "    place = '" . str_replace("'", "", $iPlace) . "', header = '" . str_replace("''", "Null", $iHeader) . "', " .
        "    descr = '" . str_replace("'", "", $iDescr) . "', " .
        "    url = '" . str_replace("'", "", $iURL) . "', " .
        "    departure_lammhult = " . str_replace("''", "Null", "'" . time2String($iDepartureLammhult) . "'") . ", " .
        "    departure_sandsbro = " . str_replace("''", "Null", "'" . time2String($iDepartureSandsbro) . "'") . ", " .
        "    departure_osterleden = " . str_replace("''", "Null", "'" . time2String($iDepartureOsterleden) . "'") . ", " .
        "    departure_hejargatan = " . str_replace("''", "Null", "'" . time2String($iDepartureHejargatan) . "'") . ", " .
        "    responsible_user_id = " . $iResponsibleUserID . ", " .
        "    mod_by_user_id = " . $user_id . ", mod_date = '" . datetime2String(time()) . "'" .
        "WHERE activity_id = " . $iActivityID;
  }

  if (!\db\mysql_query($sql))
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
}

?>
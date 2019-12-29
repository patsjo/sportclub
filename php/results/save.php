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
  
  header("Access-Control-Allow-Credentials: true");
  header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
  header("Access-Control-Allow-Headers: *");
  header("Content-Type: application/json; charset=ISO-8859-1");
  echo utf8_decode(json_encode($x));
  CloseDatabase();
  exit();
?>
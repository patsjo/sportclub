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
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

ValidLogin();

$offset = 0;
$limit = 10000;
$iType = 0;
$iFromDate = NULL;
$iToDate = NULL;
$rows = array();

if(isset($_REQUEST['offset']) && $_REQUEST['offset']!="")
{
  $offset = intval($_REQUEST['offset']);
}
if(isset($_REQUEST['limit']) && $_REQUEST['limit']!="")
{
  $limit = intval($_REQUEST['limit']);
}
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

if ($iType == "EVENTS")
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

  $sql = "SELECT * FROM RACE_EVENT WHERE 1=1" . $whereStartDate . $whereEndDate . " ORDER BY RACEDATE ASC";
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
      $x->eventorId             = intval($row['EVENTOR_ID']);
      $x->eventorRaceId         = is_null($row['EVENTOR_RACE_ID']) ? NULL : intval($row['EVENTOR_RACE_ID']);
      array_push($rows, $x);
    }
  }
}
elseif ($iType == "CLUBS")
{
  $eventClassifications = array();
  $clubs = array();

  $sql = "SELECT * FROM RACE_EVENT_CLASSIFICATION";
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
        die('SQL Error: ' . \db\mysql_error());
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
    die('SQL Error: ' . \db\mysql_error());
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
        die('SQL Error: ' . \db\mysql_error());
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
          $y->startDate            = is_null($row2['START_DATE']) ? NULL : date2String(strtotime($row2['START_DATE']));
          $y->endDate              = is_null($row2['END_DATE']) ? NULL : date2String(strtotime($row2['END_DATE']));
          $y->eventorCompetitorIds = array();

          $sql3 = "SELECT * FROM RACE_COMPETITORS_EVENTOR WHERE COMPETITOR_ID = " . $y->competitorId;
          $result3 = \db\mysql_query($sql3);
          if (!$result3)
          {
            die('SQL Error: ' . \db\mysql_error());
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
      die('SQL Error: ' . \db\mysql_error());
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
    
    $rows = new stdClass();
    $rows->clubs                = $clubs;
    $rows->eventClassifications = $eventClassifications;
    $rows->classLevels          = $domainClassLevel->values;
  }
}
else
{
  die('Wrong iType parameter');
}

header("Access-Control-Allow-Credentials: true");
if (isset($_SERVER['HTTP_ORIGIN']))
{
  header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
}
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json; charset=ISO-8859-1");
echo utf8_decode(json_encode($rows));

\db\mysql_free_result($result);

?>
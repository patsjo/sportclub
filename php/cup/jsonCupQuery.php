<?php
//############################################################
//# File:    jsonCupQuery.php                                #
//# Created: 2026-11-04                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iType                                        #
//#   CUPS        All cups (iIncludeInactive for admins)     #
//#   CUP         One cup by iSlug or iCupId, including      #
//#               seasons, races and reports                 #
//#   RESULTS     All results for the races in iSeasonId     #
//#   DB_RESULTS  Results from the clubs own result database #
//#               (iEventId or iEventorId, iEventorRaceId,   #
//#                iUseTotalResult)                          #
//#   RACES_FOR_EVENT  The cup races a club race can be      #
//#               linked to (iEventId, iEventorId,           #
//#               iEventorRaceId, iRaceDate)                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-04  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/cup.php");

cors();

global $user_id;
setUserID();
$isAdmin = $user_id > 0 && ValidGroup($cADMIN_GROUP_ID);

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

if (!isset($input->iType))
{
  $input->iType = "CUPS";
}

OpenDatabase();

$rows = null;

if ($input->iType == "CUPS")
{
  $includeInactive = isset($input->iIncludeInactive) && $input->iIncludeInactive && $isAdmin;
  $rows = getCups($includeInactive ? "1 = 1" : "IS_ACTIVE = TRUE");
}
elseif ($input->iType == "CUP")
{
  if (isset($input->iSlug) && $input->iSlug != "")
  {
    $where = "SLUG = " . cupSqlString($input->iSlug);
  }
  elseif (isset($input->iCupId))
  {
    $where = "CUP_ID = " . intval($input->iCupId);
  }
  else
  {
    cupError('Felaktig parameter "iSlug" eller "iCupId"');
  }
  if (!$isAdmin)
  {
    $where .= " AND IS_ACTIVE = TRUE";
  }

  $cups = getCups($where);
  if (count($cups) == 0)
  {
    CloseDatabase();
    header("HTTP/1.0 404 Not Found");
    cupOutputJson((object) array('message' => 'Cupen finns inte.'));
    exit(0);
  }
  $rows = $cups[0];
  $rows->seasons = getCupSeasons($rows->cupId);
}
elseif ($input->iType == "RESULTS")
{
  if (!isset($input->iSeasonId))
  {
    cupError('Felaktig parameter "iSeasonId"');
  }
  $rows = getCupSeasonResults(intval($input->iSeasonId));
}
elseif ($input->iType == "DB_RESULTS")
{
  if (!$isAdmin)
  {
    NotAuthorized();
  }
  if (!isset($input->iEventorId) && !isset($input->iEventId))
  {
    cupError('Felaktig parameter "iEventId" eller "iEventorId"');
  }
  $rows = getCupDbRaceResults(
    isset($input->iCupRaceId) ? intval($input->iCupRaceId) : -1,
    isset($input->iEventId) ? cupIntOrNull($input->iEventId) : NULL,
    isset($input->iEventorId) ? cupIntOrNull($input->iEventorId) : NULL,
    isset($input->iEventorRaceId) ? cupIntOrNull($input->iEventorRaceId) : NULL,
    isset($input->iUseTotalResult) && $input->iUseTotalResult
  );
}
elseif ($input->iType == "RACES_FOR_EVENT")
{
  if (!$isAdmin)
  {
    NotAuthorized();
  }
  if (!isset($input->iRaceDate))
  {
    cupError('Felaktig parameter "iRaceDate"');
  }
  $rows = getCupRacesForEvent(
    isset($input->iEventId) ? intval($input->iEventId) : -1,
    isset($input->iEventorId) ? cupIntOrNull($input->iEventorId) : NULL,
    isset($input->iEventorRaceId) ? cupIntOrNull($input->iEventorRaceId) : NULL,
    date2String(string2Date($input->iRaceDate))
  );
}
else
{
  cupError('Felaktig parameter "iType"');
}

CloseDatabase();
cupOutputJson($rows);

?>

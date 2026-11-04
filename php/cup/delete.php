<?php
//############################################################
//# File:    delete.php                                      #
//# Created: 2026-11-04                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iType (CUP, SEASON, RACE, REPORT) and the    #
//#             id of that type (iCupId, iSeasonId,          #
//#             iCupRaceId, iReportId)                       #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-04  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/cup.php");

cors();

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

ValidLogin();
if (!ValidGroup($cADMIN_GROUP_ID))
{
  NotAuthorized();
}

OpenDatabase();

//# The report images are in the files table, which has no    #
//# cascade from the reports. Collect them before deleting.   #
function cupFileIdsWhere($where)
{
  $fileIds = array();
  $result = cupQuery("SELECT RF.FILE_ID FROM CUP_REPORT_FILES RF INNER JOIN CUP_REPORTS R ON (RF.REPORT_ID = R.REPORT_ID) " .
                     "LEFT OUTER JOIN CUP_SEASON S ON (R.SEASON_ID = S.SEASON_ID) WHERE " . $where);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    array_push($fileIds, intval($row['FILE_ID']));
  }
  \db\mysql_free_result($result);
  return $fileIds;
}

$type = isset($input->iType) ? $input->iType : '';

if ($type == "CUP" && isset($input->iCupId))
{
  $fileIds = cupFileIdsWhere("S.CUP_ID = " . intval($input->iCupId));
  deleteCupReportFiles($fileIds);
  cupQuery(sprintf("DELETE FROM CUP WHERE CUP_ID = %d", $input->iCupId));
}
elseif ($type == "SEASON" && isset($input->iSeasonId))
{
  $fileIds = cupFileIdsWhere("R.SEASON_ID = " . intval($input->iSeasonId));
  deleteCupReportFiles($fileIds);
  cupQuery(sprintf("DELETE FROM CUP_SEASON WHERE SEASON_ID = %d", $input->iSeasonId));
}
elseif ($type == "RACE" && isset($input->iCupRaceId))
{
  $fileIds = cupFileIdsWhere("R.CUP_RACE_ID = " . intval($input->iCupRaceId));
  deleteCupReportFiles($fileIds);
  cupQuery(sprintf("DELETE FROM CUP_RACE WHERE CUP_RACE_ID = %d", $input->iCupRaceId));
}
elseif ($type == "REPORT" && isset($input->iReportId))
{
  deleteCupReportFiles(getCupReportFileIds(intval($input->iReportId)));
  cupQuery(sprintf("DELETE FROM CUP_REPORTS WHERE REPORT_ID = %d", $input->iReportId));
}
else
{
  cupError('Felaktig parameter "iType"');
}

CloseDatabase();
cupOutputJson((object) array('deleted' => true));

?>

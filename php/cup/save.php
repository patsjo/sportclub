<?php
//############################################################
//# File:    save.php                                        #
//# Created: 2026-11-04                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iType                                        #
//#   CUP           iCupId (-1 = new), iName, iSlug,         #
//#                 iDescription, iTheme, iPrimaryColor,     #
//#                 iSecondaryColor, iIsActive,              #
//#                 iShowInToolbar                           #
//#   SEASON        iSeasonId (-1 = new), iCupId, iName,     #
//#                 iStartDate, iEndDate, iSettings (object) #
//#   RACES         iSeasonId, iRaces (array of iCupRaceId   #
//#                 (-1 = new), iName, iRaceDate, iEventorId,#
//#                 iEventorRaceId, iUseTotalResult, iTheme) #
//#                 A race the club already has imported is  #
//#                 linked and its results saved directly.   #
//#   RACE_USE_TOTAL_RESULT  iCupRaceId, iUseTotalResult,    #
//#                 only that, the linked results are saved  #
//#                 again (stage or total after the stage)   #
//#   RACE_RESULTS  iCupRaceId, iResults (array), replaces   #
//#                 all results for the race                 #
//#   EVENTOR_RESULTS  iCupRaceId, iResults, all participants  #
//#                 from Eventor, see saveCupEventorResults  #
//#   REPORT        iReportId (-1 = new), iSeasonId,         #
//#                 iCupRaceId, iHeader, iIntroduction,      #
//#                 iText, iFiles (same as news/save.php)    #
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

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

if (!isset($input->iType))
{
  $input->iType = "";
}

ValidLogin();
if (!ValidGroup($cADMIN_GROUP_ID))
{
  NotAuthorized();
}

OpenDatabase();
$now = date("Y-m-d G:i:s"); // MySQL DATETIME
$rows = null;

if ($input->iType == "CUP")
{
  $name = isset($input->iName) ? trim($input->iName) : '';
  $slug = isset($input->iSlug) ? strtolower(trim($input->iSlug)) : '';
  if ($name == '' || strlen($name) > 128)
  {
    cupError('Felaktig parameter "Namn", måste anges och får max vara 128 tecken.');
  }
  if (!preg_match('/^[a-z0-9][a-z0-9-]{0,63}$/', $slug))
  {
    cupError('Felaktig parameter "Adress", får bara innehålla a-z, 0-9 och bindestreck.');
  }
  if (!isset($input->iTheme) || !in_array($input->iTheme, $cCUP_THEMES))
  {
    cupError('Felaktig parameter "Tema"');
  }
  $cupId = isset($input->iCupId) ? intval($input->iCupId) : -1;

  $result = cupQuery(sprintf("SELECT CUP_ID FROM CUP WHERE SLUG = %s AND CUP_ID <> %d", cupSqlString($slug), $cupId));
  if (\db\mysql_num_rows($result) > 0)
  {
    cupError('Det finns redan en cup med samma adress.');
  }
  \db\mysql_free_result($result);

  $primaryColor = isset($input->iPrimaryColor) && $input->iPrimaryColor != '' ? $input->iPrimaryColor : NULL;
  $secondaryColor = isset($input->iSecondaryColor) && $input->iSecondaryColor != '' ? $input->iSecondaryColor : NULL;
  $description = isset($input->iDescription) ? $input->iDescription : '';
  $isActive = !isset($input->iIsActive) || $input->iIsActive;
  $showInToolbar = isset($input->iShowInToolbar) && $input->iShowInToolbar;

  if ($cupId <= 0)
  {
    cupQuery(sprintf("INSERT INTO CUP (NAME, SLUG, DESCRIPTION, THEME, PRIMARY_COLOR, SECONDARY_COLOR, IS_ACTIVE, SHOW_IN_TOOLBAR, " .
                     "CRE_BY_USER_ID, CRE_DATE, MOD_BY_USER_ID, MOD_DATE) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %d, '%s', %d, '%s')",
                     cupSqlString($name), cupSqlString($slug), cupSqlString($description), cupSqlString($input->iTheme),
                     cupSqlString($primaryColor), cupSqlString($secondaryColor), cupSqlBool($isActive), cupSqlBool($showInToolbar),
                     $user_id, $now, $user_id, $now));
    $cupId = \db\mysql_insert_id();
  }
  else
  {
    cupQuery(sprintf("UPDATE CUP SET NAME = %s, SLUG = %s, DESCRIPTION = %s, THEME = %s, PRIMARY_COLOR = %s, " .
                     "SECONDARY_COLOR = %s, IS_ACTIVE = %s, SHOW_IN_TOOLBAR = %s, MOD_BY_USER_ID = %d, MOD_DATE = '%s' WHERE CUP_ID = %d",
                     cupSqlString($name), cupSqlString($slug), cupSqlString($description), cupSqlString($input->iTheme),
                     cupSqlString($primaryColor), cupSqlString($secondaryColor), cupSqlBool($isActive), cupSqlBool($showInToolbar),
                     $user_id, $now, $cupId));
  }

  $cups = getCups("CUP_ID = " . intval($cupId));
  $rows = $cups[0];
}
elseif ($input->iType == "SEASON")
{
  $name = isset($input->iName) ? trim($input->iName) : '';
  if ($name == '' || strlen($name) > 64)
  {
    cupError('Felaktig parameter "Säsong", måste anges och får max vara 64 tecken.');
  }
  if (!isset($input->iCupId))
  {
    cupError('Felaktig parameter "iCupId"');
  }
  if (!isset($input->iSettings) || !is_object($input->iSettings))
  {
    cupError('Felaktig parameter "iSettings"');
  }
  if (!isset($input->iStartDate) || !isset($input->iEndDate))
  {
    cupError('Säsongens start- och slutdatum måste anges.');
  }
  $startDate = date2String(string2Date($input->iStartDate));
  $endDate = date2String(string2Date($input->iEndDate));
  if ($startDate > $endDate)
  {
    cupError('Säsongens startdatum måste vara före slutdatum.');
  }
  $settings = json_encode($input->iSettings);
  $seasonId = isset($input->iSeasonId) ? intval($input->iSeasonId) : -1;

  if ($seasonId > 0)
  {
    $result = cupQuery(sprintf("SELECT NAME, RACE_DATE FROM CUP_RACE WHERE SEASON_ID = %d AND (RACE_DATE < '%s' OR RACE_DATE > '%s')",
                               $seasonId, $startDate, $endDate));
    while ($row = \db\mysql_fetch_assoc($result))
    {
      cupError(sprintf('Deltävlingen "%s" (%s) ligger utanför säsongens datum.', $row['NAME'], $row['RACE_DATE']));
    }
    \db\mysql_free_result($result);
  }

  if ($seasonId <= 0)
  {
    cupQuery(sprintf("INSERT INTO CUP_SEASON (CUP_ID, NAME, START_DATE, END_DATE, SETTINGS) VALUES (%d, %s, '%s', '%s', %s)",
                     $input->iCupId, cupSqlString($name), $startDate, $endDate, cupSqlString($settings)));
    $seasonId = \db\mysql_insert_id();
  }
  else
  {
    cupQuery(sprintf("UPDATE CUP_SEASON SET NAME = %s, START_DATE = '%s', END_DATE = '%s', SETTINGS = %s WHERE SEASON_ID = %d",
                     cupSqlString($name), $startDate, $endDate, cupSqlString($settings), $seasonId));
  }

  $rows = new stdClass();
  $rows->seasonId = intval($seasonId);
}
elseif ($input->iType == "RACES")
{
  if (!isset($input->iSeasonId) || !isset($input->iRaces) || !is_array($input->iRaces))
  {
    cupError('Felaktig parameter "iSeasonId" eller "iRaces"');
  }
  $season = null;
  $result = cupQuery(sprintf("SELECT START_DATE, END_DATE FROM CUP_SEASON WHERE SEASON_ID = %d", $input->iSeasonId));
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $season = $row;
  }
  \db\mysql_free_result($result);
  if (is_null($season))
  {
    cupError('Säsongen finns inte.');
  }

  $rows = array();
  foreach ($input->iRaces as $race)
  {
    $name = isset($race->iName) ? trim($race->iName) : '';
    if ($name == '' || strlen($name) > 128)
    {
      cupError('Felaktig parameter "Namn" på deltävling.');
    }
    $raceDate = date2String(string2Date($race->iRaceDate));
    if ($raceDate < $season['START_DATE'] || $raceDate > $season['END_DATE'])
    {
      cupError(sprintf('Deltävlingen "%s" (%s) ligger utanför säsongens datum %s - %s.',
                       $name, $raceDate, $season['START_DATE'], $season['END_DATE']));
    }
    $theme = isset($race->iTheme) && in_array($race->iTheme, $cCUP_THEMES) ? $race->iTheme : NULL;
    $cupRaceId = isset($race->iCupRaceId) ? intval($race->iCupRaceId) : -1;
    $eventorId = isset($race->iEventorId) ? $race->iEventorId : NULL;
    $eventorRaceId = isset($race->iEventorRaceId) ? $race->iEventorRaceId : NULL;
    $useTotalResult = isset($race->iUseTotalResult) && $race->iUseTotalResult;

    if ($cupRaceId <= 0)
    {
      cupQuery(sprintf("INSERT INTO CUP_RACE (SEASON_ID, NAME, RACE_DATE, EVENTOR_ID, EVENTOR_RACE_ID, USE_TOTAL_RESULT, THEME) " .
                       "VALUES (%d, %s, '%s', %s, %s, %s, %s)",
                       $input->iSeasonId, cupSqlString($name), $raceDate, cupSqlInt($eventorId), cupSqlInt($eventorRaceId),
                       cupSqlBool($useTotalResult), cupSqlString($theme)));
      $cupRaceId = \db\mysql_insert_id();
    }
    else
    {
      cupQuery(sprintf("UPDATE CUP_RACE SET NAME = %s, RACE_DATE = '%s', EVENTOR_ID = %s, EVENTOR_RACE_ID = %s, " .
                       "USE_TOTAL_RESULT = %s, THEME = %s WHERE CUP_RACE_ID = %d AND SEASON_ID = %d",
                       cupSqlString($name), $raceDate, cupSqlInt($eventorId), cupSqlInt($eventorRaceId),
                       cupSqlBool($useTotalResult), cupSqlString($theme), $cupRaceId, $input->iSeasonId));
    }
    // Results the club already has imported are fetched to the cup directly
    $linked = new stdClass();
    $linked->cupRaceId = intval($cupRaceId);
    $linked->eventId = linkCupRaceToSavedEvent(intval($cupRaceId));
    array_push($rows, $linked);
  }
}
elseif ($input->iType == "RACE_USE_TOTAL_RESULT")
{
  // Only whether the stage or the total after the stage counts, from the result import. The rest of the race is
  // left as it is, the import does not know it all (e.g. the theme).
  if (!isset($input->iCupRaceId))
  {
    cupError('Felaktig parameter "iCupRaceId"');
  }
  $cupRaceId = intval($input->iCupRaceId);
  $useTotalResult = isset($input->iUseTotalResult) && $input->iUseTotalResult;
  cupQuery(sprintf("UPDATE CUP_RACE SET USE_TOTAL_RESULT = %s WHERE CUP_RACE_ID = %d",
                   cupSqlBool($useTotalResult), $cupRaceId));
  // The results of a race the club has saved are saved again, by the stage or the total
  $linked = new stdClass();
  $linked->cupRaceId = $cupRaceId;
  $linked->eventId = linkCupRaceToSavedEvent($cupRaceId);
  $rows = array($linked);
}
elseif ($input->iType == "RACE_RESULTS")
{
  if (!isset($input->iCupRaceId) || !isset($input->iResults) || !is_array($input->iResults))
  {
    cupError('Felaktig parameter "iCupRaceId" eller "iResults"');
  }
  $cupRaceId = intval($input->iCupRaceId);
  cupQuery(sprintf("DELETE FROM CUP_RACE_RESULTS WHERE CUP_RACE_ID = %d", $cupRaceId));

  foreach ($input->iResults as $r)
  {
    insertCupRaceResult($cupRaceId, $r);
  }

  $rows = new stdClass();
  $rows->cupRaceId = $cupRaceId;
  $rows->nofResults = count($input->iResults);
}
elseif ($input->iType == "EVENTOR_RESULTS")
{
  //# The full result list from Eventor, for seasons with all   #
  //# participants. Participants from other clubs are only      #
  //# saved here, never in the clubs own result tables. Club    #
  //# members are taken from the clubs own results, if the race #
  //# is imported, otherwise from Eventor until it is imported. #
  if (!isset($input->iCupRaceId) || !isset($input->iResults) || !is_array($input->iResults))
  {
    cupError('Felaktig parameter "iCupRaceId" eller "iResults"');
  }
  $cupRaceId = intval($input->iCupRaceId);
  $rows = saveCupEventorResults($cupRaceId, $input->iResults);
}
elseif ($input->iType == "REPORT")
{
  $header = isset($input->iHeader) ? trim($input->iHeader) : '';
  if ($header == '' || strlen($header) > 128)
  {
    cupError('Felaktig parameter "Rubrik", måste anges och får max vara 128 tecken.');
  }
  if (!isset($input->iSeasonId))
  {
    cupError('Felaktig parameter "iSeasonId"');
  }
  $files = isset($input->iFiles) && is_array($input->iFiles) ? $input->iFiles : array();
  foreach ($files as $file)
  {
    if (!isset($file->iFileID))
    {
      cupError('Felaktig parameter "iFileID"');
    }
    if ($file->iFileID != -1)
    {
      continue;
    }
    if (!isset($file->iFileData) || !isset($file->iMimeType) || !isset($file->iFileSize) || !isset($file->iFileName))
    {
      cupError('Felaktig parameter "Filnamn", fil saknas.');
    }
    if (strlen($file->iFileName) > 255)
    {
      cupError('Felaktig parameter "Filnamn", fler än 255 tecken.');
    }
    if ($file->iFileSize <= 0 || $file->iFileSize > 10000000)
    {
      cupError('Bilden/filen saknas eller är större än 10MB.');
    }
  }

  $reportId = isset($input->iReportId) ? intval($input->iReportId) : -1;
  $cupRaceId = isset($input->iCupRaceId) ? $input->iCupRaceId : NULL;
  $oldFileIds = $reportId > 0 ? getCupReportFileIds($reportId) : array();

  $fileIds = array();
  foreach ($files as $file)
  {
    if ($file->iFileID == -1)
    {
      list($fileId, $w, $h) = insertNewsFile($file, $user_id, $now);
    }
    else
    {
      $fileId = intval($file->iFileID);
    }
    array_push($fileIds, $fileId);
  }

  if ($reportId <= 0)
  {
    cupQuery(sprintf("INSERT INTO CUP_REPORTS (SEASON_ID, CUP_RACE_ID, HEADER, INTRODUCTION, TEXT, " .
                     "CRE_BY_USER_ID, CRE_DATE, MOD_BY_USER_ID, MOD_DATE) VALUES (%d, %s, %s, %s, %s, %d, '%s', %d, '%s')",
                     $input->iSeasonId, cupSqlInt($cupRaceId), cupSqlString($header),
                     cupSqlString(isset($input->iIntroduction) ? $input->iIntroduction : ''),
                     cupSqlString(isset($input->iText) ? $input->iText : ''),
                     $user_id, $now, $user_id, $now));
    $reportId = \db\mysql_insert_id();
  }
  else
  {
    cupQuery(sprintf("UPDATE CUP_REPORTS SET CUP_RACE_ID = %s, HEADER = %s, INTRODUCTION = %s, TEXT = %s, " .
                     "MOD_BY_USER_ID = %d, MOD_DATE = '%s' WHERE REPORT_ID = %d",
                     cupSqlInt($cupRaceId), cupSqlString($header),
                     cupSqlString(isset($input->iIntroduction) ? $input->iIntroduction : ''),
                     cupSqlString(isset($input->iText) ? $input->iText : ''),
                     $user_id, $now, $reportId));
  }

  cupQuery(sprintf("DELETE FROM CUP_REPORT_FILES WHERE REPORT_ID = %d", $reportId));
  $order = 0;
  foreach (array_unique($fileIds) as $fileId)
  {
    cupQuery(sprintf("INSERT INTO CUP_REPORT_FILES (REPORT_ID, FILE_ID, ORDER_FIELD) VALUES (%d, %d, %d)", $reportId, $fileId, $order));
    $order++;
  }
  deleteCupReportFiles($oldFileIds, $fileIds);

  $rows = getCupReport($reportId);
}
else
{
  cupError('Felaktig parameter "iType"');
}

CloseDatabase();
cupOutputJson($rows);

?>

<?php

//############################################################
//# File:    cup.php                                         #
//# Created: 2026-11-04                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Shared helpers for the cups. A cup has seasons, a season #
//# has races, results and reports (with images).            #
//# The rules of a season (point system, categories, ...)    #
//# are stored as JSON in CUP_SEASON.SETTINGS and the        #
//# standings are calculated by the client.                  #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-04  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/news.php");

$cCUP_THEMES = array('NIGHT', 'YOUTH', 'WINTER', 'SUMMER', 'SPRING', 'AUTUMN', 'HALLOWEEN');
$cCUP_RESULT_STATUS = array('OK', 'DNS', 'DNF', 'MP', 'DSQ');
$cCUP_RESULT_SOURCES = array('DB', 'EVENTOR', 'MANUAL');

// Passing E_USER_ERROR to trigger_error() is deprecated since PHP 8.4,
// error_handler() in functions.php answers with a JSON 500 for any level.
function cupError($message)
{
  trigger_error($message, E_USER_WARNING);
  exit(1);
}

function cupQuery($sql)
{
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    cupError('SQL Error: ' . \db\mysql_error() . ' SQL: ' . substr($sql, 0, 1024));
  }
  return $result;
}

function cupSqlInt($value)
{
  return (is_null($value) || $value === '') ? 'NULL' : strval(intval($value));
}

function cupSqlString($value)
{
  return is_null($value) ? 'NULL' : "'" . \db\mysql_real_escape_string(strval($value)) . "'";
}

function cupSqlBool($value)
{
  return $value ? 'TRUE' : 'FALSE';
}

function cupIntOrNull($value)
{
  return is_null($value) ? NULL : intval($value);
}

function cupIdList($ids)
{
  $ids = array_map('intval', $ids);
  return count($ids) > 0 ? implode(', ', $ids) : '-1';
}

function cupRow2Cup($row)
{
  $x = new stdClass();
  $x->cupId          = intval($row['CUP_ID']);
  $x->name           = $row['NAME'];
  $x->slug           = $row['SLUG'];
  $x->description    = is_null($row['DESCRIPTION']) ? '' : $row['DESCRIPTION'];
  $x->theme          = $row['THEME'];
  $x->primaryColor   = $row['PRIMARY_COLOR'];
  $x->secondaryColor = $row['SECONDARY_COLOR'];
  $x->isActive       = boolval($row['IS_ACTIVE']);
  $x->showInToolbar  = boolval($row['SHOW_IN_TOOLBAR']);
  $x->seasons        = array();
  return $x;
}

function getCups($where)
{
  $cups = array();
  $result = cupQuery("SELECT * FROM CUP WHERE " . $where . " ORDER BY IS_ACTIVE DESC, NAME ASC");
  while ($row = \db\mysql_fetch_assoc($result))
  {
    array_push($cups, cupRow2Cup($row));
  }
  \db\mysql_free_result($result);
  return $cups;
}

function getCupSeasons($cupId)
{
  $seasons = array();
  $seasonsById = array();
  $result = cupQuery(sprintf("SELECT * FROM CUP_SEASON WHERE CUP_ID = %d ORDER BY START_DATE DESC, SEASON_ID DESC", $cupId));
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = new stdClass();
    $x->seasonId  = intval($row['SEASON_ID']);
    $x->cupId     = intval($row['CUP_ID']);
    $x->name      = $row['NAME'];
    $x->startDate = date2String(strtotime($row['START_DATE']));
    $x->endDate   = date2String(strtotime($row['END_DATE']));
    $x->settings  = json_decode($row['SETTINGS']);
    $x->races    = array();
    $x->reports  = array();
    array_push($seasons, $x);
    $seasonsById[$x->seasonId] = $x;
  }
  \db\mysql_free_result($result);

  if (count($seasons) == 0)
  {
    return $seasons;
  }

  $sql = "SELECT CR.*, (SELECT COUNT(*) FROM CUP_RACE_RESULTS RR WHERE RR.CUP_RACE_ID = CR.CUP_RACE_ID) AS NOF_RESULTS " .
         "FROM CUP_RACE CR WHERE CR.SEASON_ID IN (" . cupIdList(array_keys($seasonsById)) . ") " .
         "ORDER BY CR.RACE_DATE ASC, CR.CUP_RACE_ID ASC";
  $result = cupQuery($sql);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = new stdClass();
    $x->cupRaceId      = intval($row['CUP_RACE_ID']);
    $x->seasonId       = intval($row['SEASON_ID']);
    $x->name           = $row['NAME'];
    $x->raceDate       = date2String(strtotime($row['RACE_DATE']));
    $x->eventorId      = cupIntOrNull($row['EVENTOR_ID']);
    $x->eventorRaceId  = cupIntOrNull($row['EVENTOR_RACE_ID']);
    $x->useTotalResult = boolval($row['USE_TOTAL_RESULT']);
    $x->theme          = $row['THEME'];
    $x->eventId        = cupIntOrNull($row['EVENT_ID']);
    $x->nofResults     = intval($row['NOF_RESULTS']);
    array_push($seasonsById[$x->seasonId]->races, $x);
  }
  \db\mysql_free_result($result);

  $reportsById = array();
  $sql = "SELECT R.*, U.first_name, U.last_name FROM CUP_REPORTS R " .
         "LEFT OUTER JOIN users U ON (R.MOD_BY_USER_ID = U.user_id) " .
         "WHERE R.SEASON_ID IN (" . cupIdList(array_keys($seasonsById)) . ") " .
         "ORDER BY R.MOD_DATE DESC";
  $result = cupQuery($sql);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = cupRow2Report($row);
    array_push($seasonsById[$x->seasonId]->reports, $x);
    $reportsById[$x->reportId] = $x;
  }
  \db\mysql_free_result($result);
  addCupReportFiles($reportsById);

  return $seasons;
}

function cupRow2Report($row)
{
  $x = new stdClass();
  $x->reportId         = intval($row['REPORT_ID']);
  $x->seasonId         = intval($row['SEASON_ID']);
  $x->cupRaceId        = cupIntOrNull($row['CUP_RACE_ID']);
  $x->header           = $row['HEADER'];
  $x->introduction     = is_null($row['INTRODUCTION']) ? '' : $row['INTRODUCTION'];
  $x->text             = is_null($row['TEXT']) ? '' : $row['TEXT'];
  $x->modificationDate = $row['MOD_DATE'];
  $x->modifiedBy       = is_null($row['first_name']) ? '' : $row['first_name'] . " " . $row['last_name'];
  $x->files            = array();
  return $x;
}

function getCupReport($reportId)
{
  $sql = sprintf("SELECT R.*, U.first_name, U.last_name FROM CUP_REPORTS R " .
                 "LEFT OUTER JOIN users U ON (R.MOD_BY_USER_ID = U.user_id) WHERE R.REPORT_ID = %d", $reportId);
  $result = cupQuery($sql);
  $x = null;
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = cupRow2Report($row);
  }
  \db\mysql_free_result($result);
  if (!is_null($x))
  {
    addCupReportFiles(array($x->reportId => $x));
  }
  return $x;
}

function addCupReportFiles($reportsById)
{
  if (count($reportsById) == 0)
  {
    return;
  }

  $sql = "SELECT RF.REPORT_ID, F.file_id, F.file_name, F.mime_type, F.file_size, F.image_width, F.image_height " .
         "FROM CUP_REPORT_FILES RF INNER JOIN files F ON (RF.FILE_ID = F.file_id) " .
         "WHERE RF.REPORT_ID IN (" . cupIdList(array_keys($reportsById)) . ") " .
         "ORDER BY RF.REPORT_ID, RF.ORDER_FIELD, F.file_id";
  $result = cupQuery($sql);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $file = new stdClass();
    $file->fileId      = intval($row['file_id']);
    $file->fileName    = $row['file_name'];
    $file->fileType    = $row['mime_type'];
    $file->fileSize    = is_null($row['file_size']) ? 0 : intval($row['file_size']);
    $file->imageWidth  = is_null($row['image_width']) ? 0 : intval($row['image_width']);
    $file->imageHeight = is_null($row['image_height']) ? 0 : intval($row['image_height']);
    array_push($reportsById[intval($row['REPORT_ID'])]->files, $file);
  }
  \db\mysql_free_result($result);
}

function getCupReportFileIds($reportId)
{
  $fileIds = array();
  $result = cupQuery(sprintf("SELECT FILE_ID FROM CUP_REPORT_FILES WHERE REPORT_ID = %d", $reportId));
  while ($row = \db\mysql_fetch_assoc($result))
  {
    array_push($fileIds, intval($row['FILE_ID']));
  }
  \db\mysql_free_result($result);
  return $fileIds;
}

//# Removes the files that no longer belong to a report. The  #
//# files are stored in the news folder, see news.php.        #
function deleteCupReportFiles($fileIds, $keepFileIds = array())
{
  foreach ($fileIds as $fileId)
  {
    if ($fileId > 0 && !in_array($fileId, $keepFileIds))
    {
      cupQuery(sprintf("DELETE FROM CUP_REPORT_FILES WHERE FILE_ID = %d", $fileId));
      // Only delete the file itself if no news is using it
      cupQuery(sprintf("DELETE FROM files WHERE folder_id = %d AND file_id = %d AND " .
                       "NOT EXISTS (SELECT 1 FROM news_files WHERE news_files.file_id = %d) AND " .
                       "NOT EXISTS (SELECT 1 FROM news WHERE news.file_id = %d)",
                       cNEWS_FOLDER_ID, $fileId, $fileId, $fileId));
    }
  }
}

// Club members that have renounced their results should not be shown,
// the same rule as for the points in result/jsonResultQuery.php (iType POINTS)
function cupNotExcludedCompetitor($competitorColumn, $raceDateColumn)
{
  return "NOT EXISTS (SELECT 1 FROM RACE_COMPETITORS XC WHERE XC.COMPETITOR_ID = " . $competitorColumn .
         " AND NOT (UPPER(XC.EXCLUDE_RESULTS) = 'NO' AND (XC.EXCLUDE_TIME IS NULL OR " .
         "DATE_FORMAT(XC.EXCLUDE_TIME, '%Y-%m-%d') <= DATE_FORMAT(" . $raceDateColumn . ", '%Y-%m-%d'))))";
}

function cupRow2Result($row)
{
  $x = new stdClass();
  $x->cupResultId       = intval($row['CUP_RESULT_ID']);
  $x->cupRaceId         = intval($row['CUP_RACE_ID']);
  $x->competitorId      = cupIntOrNull($row['COMPETITOR_ID']);
  $x->eventorPersonId   = cupIntOrNull($row['EVENTOR_PERSON_ID']);
  $x->personName        = $row['PERSON_NAME'];
  $x->birthYear         = isset($row['BIRTH_YEAR']) ? cupIntOrNull($row['BIRTH_YEAR']) : NULL;
  $x->clubName          = $row['CLUB_NAME'];
  $x->isClubMember      = boolval($row['IS_CLUB_MEMBER']);
  $x->className         = $row['CLASS_NAME'];
  $x->status            = $row['STATUS'];
  $x->position          = cupIntOrNull($row['POSITION']);
  $x->timeSeconds       = cupIntOrNull($row['TIME_SECONDS']);
  $x->timeBehindSeconds = cupIntOrNull($row['TIME_BEHIND_SECONDS']);
  $x->nofStartsInClass  = cupIntOrNull($row['NOF_STARTS_IN_CLASS']);
  $x->source            = $row['SOURCE'];
  return $x;
}

//# The results for a race taken from the results the club   #
//# has imported (RACE_EVENT*). Only club members are there. #
//# The race is either given by the linked EVENT_ID, or found  #
//# by the Eventor id.                                         #
function getCupDbRaceResults($cupRaceId, $eventId, $eventorId, $eventorRaceId, $useTotalResult)
{
  $rows = array();
  if (!is_null($eventId))
  {
    $whereEvent = "E.EVENT_ID = " . intval($eventId);
  }
  elseif (!is_null($eventorId))
  {
    $whereEvent = "E.EVENTOR_ID = " . intval($eventorId) .
      (is_null($eventorRaceId) ? "" : sprintf(" AND (E.EVENTOR_RACE_ID = %d OR E.EVENTOR_RACE_ID IS NULL)", $eventorRaceId));
  }
  else
  {
    return $rows;
  }

  $failedReason = $useTotalResult ? "COALESCE(MD.TOTAL_FAILED_REASON, R.FAILED_REASON)" : "R.FAILED_REASON";
  $time         = $useTotalResult ? "COALESCE(MD.TOTAL_TIME, R.COMPETITOR_TIME)" : "R.COMPETITOR_TIME";
  $winnerTime   = $useTotalResult ? "COALESCE(MD.TOTAL_WINNER_TIME, R.WINNER_TIME)" : "R.WINNER_TIME";
  $position     = $useTotalResult ? "COALESCE(MD.TOTAL_POSITION, R.POSITION)" : "R.POSITION";
  $nofStarts    = $useTotalResult ? "COALESCE(MD.TOTAL_NOF_STARTS_IN_CLASS, R.NOF_STARTS_IN_CLASS)" : "R.NOF_STARTS_IN_CLASS";

  $sql = "SELECT R.RESULT_ID, R.COMPETITOR_ID, C.FIRST_NAME, C.LAST_NAME, YEAR(C.BIRTHDAY) AS BIRTH_YEAR, R.CLASS_NAME, " .
         "  (SELECT MIN(CE.EVENTOR_COMPETITOR_ID) FROM RACE_COMPETITORS_EVENTOR CE WHERE CE.COMPETITOR_ID = R.COMPETITOR_ID) AS EVENTOR_PERSON_ID, " .
         "  (SELECT MIN(CL.CLUB_NAME) FROM RACE_COMPETITORS_CLUB CC INNER JOIN RACE_CLUBS CL ON (CC.CLUB_ID = CL.CLUB_ID) " .
         "   WHERE CC.COMPETITOR_ID = R.COMPETITOR_ID AND CC.START_DATE <= E.RACEDATE AND (CC.END_DATE IS NULL OR CC.END_DATE >= E.RACEDATE)) AS CLUB_NAME, " .
         "  " . $failedReason . " AS FAILED_REASON, " .
         "  TIME_TO_SEC(" . $time . ") AS TIME_SECONDS, " .
         "  TIME_TO_SEC(" . $time . ") - TIME_TO_SEC(" . $winnerTime . ") AS TIME_BEHIND_SECONDS, " .
         "  " . $position . " AS POSITION, " .
         "  " . $nofStarts . " AS NOF_STARTS_IN_CLASS " .
         "FROM RACE_EVENT E " .
         "INNER JOIN RACE_EVENT_RESULTS R ON (E.EVENT_ID = R.EVENT_ID) " .
         "INNER JOIN RACE_COMPETITORS C ON (R.COMPETITOR_ID = C.COMPETITOR_ID) " .
         "LEFT OUTER JOIN RACE_EVENT_RESULTS_MULTI_DAY MD ON (R.RESULT_ID = MD.RESULT_ID) " .
         "WHERE " . $whereEvent . " AND " . cupNotExcludedCompetitor("R.COMPETITOR_ID", "E.RACEDATE") .
         " ORDER BY R.CLASS_NAME, " . $position . " IS NULL, " . $position;
  $result = cupQuery($sql);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $failed = $row['FAILED_REASON'];
    if (is_null($failed) || $failed == '')
    {
      $status = 'OK';
    }
    elseif ($failed == 'EJ START')
    {
      $status = 'DNS';
    }
    elseif ($failed == 'UTGÅTT')
    {
      $status = 'DNF';
    }
    else // FULLFÖ, GODK: Finished but without time or position
    {
      $status = 'OK';
    }
    $hasTime = $status == 'OK' && (is_null($failed) || $failed == '');

    $x = new stdClass();
    $x->cupResultId       = -intval($row['RESULT_ID']);
    $x->cupRaceId         = $cupRaceId;
    $x->competitorId      = intval($row['COMPETITOR_ID']);
    $x->eventorPersonId   = cupIntOrNull($row['EVENTOR_PERSON_ID']);
    $x->personName        = $row['FIRST_NAME'] . " " . $row['LAST_NAME'];
    $x->birthYear         = cupIntOrNull($row['BIRTH_YEAR']);
    $x->clubName          = $row['CLUB_NAME'];
    $x->isClubMember      = true;
    $x->className         = $row['CLASS_NAME'];
    $x->status            = $status;
    $x->position          = $hasTime ? cupIntOrNull($row['POSITION']) : NULL;
    $x->timeSeconds       = $hasTime ? cupIntOrNull($row['TIME_SECONDS']) : NULL;
    $x->timeBehindSeconds = $hasTime ? cupIntOrNull($row['TIME_BEHIND_SECONDS']) : NULL;
    $x->nofStartsInClass  = cupIntOrNull($row['NOF_STARTS_IN_CLASS']);
    $x->source            = 'DB';
    array_push($rows, $x);
  }
  \db\mysql_free_result($result);
  return $rows;
}

//# All results for the races in a season. A race without     #
//# any saved cup results falls back to the results the club  #
//# already has imported in its own database.                 #
function getCupSeasonResults($seasonId)
{
  $rows = array();
  $races = array();

  $result = cupQuery(sprintf("SELECT * FROM CUP_RACE WHERE SEASON_ID = %d", $seasonId));
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $races[intval($row['CUP_RACE_ID'])] = $row;
  }
  \db\mysql_free_result($result);

  if (count($races) == 0)
  {
    return $rows;
  }

  $racesWithResults = array();
  $sql = "SELECT RR.* FROM CUP_RACE_RESULTS RR INNER JOIN CUP_RACE CR ON (RR.CUP_RACE_ID = CR.CUP_RACE_ID) " .
         "WHERE CR.SEASON_ID = " . intval($seasonId) .
         " AND (RR.COMPETITOR_ID IS NULL OR " . cupNotExcludedCompetitor("RR.COMPETITOR_ID", "CR.RACE_DATE") . ")" .
         " ORDER BY RR.CUP_RACE_ID, RR.CLASS_NAME, RR.POSITION IS NULL, RR.POSITION";
  $result = cupQuery($sql);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = cupRow2Result($row);
    $racesWithResults[$x->cupRaceId] = true;
    array_push($rows, $x);
  }
  \db\mysql_free_result($result);

  // Races where every saved result was hidden still count as races with results
  $result = cupQuery("SELECT DISTINCT CUP_RACE_ID FROM CUP_RACE_RESULTS WHERE CUP_RACE_ID IN (" . cupIdList(array_keys($races)) . ")");
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $racesWithResults[intval($row['CUP_RACE_ID'])] = true;
  }
  \db\mysql_free_result($result);

  foreach ($races as $cupRaceId => $race)
  {
    if (!isset($racesWithResults[$cupRaceId]) && (!is_null($race['EVENT_ID']) || !is_null($race['EVENTOR_ID'])))
    {
      $rows = array_merge($rows, getCupDbRaceResults(
        $cupRaceId,
        cupIntOrNull($race['EVENT_ID']),
        cupIntOrNull($race['EVENTOR_ID']),
        cupIntOrNull($race['EVENTOR_RACE_ID']),
        boolval($race['USE_TOTAL_RESULT'])
      ));
    }
  }

  return $rows;
}

//# The settings (point system, categories, ...) of the season  #
//# a cup race belongs to.                                      #
function cupSeasonSettingsForRace($cupRaceId)
{
  $settings = NULL;
  $result = cupQuery(sprintf("SELECT S.SETTINGS, S.START_DATE FROM CUP_SEASON S INNER JOIN CUP_RACE CR ON (CR.SEASON_ID = S.SEASON_ID) " .
                             "WHERE CR.CUP_RACE_ID = %d", $cupRaceId));
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $settings = json_decode($row['SETTINGS']);
    if (is_object($settings))
    {
      // The ages of the categories are counted from the year the season starts
      $settings->seasonYear = intval(substr($row['START_DATE'], 0, 4));
    }
  }
  \db\mysql_free_result($result);
  return $settings;
}

//# Does the class match the class patterns of one category.   #
//# Patterns like H1* match any characters, case insensitive.   #
//# The same rules as classMatchesCategory in cupHelper.ts.     #
function cupClassMatchesCategory($className, $category)
{
  $className = trim(strval($className));
  $patterns = array();
  if (isset($category->classes) && is_array($category->classes))
  {
    foreach ($category->classes as $pattern)
    {
      if (is_string($pattern) && trim($pattern) != '')
      {
        array_push($patterns, trim($pattern));
      }
    }
  }
  if (count($patterns) == 0)
  {
    return true;
  }
  foreach ($patterns as $pattern)
  {
    $parts = array_map(function ($part) { return preg_quote($part, '/'); }, explode('*', $pattern));
    if (preg_match('/^' . implode('.*', $parts) . '$/iu', $className))
    {
      return true;
    }
  }
  return false;
}

//# Is the age within the age limits of one category, counted   #
//# as in the orienteering classes: the year the season starts  #
//# minus the year of birth. An unknown year of birth is kept   #
//# when fetching, it can be filled in, the standings leave it  #
//# out. The same rules as cupAgeMatchesCategory in cupHelper.ts #
function cupAgeMatchesCategory($birthYear, $settings, $category)
{
  $minAge = isset($category->minAge) && is_numeric($category->minAge) ? intval($category->minAge) : NULL;
  $maxAge = isset($category->maxAge) && is_numeric($category->maxAge) ? intval($category->maxAge) : NULL;
  if (is_null($minAge) && is_null($maxAge))
  {
    return true;
  }
  if (is_null($birthYear) || intval($birthYear) <= 1900 || !isset($settings->seasonYear))
  {
    return true;
  }
  $age = $settings->seasonYear - intval($birthYear);
  return (is_null($minAge) || $age >= $minAge) && (is_null($maxAge) || $age <= $maxAge);
}

//# The same class, regardless of case and extra spaces, as    #
//# cupClassKey in cupHelper.ts                                 #
function cupClassKey($className)
{
  return mb_strtolower(preg_replace('/\s+/u', ' ', trim(strval($className))), 'UTF-8');
}

function cupHasCategories($settings)
{
  return !is_null($settings) && isset($settings->categories) && is_array($settings->categories) && count($settings->categories) > 0;
}

//# Is the class in any of the categories of the season         #
function cupClassInCategories($className, $settings)
{
  if (!cupHasCategories($settings))
  {
    return true;
  }
  foreach ($settings->categories as $category)
  {
    if (cupClassMatchesCategory($className, $category))
    {
      return true;
    }
  }
  return false;
}

//# Is a result in any of the categories, both class and age    #
function cupResultInCategories($className, $birthYear, $settings)
{
  if (!cupHasCategories($settings))
  {
    return true;
  }
  foreach ($settings->categories as $category)
  {
    if (cupClassMatchesCategory($className, $category) && cupAgeMatchesCategory($birthYear, $settings, $category))
    {
      return true;
    }
  }
  return false;
}

function cupSeasonHasAllParticipants($settings)
{
  return !is_null($settings) && isset($settings->participants) && $settings->participants == 'ALL';
}

function insertCupRaceResult($cupRaceId, $r)
{
  global $cCUP_RESULT_STATUS, $cCUP_RESULT_SOURCES;

  $personName = isset($r->personName) && is_string($r->personName) ? trim($r->personName) : '';
  $className = isset($r->className) && is_string($r->className) ? trim($r->className) : '';
  if ($personName == '' || $className == '')
  {
    cupError('Namn och klass måste anges på alla resultat.');
  }
  $status = isset($r->status) && in_array($r->status, $cCUP_RESULT_STATUS) ? $r->status : 'OK';
  $source = isset($r->source) && in_array($r->source, $cCUP_RESULT_SOURCES) ? $r->source : 'MANUAL';
  $competitorId = isset($r->competitorId) ? $r->competitorId : NULL;
  $eventorPersonId = isset($r->eventorPersonId) ? $r->eventorPersonId : NULL;

  // Connect to our own competitor, if the Eventor person is known
  if (is_null($competitorId) && !is_null($eventorPersonId))
  {
    $result = cupQuery(sprintf("SELECT COMPETITOR_ID FROM RACE_COMPETITORS_EVENTOR WHERE EVENTOR_COMPETITOR_ID = %d", $eventorPersonId));
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $competitorId = intval($row['COMPETITOR_ID']);
    }
    \db\mysql_free_result($result);
  }

  $birthYear = isset($r->birthYear) && is_numeric($r->birthYear) && intval($r->birthYear) > 1900 ? intval($r->birthYear) : NULL;

  // The year of birth is left out until sportclub_patch_2.5.sql is run, so that saving results
  // (also the result import of the club, which saves to the cups) keeps working before that
  $withBirthYear = cupHasBirthYearColumn();

  cupQuery(sprintf("INSERT INTO CUP_RACE_RESULTS (CUP_RACE_ID, COMPETITOR_ID, EVENTOR_PERSON_ID, PERSON_NAME, %sCLUB_NAME, " .
                   "IS_CLUB_MEMBER, CLASS_NAME, STATUS, POSITION, TIME_SECONDS, TIME_BEHIND_SECONDS, NOF_STARTS_IN_CLASS, SOURCE) " .
                   "VALUES (%d, %s, %s, %s, %s%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                   $withBirthYear ? "BIRTH_YEAR, " : "",
                   $cupRaceId, cupSqlInt($competitorId), cupSqlInt($eventorPersonId), cupSqlString(substr($personName, 0, 256)),
                   $withBirthYear ? cupSqlInt($birthYear) . ", " : "",
                   cupSqlString(isset($r->clubName) && is_string($r->clubName) && trim($r->clubName) != '' ? substr(trim($r->clubName), 0, 128) : NULL),
                   cupSqlBool(isset($r->isClubMember) && $r->isClubMember), cupSqlString(substr($className, 0, 64)),
                   cupSqlString($status), cupSqlInt(isset($r->position) ? $r->position : NULL),
                   cupSqlInt(isset($r->timeSeconds) ? $r->timeSeconds : NULL),
                   cupSqlInt(isset($r->timeBehindSeconds) ? $r->timeBehindSeconds : NULL),
                   cupSqlInt(isset($r->nofStartsInClass) ? $r->nofStartsInClass : NULL), cupSqlString($source)));
}

//# Is sportclub_patch_2.5.sql (the year of birth) run         #
function cupHasBirthYearColumn()
{
  static $hasColumn = null;
  if (is_null($hasColumn))
  {
    $result = \db\mysql_query("SHOW COLUMNS FROM CUP_RACE_RESULTS LIKE 'BIRTH_YEAR'");
    $hasColumn = $result && \db\mysql_num_rows($result) > 0;
    if ($result)
    {
      \db\mysql_free_result($result);
    }
  }
  return $hasColumn;
}

//# Replaces the club members results of a cup race with the  #
//# results in the clubs own result database. Results of      #
//# others (imported from Eventor or added manually) are kept. #
function saveCupRaceResultsFromEvent($cupRaceId, $eventId, $useTotalResult)
{
  $rows = getCupDbRaceResults($cupRaceId, $eventId, NULL, NULL, $useTotalResult);
  $settings = cupSeasonSettingsForRace($cupRaceId);
  if (!cupSeasonHasAllParticipants($settings))
  {
    $rows = array_values(array_filter($rows, function ($r) use ($settings) {
      return cupResultInCategories($r->className, isset($r->birthYear) ? $r->birthYear : NULL, $settings);
    }));
  }
  $competitorIds = array_map(function ($r) { return $r->competitorId; }, $rows);

  cupQuery(sprintf("DELETE FROM CUP_RACE_RESULTS WHERE CUP_RACE_ID = %d AND (SOURCE = 'DB' OR COMPETITOR_ID IN (%s))",
                   $cupRaceId, cupIdList($competitorIds)));
  // Eventor results of club members, not yet connected to our own competitor
  cupQuery(sprintf("DELETE RR FROM CUP_RACE_RESULTS RR INNER JOIN RACE_COMPETITORS_EVENTOR CE ON (RR.EVENTOR_PERSON_ID = CE.EVENTOR_COMPETITOR_ID) " .
                   "WHERE RR.CUP_RACE_ID = %d AND CE.COMPETITOR_ID IN (%s)", $cupRaceId, cupIdList($competitorIds)));

  foreach ($rows as $r)
  {
    insertCupRaceResult($cupRaceId, $r);
  }
}

//# When a cup race is added or changed and the club already   #
//# has imported the results of the Eventor race, the cup race #
//# is linked to it and the results are saved directly.        #
//# Returns the linked EVENT_ID or NULL.                       #
function linkCupRaceToSavedEvent($cupRaceId)
{
  $race = null;
  $result = cupQuery(sprintf("SELECT CR.EVENT_ID, CR.EVENTOR_ID, CR.EVENTOR_RACE_ID, CR.USE_TOTAL_RESULT, " .
                             "E.EVENTOR_ID AS LINKED_EVENTOR_ID, E.EVENTOR_RACE_ID AS LINKED_EVENTOR_RACE_ID " .
                             "FROM CUP_RACE CR LEFT OUTER JOIN RACE_EVENT E ON (CR.EVENT_ID = E.EVENT_ID) " .
                             "WHERE CR.CUP_RACE_ID = %d", $cupRaceId));
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $race = $row;
  }
  \db\mysql_free_result($result);
  if (is_null($race))
  {
    return NULL;
  }

  $eventorId = cupIntOrNull($race['EVENTOR_ID']);
  $eventorRaceId = cupIntOrNull($race['EVENTOR_RACE_ID']);
  $linkedEventId = cupIntOrNull($race['EVENT_ID']);
  $useTotalResult = boolval($race['USE_TOTAL_RESULT']);

  // A manual race without Eventor keeps a link made from the result import
  if (is_null($eventorId))
  {
    if (!is_null($linkedEventId))
    {
      saveCupRaceResultsFromEvent($cupRaceId, $linkedEventId, $useTotalResult);
    }
    return $linkedEventId;
  }

  $linkStillValid = !is_null($linkedEventId) && !is_null($race['LINKED_EVENTOR_ID']) &&
    intval($race['LINKED_EVENTOR_ID']) == $eventorId &&
    (is_null($eventorRaceId) || is_null($race['LINKED_EVENTOR_RACE_ID']) || intval($race['LINKED_EVENTOR_RACE_ID']) == $eventorRaceId);

  $eventId = $linkStillValid ? $linkedEventId : NULL;
  if (is_null($eventId))
  {
    $result = cupQuery(sprintf("SELECT EVENT_ID FROM RACE_EVENT WHERE EVENTOR_ID = %d%s ORDER BY EVENT_ID DESC LIMIT 1",
                               $eventorId,
                               is_null($eventorRaceId) ? "" : sprintf(" AND (EVENTOR_RACE_ID = %d OR EVENTOR_RACE_ID IS NULL)", $eventorRaceId)));
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $eventId = intval($row['EVENT_ID']);
    }
    \db\mysql_free_result($result);
  }

  if (is_null($eventId))
  {
    if (!is_null($linkedEventId))
    {
      // Linked to a race that is no longer the Eventor race of the cup race
      cupQuery(sprintf("UPDATE CUP_RACE SET EVENT_ID = NULL WHERE CUP_RACE_ID = %d", $cupRaceId));
      cupQuery(sprintf("DELETE FROM CUP_RACE_RESULTS WHERE CUP_RACE_ID = %d AND SOURCE = 'DB'", $cupRaceId));
    }
    return NULL;
  }

  if ($eventId !== $linkedEventId)
  {
    cupQuery(sprintf("UPDATE CUP_RACE SET EVENT_ID = %d WHERE CUP_RACE_ID = %d", $eventId, $cupRaceId));
  }
  saveCupRaceResultsFromEvent($cupRaceId, $eventId, $useTotalResult);
  return $eventId;
}

//# Saves the result list from Eventor for a cup race. Earlier  #
//# Eventor results are replaced, results from the club         #
//# database and manual results are kept. Club members are      #
//# skipped when the race has results from the club database.   #
function saveCupEventorResults($cupRaceId, $results)
{
  $result = cupQuery(sprintf("SELECT COUNT(*) AS NOF FROM CUP_RACE_RESULTS WHERE CUP_RACE_ID = %d AND SOURCE = 'DB'", $cupRaceId));
  $row = \db\mysql_fetch_assoc($result);
  $hasClubResults = intval($row['NOF']) > 0;
  \db\mysql_free_result($result);

  cupQuery(sprintf("DELETE FROM CUP_RACE_RESULTS WHERE CUP_RACE_ID = %d AND SOURCE = 'EVENTOR'", $cupRaceId));

  //# The result import of the club stores short class names  #
  //# (e.g. H21K for H21 Kort). Give the results from the club #
  //# the Eventor class names, so the club members and the     #
  //# participants from other clubs end up in the same class.  #
  //# Matched on the club members that are in both lists.      #
  $nofRenamedClasses = 0;
  if ($hasClubResults)
  {
    $classMap = array();
    foreach ($results as $r)
    {
      $isClubMember = isset($r->isClubMember) && $r->isClubMember;
      if (!$isClubMember || !isset($r->eventorPersonId) || is_null($r->eventorPersonId) ||
          !isset($r->className) || !is_string($r->className) || trim($r->className) == '')
      {
        continue;
      }
      $result = cupQuery(sprintf("SELECT DISTINCT RR.CLASS_NAME FROM CUP_RACE_RESULTS RR " .
                                 "WHERE RR.CUP_RACE_ID = %d AND RR.SOURCE = 'DB' AND (RR.EVENTOR_PERSON_ID = %d OR RR.COMPETITOR_ID IN " .
                                 "(SELECT CE.COMPETITOR_ID FROM RACE_COMPETITORS_EVENTOR CE WHERE CE.EVENTOR_COMPETITOR_ID = %d))",
                                 $cupRaceId, $r->eventorPersonId, $r->eventorPersonId));
      while ($row = \db\mysql_fetch_assoc($result))
      {
        $classMap[$row['CLASS_NAME']] = substr(trim($r->className), 0, 64);
      }
      \db\mysql_free_result($result);
    }
    foreach ($classMap as $clubClassName => $eventorClassName)
    {
      // BINARY, the column compares without case otherwise and "h21k" would not be renamed to "H21K"
      if ($clubClassName !== $eventorClassName)
      {
        cupQuery(sprintf("UPDATE CUP_RACE_RESULTS SET CLASS_NAME = %s WHERE CUP_RACE_ID = %d AND SOURCE = 'DB' AND BINARY CLASS_NAME = %s",
                         cupSqlString($eventorClassName), $cupRaceId, cupSqlString($clubClassName)));
        $nofRenamedClasses++;
      }
    }
  }

  //# Only the classes in the categories of the season. Done   #
  //# after the renaming, the short names would not match.     #
  $settings = cupSeasonSettingsForRace($cupRaceId);
  $result = cupQuery(sprintf("SELECT * FROM CUP_RACE_RESULTS WHERE CUP_RACE_ID = %d AND SOURCE = 'DB'", $cupRaceId));
  $removeResultIds = array();
  while ($row = \db\mysql_fetch_assoc($result))
  {
    if (!cupResultInCategories($row['CLASS_NAME'], isset($row['BIRTH_YEAR']) ? $row['BIRTH_YEAR'] : NULL, $settings))
    {
      array_push($removeResultIds, intval($row['CUP_RESULT_ID']));
    }
  }
  \db\mysql_free_result($result);
  if (count($removeResultIds) > 0)
  {
    cupQuery(sprintf("DELETE FROM CUP_RACE_RESULTS WHERE CUP_RESULT_ID IN (%s)", cupIdList($removeResultIds)));
  }

  //# The adjustments made in the result import of the club, #
  //# per class: the number of starters and the winner time.  #
  //# The participants of other clubs get the same, the same  #
  //# rules as mergeCupEventorResults in cupHelper.ts.         #
  $classAdjustments = array();
  $result = cupQuery(sprintf("SELECT CLASS_NAME, STATUS, NOF_STARTS_IN_CLASS, TIME_SECONDS, TIME_BEHIND_SECONDS " .
                             "FROM CUP_RACE_RESULTS WHERE CUP_RACE_ID = %d AND SOURCE = 'DB'", $cupRaceId));
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $key = cupClassKey($row['CLASS_NAME']);
    if (!isset($classAdjustments[$key]))
    {
      $classAdjustments[$key] = array('nofStarts' => NULL, 'winnerTime' => NULL);
    }
    if (!is_null($row['NOF_STARTS_IN_CLASS']) && intval($row['NOF_STARTS_IN_CLASS']) > 0)
    {
      $classAdjustments[$key]['nofStarts'] = max(intval($classAdjustments[$key]['nofStarts']), intval($row['NOF_STARTS_IN_CLASS']));
    }
    if ($row['STATUS'] == 'OK' && !is_null($row['TIME_SECONDS']) && !is_null($row['TIME_BEHIND_SECONDS']))
    {
      $winnerTime = intval($row['TIME_SECONDS']) - intval($row['TIME_BEHIND_SECONDS']);
      $classAdjustments[$key]['winnerTime'] = is_null($classAdjustments[$key]['winnerTime'])
        ? $winnerTime
        : min($classAdjustments[$key]['winnerTime'], $winnerTime);
    }
  }
  \db\mysql_free_result($result);

  $nofSaved = 0;
  $nofClubMembersSkipped = 0;
  $nofOtherClasses = 0;
  foreach ($results as $r)
  {
    if (!isset($r->className) || !is_string($r->className) ||
        !cupResultInCategories($r->className, isset($r->birthYear) ? $r->birthYear : NULL, $settings))
    {
      $nofOtherClasses++;
      continue;
    }
    $isClubMember = isset($r->isClubMember) && $r->isClubMember;
    if ($isClubMember && $hasClubResults)
    {
      $nofClubMembersSkipped++;
      continue;
    }
    $key = cupClassKey($r->className);
    if (!$isClubMember && isset($classAdjustments[$key]))
    {
      if (!is_null($classAdjustments[$key]['nofStarts']))
      {
        $r->nofStartsInClass = $classAdjustments[$key]['nofStarts'];
      }
      if (!is_null($classAdjustments[$key]['winnerTime']) && isset($r->status) && $r->status == 'OK' &&
          isset($r->timeSeconds) && !is_null($r->timeSeconds))
      {
        $r->timeBehindSeconds = max(0, intval($r->timeSeconds) - $classAdjustments[$key]['winnerTime']);
      }
    }
    $r->source = 'EVENTOR';
    insertCupRaceResult($cupRaceId, $r);
    $nofSaved++;
  }

  $x = new stdClass();
  $x->cupRaceId = $cupRaceId;
  $x->nofSaved = $nofSaved;
  $x->nofClubMembersSkipped = $nofClubMembersSkipped;
  $x->nofRenamedClasses = $nofRenamedClasses;
  $x->nofOtherClasses = $nofOtherClasses;
  return $x;
}

function cupTablesExist()
{
  $result = \db\mysql_query("SHOW TABLES LIKE 'CUP_RACE'");
  if (!$result)
  {
    return false;
  }
  $exists = \db\mysql_num_rows($result) > 0;
  \db\mysql_free_result($result);
  return $exists;
}

//# Called by result/save.php when a race is saved. The race   #
//# gets a new EVENT_ID every time it is saved, so the links   #
//# are moved from the old id to the new.                      #
//# $cupRaceIds = NULL keeps the links as they were, an array  #
//# replaces them. All linked cup races get the club members   #
//# results saved automatically.                               #
function syncCupRacesForEvent($oldEventId, $newEventId, $cupRaceIds)
{
  if (!cupTablesExist())
  {
    return;
  }

  $oldLinked = array();
  $result = cupQuery(sprintf("SELECT CUP_RACE_ID FROM CUP_RACE WHERE EVENT_ID IN (%d, %d)", $oldEventId, $newEventId));
  while ($row = \db\mysql_fetch_assoc($result))
  {
    array_push($oldLinked, intval($row['CUP_RACE_ID']));
  }
  \db\mysql_free_result($result);

  $linked = is_null($cupRaceIds) ? $oldLinked : array_values(array_unique(array_map('intval', $cupRaceIds)));

  cupQuery(sprintf("UPDATE CUP_RACE SET EVENT_ID = NULL WHERE EVENT_ID IN (%d, %d)", $oldEventId, $newEventId));
  if (count($linked) > 0)
  {
    cupQuery(sprintf("UPDATE CUP_RACE SET EVENT_ID = %d WHERE CUP_RACE_ID IN (%s)", $newEventId, cupIdList($linked)));
  }

  // No longer linked, remove the results that came from the race
  foreach (array_diff($oldLinked, $linked) as $cupRaceId)
  {
    cupQuery(sprintf("DELETE FROM CUP_RACE_RESULTS WHERE CUP_RACE_ID = %d AND SOURCE = 'DB'", $cupRaceId));
  }

  $races = array();
  $result = cupQuery(sprintf("SELECT CUP_RACE_ID, USE_TOTAL_RESULT FROM CUP_RACE WHERE EVENT_ID = %d", $newEventId));
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $races[intval($row['CUP_RACE_ID'])] = boolval($row['USE_TOTAL_RESULT']);
  }
  \db\mysql_free_result($result);

  foreach ($races as $cupRaceId => $useTotalResult)
  {
    saveCupRaceResultsFromEvent($cupRaceId, $newEventId, $useTotalResult);
  }
}

//# The cup races that a race of the club can be linked to:    #
//# every race in a season that covers the race date, and the  #
//# races already linked.                                      #
function getCupRacesForEvent($eventId, $eventorId, $eventorRaceId, $raceDate)
{
  $rows = array();
  $sql = sprintf("SELECT CR.*, S.NAME AS SEASON_NAME, S.SETTINGS, S.START_DATE AS SEASON_START_DATE, C.NAME AS CUP_NAME FROM CUP_RACE CR " .
                 "INNER JOIN CUP_SEASON S ON (CR.SEASON_ID = S.SEASON_ID) " .
                 "INNER JOIN CUP C ON (S.CUP_ID = C.CUP_ID) " .
                 "WHERE (S.START_DATE <= '%s' AND S.END_DATE >= '%s') OR (%d > 0 AND CR.EVENT_ID = %d) " .
                 "ORDER BY C.NAME, CR.RACE_DATE",
                 $raceDate, $raceDate, $eventId, $eventId);
  $result = cupQuery($sql);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = new stdClass();
    $x->cupRaceId  = intval($row['CUP_RACE_ID']);
    $x->cupName    = $row['CUP_NAME'];
    $x->seasonName = $row['SEASON_NAME'];
    $x->name       = $row['NAME'];
    $x->raceDate   = date2String(strtotime($row['RACE_DATE']));
    $x->linked     = $eventId > 0 && !is_null($row['EVENT_ID']) && intval($row['EVENT_ID']) == $eventId;
    $x->suggested  = (!is_null($eventorId) && !is_null($row['EVENTOR_ID']) && intval($row['EVENTOR_ID']) == intval($eventorId) &&
                      (is_null($eventorRaceId) || is_null($row['EVENTOR_RACE_ID']) || intval($row['EVENTOR_RACE_ID']) == intval($eventorRaceId))) ||
                     (is_null($row['EVENTOR_ID']) && $x->raceDate == $raceDate);
    $x->linkedToOtherEvent = !is_null($row['EVENT_ID']) && !$x->linked;
    $settings = json_decode($row['SETTINGS']);
    $x->participants   = (isset($settings->participants) && $settings->participants == 'ALL') ? 'ALL' : 'CLUB';
    $x->useTotalResult = boolval($row['USE_TOTAL_RESULT']);
    $x->categories     = (isset($settings->categories) && is_array($settings->categories)) ? $settings->categories : array();
    $x->seasonYear     = intval(substr($row['SEASON_START_DATE'], 0, 4));
    array_push($rows, $x);
  }
  \db\mysql_free_result($result);
  return $rows;
}

function cupOutputJson($value)
{
  header("Access-Control-Allow-Credentials: true");
  if (isset($_SERVER['HTTP_ORIGIN']))
  {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
  }
  header("Access-Control-Allow-Headers: *");
  header("Content-Type: application/json");
  echo json_encode($value);
}

?>

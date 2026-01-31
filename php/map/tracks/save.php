<?php
//############################################################
//# File:    save.php                                        #
//# Created: 2026-01-18                                      #
//# Author:  PatSjo                                          #
//# -------------------------------------------------------- #
//# Save map tracks (IMapTracksFormProps JSON) into MAP_TRACKS#
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");

cors();
ValidLogin();

header("Cache-Control: no-cache, must-revalidate");
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");

$json = file_get_contents('php://input');
$input = json_decode($json);

if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  trigger_error('User needs to be a administrator, to update map tracks.');
}

if (!isset($input->tracks) || !is_array($input->tracks)) {
  trigger_error('Felaktig parameter "tracks"', E_USER_ERROR);
}

if (!isset($input->removedTrackIds) || !is_array($input->removedTrackIds)) {
  trigger_error('Felaktig parameter "removedTrackIds"', E_USER_ERROR);
}

OpenDatabase();
$now = date("Y-m-d G:i:s");

foreach ($input->tracks as $i => $t) {
  if (!isset($t->trackId) || trim($t->trackId) === '') {
    trigger_error('Felaktig parameter "trackId" för track index ' . $i, E_USER_ERROR);
  }
  $trackId = \db\mysql_real_escape_string($t->trackId);
  $trackName = isset($t->name) ? \db\mysql_real_escape_string($t->name) : '';
  $trackCenter = isset($t->trackCenter) ? \db\mysql_real_escape_string($t->trackCenter) : '';
  $description = isset($t->description) ? \db\mysql_real_escape_string($t->description) : '';
  $showByDefault = isset($t->showByDefault) && $t->showByDefault ? 1 : 0;
  $symbolSvg = isset($t->symbolSvg) ? \db\mysql_real_escape_string($t->symbolSvg) : NULL;
  $orderBy = isset($t->orderBy) ? intval($t->orderBy) : intval($i);

  // Build WKT LINESTRING from $t->line which follows ILineStringGeometry
  $lineWkt = '';
  if (isset($t->line) && isset($t->line->path) && is_array($t->line->path) && count($t->line->path) > 0) {
    $pairs = array();
    foreach ($t->line->path as $pt) {
      if (isset($pt->longitude) && isset($pt->latitude)) {
        $pairs[] = floatval($pt->longitude) . ' ' . floatval($pt->latitude);
      }
    }
    if (count($pairs) > 0) {
      $lineWkt = 'LINESTRING(' . implode(',', $pairs) . ')';
    }
  }

  if ($lineWkt === '') {
    // Ensure LINE is not null; insert an empty linestring with a single point at 0 0
    $lineWkt = 'LINESTRING(0 0)';
  }

  // Use INSERT ... ON DUPLICATE KEY UPDATE
  $sql = sprintf(
    "INSERT INTO MAP_TRACKS (TRACK_ID, TRACK_NAME, TRACK_CENTER, DESCRIPTION, LINE, SHOW_BY_DEFAULT, SYMBOL_SVG, ORDER_BY) VALUES ('%s', '%s', '%s', '%s', ST_GeomFromText('%s'), %d, %s, %d) ON DUPLICATE KEY UPDATE TRACK_NAME = '%s', TRACK_CENTER = '%s', DESCRIPTION = '%s', LINE = ST_GeomFromText('%s'), SHOW_BY_DEFAULT = %d, SYMBOL_SVG = %s, ORDER_BY = %d",
    $trackId,
    \db\mysql_real_escape_string($trackName),
    \db\mysql_real_escape_string($trackCenter),
    \db\mysql_real_escape_string($description),
    \db\mysql_real_escape_string($lineWkt),
    $showByDefault,
    is_null($symbolSvg) ? 'NULL' : "'" . $symbolSvg . "'",
    $orderBy,

    // update values
    \db\mysql_real_escape_string($trackName),
    \db\mysql_real_escape_string($trackCenter),
    \db\mysql_real_escape_string($description),
    \db\mysql_real_escape_string($lineWkt),
    $showByDefault,
    is_null($symbolSvg) ? 'NULL' : "'" . $symbolSvg . "'",
    $orderBy
  );

  \db\mysql_query($sql) || trigger_error(sprintf('SQL-Error (%s)', substr($sql, 0, 1024)), E_USER_ERROR);
}

if (isset($input->removedTrackIds) && is_array($input->removedTrackIds) && count($input->removedTrackIds) > 0) {
  $escaped = array();
  foreach ($input->removedTrackIds as $id) {
    $escaped[] = "'" . \db\mysql_real_escape_string($id) . "'";
  }
  $inList = implode(',', $escaped);
  $sqlDel = "DELETE FROM MAP_TRACKS WHERE TRACK_ID IN (" . $inList . ")";
  \db\mysql_query($sqlDel) || trigger_error(sprintf('SQL-Error (%s)', substr($sqlDel, 0, 1024)), E_USER_ERROR);
}

CloseDatabase();

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");

// Reuse the query endpoint logic by including it would be nice but keep simple: return input back
echo json_encode($input);

?>

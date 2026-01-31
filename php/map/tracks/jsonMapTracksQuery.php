<?php
//############################################################
//# File:    jsonMapTracksQuery.php                          #
//# Created: 2026-01-18                                      #
//# Author:  PatSjo                                          #
//# -------------------------------------------------------- #
//# Returns all map tracks from MAP_TRACKS table             #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();

$json = file_get_contents('php://input');
$input = json_decode($json);

OpenDatabase();

$sql = "SELECT TRACK_ID, TRACK_NAME, TRACK_CENTER, DESCRIPTION, ST_AsText(LINE) AS line_wkt, SHOW_BY_DEFAULT, SYMBOL_SVG, ORDER_BY FROM MAP_TRACKS ORDER BY ORDER_BY ASC";
$result = \db\mysql_query($sql);
if (!$result)
{
  trigger_error('SQL Error: ' . \db\mysql_error() . ' SQL: ' . $sql, E_USER_ERROR);
}

$rows = array();
if (\db\mysql_num_rows($result) > 0) {
    while($row = \db\mysql_fetch_assoc($result)) {
      $x = new stdClass();
      $x->trackId = $row['TRACK_ID'];
      $x->name = $row['TRACK_NAME'];
      $x->trackCenter = $row['TRACK_CENTER'];
      $x->description = $row['DESCRIPTION'];
      $x->showByDefault = boolval($row['SHOW_BY_DEFAULT']);
      $x->symbolSvg = is_null($row['SYMBOL_SVG']) ? null : $row['SYMBOL_SVG'];
      $x->orderBy = intval($row['ORDER_BY']);

      // Parse WKT LINESTRING to ILineStringGeometry
      $lineWkt = $row['line_wkt'];
      $lineObj = new stdClass();
      $lineObj->type = 'line';
      $lineObj->path = array();
      if ($lineWkt && stripos($lineWkt, 'LINESTRING') !== false) {
        // LINESTRING(lon lat,lon lat,...)
        $start = strpos($lineWkt, '(');
        $end = strrpos($lineWkt, ')');
        if ($start !== false && $end !== false && $end > $start) {
          $coords = substr($lineWkt, $start + 1, $end - $start - 1);
          $pairs = explode(',', $coords);
          foreach ($pairs as $pair) {
            $pair = trim($pair);
            if ($pair === '') continue;
            $parts = preg_split('/\s+/', $pair);
            if (count($parts) >= 2) {
              $lon = floatval($parts[0]);
              $lat = floatval($parts[1]);
              $pt = new stdClass();
              $pt->longitude = $lon;
              $pt->latitude = $lat;
              array_push($lineObj->path, $pt);
            }
          }
        }
      }
      $x->line = $lineObj;

      array_push($rows, $x);
    }
}

\db\mysql_free_result($result);
CloseDatabase();

header("Content-Type: application/json");
ini_set( 'precision', 20 );
ini_set( 'serialize_precision', 14 );
echo json_encode($rows);

?>

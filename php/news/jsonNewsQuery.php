<?php
//############################################################
//# File:    jsonNewsQuery.php                               #
//# Created: 2018-12-27                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iNewsTypeID (Default 0 = ID 1 + ID 2)        #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2018-12-27  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

if(!isset($input->offset))
{
  $input->offset = 0;
}
if(!isset($input->limit))
{
  $input->limit = 10000;
}
if(!isset($input->iNewsTypeID))
{
  $input->iNewsTypeID = 0;
}
if(!isset($input->iStartDate) || $input->iStartDate == "" || $input->iStartDate == "null")
{
  $input->iStartDate = null;
}
else
{
  $input->iStartDate = string2Date($input->iStartDate);
}
if(!isset($input->iEndDate) || $input->iEndDate == "" || $input->iEndDate == "null")
{
  $input->iEndDate = null;
}
else
{
  $input->iEndDate = string2Date($input->iEndDate);
}

$today = time();
$todayMinusTwoMonths = strtotime(date("Y-m-d", $today) . "- 2 months");

OpenDatabase();

if ($input->iNewsTypeID == 0)
{
  $whereNewsType = "(news_type_id = 1 OR news_type_id = 2)";
}
elseif (isset($input->iNewsTypeID) && $input->iNewsTypeID != "")
{
  $whereNewsType = "news_type_id = " . $input->iNewsTypeID;
}
else
{
  $whereNewsType = "1 = 1";
}

if (is_null($input->iStartDate))
{
  $whereStartDate = "";
}
else
{
  $whereStartDate = " AND DATE_FORMAT(mod_date, '%Y-%m-%d') >= '" . date2String($input->iStartDate) . "'";
}

if (is_null($input->iEndDate))
{
  $whereEndDate = "";
}
else
{
  $whereEndDate = " AND DATE_FORMAT(mod_date, '%Y-%m-%d') <= '" . date2String($input->iEndDate) . "'";
}

$whereExpireDate = "";
$orderByExpire = "";
if (is_null($input->iStartDate) && is_null($input->iEndDate))
{
  if ($input->offset == 0) {
    $whereExpireDate = " AND DATE_FORMAT(expire_date, '%Y-%m-%d') >= '" . date2String($today) . "'";
  }
}
$orderByExpire = "CASE WHEN (news_type_id = 2 AND DATE_FORMAT(expire_date, '%Y-%m-%d') >= '" . date2String($today) . "') THEN 0 ELSE 1 END ASC, " .
  " CASE WHEN (DATE_FORMAT(expire_date, '%Y-%m-%d') >= '" . date2String($today) . "') THEN 0 ELSE 1 END ASC, " .
  " CASE WHEN (news_type_id = 2 AND DATE_FORMAT(expire_date, '%Y-%m-%d') >= '" . date2String($todayMinusTwoMonths) . "') THEN 0 ELSE 1 END ASC, ";

$sql = "SELECT * FROM news LEFT OUTER JOIN users ON (news.mod_by_user_id = users.user_id) LEFT OUTER JOIN files ON (news.file_id = files.file_id) WHERE " . $whereNewsType . $whereStartDate . $whereEndDate . $whereExpireDate . " ORDER BY " . $orderByExpire . " mod_date DESC LIMIT " . $input->limit . " OFFSET " . $input->offset;
$result = \db\mysql_query($sql);
if (!$result)
{
  trigger_error('SQL Error: ' . \db\mysql_error() . ' SQL: ' . $sql, E_USER_ERROR);
}

$rows = array();
if (\db\mysql_num_rows($result) > 0) {
    while($row = \db\mysql_fetch_assoc($result)) {
      $x = new stdClass();
      $x->expireDate            = date2String(strtotime($row['expire_date']));
      $x->fileId                = is_null($row['file_id']) ? 0 : intval($row['file_id']);
      $x->fileName              = $row['file_name'];
      $x->fileType              = $row['mime_type'];
      $x->fileSize              = is_null($row['file_size']) ? 0 : intval($row['file_size']);
      $x->imageWidth            = is_null($row['image_width']) ? 0 : intval($row['image_width']);
      $x->imageHeight           = is_null($row['image_height']) ? 0 : intval($row['image_height']);
      $x->id                    = intval($row['id']);
      $x->introduction          = html_entity_decode($row['inledning']);
      $x->newsTypeId            = intval($row['news_type_id']);
      $x->text                  = html_entity_decode($row['texten']);
      $x->link                  = $row['lank'];
      $x->header                = $row['rubrik'];
      $x->modificationDate      = $row['mod_date'];
      $x->modifiedBy            = is_null($row['user_id']) ? '' : $row['first_name'] . " " . $row['last_name'];
      array_push($rows, $x);
    }
}

header("Access-Control-Allow-Credentials: true");
if (isset($_SERVER['HTTP_ORIGIN']))
{
  header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
}
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");
echo json_encode($rows);

\db\mysql_free_result($result);

?>
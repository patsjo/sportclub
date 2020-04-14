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

$offset = 0;
$limit = 10000;
$iNewsTypeID = 0;
$iStartDate = NULL;
$iEndDate = NULL;
if(isset($_REQUEST['offset']) && $_REQUEST['offset']!="")
{
  $offset = intval($_REQUEST['offset']);
}
if(isset($_REQUEST['limit']) && $_REQUEST['limit']!="")
{
  $limit = intval($_REQUEST['limit']);
}
if(isset($_REQUEST['iNewsTypeID']) && $_REQUEST['iNewsTypeID']!="")
{
  $iNewsTypeID = intval($_REQUEST['iNewsTypeID']);
}
if(isset($_REQUEST['iStartDate']) && $_REQUEST['iStartDate']!="")
{
  $iStartDate = string2Date($_REQUEST['iStartDate']);
}
if(isset($_REQUEST['iEndDate']) && $_REQUEST['iEndDate']!="")
{
  $iEndDate = string2Date($_REQUEST['iEndDate']);
}

$today = time();
$todayMinusTwoMonths = strtotime(date("Y-m-d", $today) . "- 2 months");

OpenDatabase();

if ($iNewsTypeID == 0)
{
  $whereNewsType = "(news_type_id = 1 OR news_type_id = 2)";
}
else
{
  $whereNewsType = "news_type_id = " . $iNewsTypeID;
}

if (is_null($iStartDate))
{
  $whereStartDate = "";
}
else
{
  $whereStartDate = " AND DATE_FORMAT(mod_date, '%Y-%m-%d') >= '" . date2String($iStartDate) . "'";
}

if (is_null($iEndDate))
{
  $whereEndDate = "";
}
else
{
  $whereEndDate = " AND DATE_FORMAT(mod_date, '%Y-%m-%d') <= '" . date2String($iEndDate) . "'";
}

if (is_null($iStartDate) && is_null($iEndDate))
{
  $whereExpireDate = " AND DATE_FORMAT(expire_date, '%Y-%m-%d') >= '" . date2String($today) . "'";
}
else
{
  $whereExpireDate = "";
}

$sql = "SELECT * FROM news LEFT OUTER JOIN users ON (news.mod_by_user_id = users.user_id) LEFT OUTER JOIN files ON (news.file_id = files.file_id) WHERE " . $whereNewsType . $whereStartDate . $whereEndDate . $whereExpireDate . " ORDER BY CASE WHEN (news_type_id = 2 AND DATE_FORMAT(expire_date, '%Y-%m-%d') >= '" . date2String($todayMinusTwoMonths) . "') THEN 0 ELSE 1 END ASC, mod_date DESC LIMIT " . $limit . " OFFSET " . $offset;
$result = \db\mysql_query($sql);
if (!$result)
{
  die('SQL Error: ' . \db\mysql_error());
}

$rows = array();
if (\db\mysql_num_rows($result) > 0) {
    while($row = \db\mysql_fetch_assoc($result)) {
      $x = new stdClass();
      $x->expireDate            = date2String(strtotime($row['expire_date']));
      $x->fileId                = is_null($row['file_id']) ? 0 : intval($row['file_id']);
      $x->fileName              = utf8_encode($row['file_name']);
      $x->fileType              = $row['mime_type'];
      $x->fileSize              = is_null($row['file_size']) ? 0 : intval($row['file_size']);
      $x->imageWidth            = is_null($row['image_width']) ? 0 : intval($row['image_width']);
      $x->imageHeight           = is_null($row['image_height']) ? 0 : intval($row['image_height']);
      $x->id                    = intval($row['id']);
      $x->introduction          = html_entity_decode(utf8_encode($row['inledning']));
      $x->newsTypeId            = intval($row['news_type_id']);
      $x->text                  = html_entity_decode(utf8_encode($row['texten']));
      $x->link                  = utf8_encode($row['lank']);
      $x->header                = utf8_encode($row['rubrik']);
      $x->modificationDate      = $row['mod_date'];
      $x->modifiedBy            = is_null($row['user_id']) ? '' : utf8_encode($row['first_name'] . " " . $row['last_name']);
      array_push($rows, $x);
    }
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
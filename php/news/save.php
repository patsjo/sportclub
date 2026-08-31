<?php

//############################################################
//# File:    save.php                                        #
//# Created: 2003-12-27                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iNewsID (Values: 0 If a new news)            #
//#             iNewsTypeID, iRubrik, iLank, iInledning      #
//#             iTexten, iExpireDate                         #
//#             iFiles (Array, one entry per file, in the    #
//#                     order they should be shown)          #
//#             iFileID (Values: -1 = New file,              #
//#                                > 0 Keep old file)        #
//#             iFileData, iMimeType, iFileSize, iFileName   #
//#                 (Only needed when iFileID = -1)          #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2003-12-27  PatSjo  Initial version                      #
//# 2005-02-12  PatSjo  Don't delete file if it isn't in the #
//#                     news folder (folder_id = 1).         #
//# 2005-08-28  PatSjo  Changes from Access to MySQL         #
//# 2006-01-04  PatSjo  Changes from ASP to PHP              #
//# 2021-08-21  PatSjo  Change to JSON in and out            #
//# 2026-08-30  JohBla  Allow many files/images per news     #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/news.php");

cors();
ValidLogin();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

if(!isset($input->iNewsID))
{
  trigger_error('Felaktig parameter "iNewsID"', E_USER_ERROR);
}
if(!isset($input->iNewsTypeID))
{
  trigger_error('Felaktig parameter "iNewsTypeID"', E_USER_ERROR);
}
$input->iRubrik = stripslashes($input->iRubrik);
if (strlen($input->iRubrik) > 50)
{
  trigger_error('Felaktig parameter "Rubrik", fler �n 50 tecken.', E_USER_ERROR);
}
$input->iLank = stripslashes($input->iLank);
if (strlen($input->iLank) > 150)
{
  trigger_error('Felaktig parameter "L�nk", fler �n 150 tecken.', E_USER_ERROR);
}
$input->iInledning = stripslashes($input->iInledning);
$input->iTexten = stripslashes($input->iTexten);
$input->iExpireDate = string2Date($input->iExpireDate);

if (isset($input->iFiles) && is_array($input->iFiles))
{
  $files = $input->iFiles;
}
else if (isset($input->iFileID) && $input->iFileID != 0)
{
  //# Older clients send one single file, not an array #
  $file = new stdClass();
  $file->iFileID   = $input->iFileID;
  $file->iFileData = isset($input->iFileData) ? $input->iFileData : null;
  $file->iMimeType = isset($input->iMimeType) ? $input->iMimeType : null;
  $file->iFileSize = isset($input->iFileSize) ? $input->iFileSize : null;
  $file->iFileName = isset($input->iFileName) ? $input->iFileName : null;
  $files = array($file);
}
else
{
  $files = array();
}

foreach ($files as $file)
{
  if (!isset($file->iFileID))
  {
    trigger_error('Felaktig parameter "iFileID"', E_USER_ERROR);
  }
  if ($file->iFileID != -1) // Keep an already uploaded file
  {
    continue;
  }

  if (!isset($file->iFileData) || !isset($file->iMimeType) || !isset($file->iFileSize) || !isset($file->iFileName))
  {
    trigger_error('Felaktig parameter "Filnamn", fil saknas.', E_USER_ERROR);
  }
  if (strlen($file->iFileName) > 255)
  {
    trigger_error('Felaktig parameter "Filnamn", fler �n 255 tecken.', E_USER_ERROR);
  }
  if ($file->iFileSize <= 0)
  {
    trigger_error('Ny bild/fil vald, men ingen fil skickad.', E_USER_ERROR);
  }
  if ($file->iFileSize > 10000000) // Don't allow bigger than 10MB
  {
    trigger_error('Bild/fil �r st�rre �n 10MB.', E_USER_ERROR);
  }
}

$iUpdateModificationDate = $input->iUpdateModificationDate;

OpenDatabase();
$now = date("Y-m-d G:i:s"); // MySQL DATETIME

$old_file_ids = $input->iNewsID > 0 ? getNewsFileIds($input->iNewsID) : array();

//###########################################################
//# Upload the new files first, the first file of the news   #
//# is also stored in news.file_id to stay backward          #
//# compatible with clients only showing one image.          #
//###########################################################
$file_ids = array();
$image_width = 0;
$image_height = 0;

foreach ($files as $file)
{
  if ($file->iFileID == -1) // New file to upload
  {
    list($file_id, $file_image_width, $file_image_height) = insertNewsFile($file, $user_id, $now);
  }
  else
  {
    $file_id = intval($file->iFileID);
    list($file_image_width, $file_image_height) = getNewsFileImageSize($file_id);
  }

  if (count($file_ids) == 0)
  {
    $image_width = $file_image_width;
    $image_height = $file_image_height;
  }
  array_push($file_ids, $file_id);
}

$main_file_id = count($file_ids) > 0 ? $file_ids[0] : 0;

if ($input->iNewsID == 0)
{
  $query = sprintf("INSERT INTO news " .
                   "(" .
                   "  rubrik, lank, inledning, texten, news_type_id, expire_date, file_id, " .
                   "  image_width, image_height, cre_by_user_id, cre_date, mod_by_user_id, mod_date" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  '%s', '%s', '%s', '%s', %d, '%s', %d, " .
                   "  %d, %d, %d, '%s', %d, '%s'" .
                   ")",
                   \db\mysql_real_escape_string($input->iRubrik),
                   \db\mysql_real_escape_string($input->iLank),
                   \db\mysql_real_escape_string($input->iInledning),
                   \db\mysql_real_escape_string($input->iTexten),
                   $input->iNewsTypeID,
                   Date("Y-m-d G:i:s", $input->iExpireDate),
                   $main_file_id,
                   $image_width,
                   $image_height,
                   $user_id,
                   $now,
                   $user_id,
                   $now);

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $input->iNewsID = \db\mysql_insert_id();
}
else
{
  if ($iUpdateModificationDate)
  {
    $query = sprintf("UPDATE news " .
                    "SET " .
                    "  rubrik = '%s'," .
                    "  lank = '%s'," .
                    "  inledning = '%s'," .
                    "  texten = '%s'," .
                    "  news_type_id = %d," .
                    "  expire_date = '%s'," .
                    "  file_id = %d," .
                    "  image_width = %d," .
                    "  image_height = %d," .
                    "  mod_by_user_id = %d," .
                    "  mod_date = '%s' " .
                    "WHERE id = %d",
                    \db\mysql_real_escape_string($input->iRubrik),
                    \db\mysql_real_escape_string($input->iLank),
                    \db\mysql_real_escape_string($input->iInledning),
                    \db\mysql_real_escape_string($input->iTexten),
                    $input->iNewsTypeID,
                    Date("Y-m-d G:i:s", $input->iExpireDate),
                    $main_file_id,
                    $image_width,
                    $image_height,
                    $user_id,
                    $now,
                    $input->iNewsID);
  }
  else
  {
    $query = sprintf("UPDATE news " .
                    "SET " .
                    "  rubrik = '%s'," .
                    "  lank = '%s'," .
                    "  inledning = '%s'," .
                    "  texten = '%s'," .
                    "  news_type_id = %d," .
                    "  expire_date = '%s'," .
                    "  file_id = %d," .
                    "  image_width = %d," .
                    "  image_height = %d," .
                    "  mod_by_user_id = %d " .
                    "WHERE id = %d",
                    \db\mysql_real_escape_string($input->iRubrik),
                    \db\mysql_real_escape_string($input->iLank),
                    \db\mysql_real_escape_string($input->iInledning),
                    \db\mysql_real_escape_string($input->iTexten),
                    $input->iNewsTypeID,
                    Date("Y-m-d G:i:s", $input->iExpireDate),
                    $main_file_id,
                    $image_width,
                    $image_height,
                    $user_id,
                    $input->iNewsID);
  }

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
}

saveNewsFiles($input->iNewsID, $file_ids);
deleteNewsFiles($old_file_ids, $file_ids);

$sql = "SELECT * FROM news INNER JOIN users ON (news.mod_by_user_id = users.user_id) LEFT OUTER JOIN files ON (news.file_id = files.file_id) WHERE id = " . $input->iNewsID;
$result = \db\mysql_query($sql);
if (!$result)
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

$x = null;
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
      $x->modifiedBy            = $row['first_name'] . " " . $row['last_name'];
      $x->files                 = array();
    }
}
\db\mysql_free_result($result);

if (!is_null($x))
{
  addNewsFiles(array($x->id => $x));
}

CloseDatabase();

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");
echo json_encode($x);
?>

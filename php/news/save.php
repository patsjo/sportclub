<?php

//############################################################
//# File:    save.php                                        #
//# Created: 2003-12-27                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iNewsID (Values: 0 If a new news)            #
//#             iNewsTypeID, iRubrik, iLank, iInledning      #
//#             iTexten, iExpireDate, iFileData              #
//#             iFileID (Values: 0 = No image, -1 = New,     #
//#                              > 0 Keep old image          #
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
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");

cors();
ValidLogin();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

$image_width            = 0;
$image_height           = 0;
$is_new_file_uploaded   = false;

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
if(!isset($input->iFileID))
{
  trigger_error('Felaktig parameter "iFileID"', E_USER_ERROR);
}

if ($input->iFileID == -1) // New File to upload
{
  $is_new_file_uploaded = true;
  if (!isset($input->iFileData) || !isset($input->iMimeType) || !isset($input->iFileSize) || !isset($input->iFileName))
  {
    trigger_error('Felaktig parameter "Filnamn", fil saknas.', E_USER_ERROR);
  }
  if (strlen($input->iFileName) > 255)
  {
    trigger_error('Felaktig parameter "Filnamn", fler �n 255 tecken.', E_USER_ERROR);
  }

  if ($input->iFileSize <= 0)
  {
    trigger_error('Ny bild/fil vald, men ingen fil skickad.', E_USER_ERROR);
  }
  if ($input->iFileSize > 10000000) // Don't allow bigger than 10MB
  {
    trigger_error('Bild/fil �r st�rre �n 10MB.', E_USER_ERROR);
  }

  $decoded_filedata = base64_decode($input->iFileData);
  $input->iFileData = \db\mysql_real_escape_string($decoded_filedata);
  if (!strlen($input->iFileData))
  {
    trigger_error('Kunde ej l�sa den uppladdade bilden/filen.', E_USER_ERROR);
  }
  
  $cache_file = $_SERVER["DOCUMENT_ROOT"] . '/cache/' . $input->iFileName;
  file_put_contents($cache_file, $decoded_filedata, LOCK_EX);
  list($image_width, $image_height, $image_type, $image_attr) = @getimagesize('file://' . $cache_file);
  unlink($cache_file);
}

$iUpdateModificationDate = $input->iUpdateModificationDate;

OpenDatabase();
$now = date("Y-m-d G:i:s"); // MySQL DATETIME

if (($input->iNewsID > 0) && (($input->iFileID == 0) || ($input->iFileID == -1))) // No file or New File
{
  $old_file_id = 0;
  $query = sprintf("SELECT file_id FROM news WHERE id = %d", $input->iNewsID);
  ($result = \db\mysql_query($query)) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $old_file_id = $row['file_id'];
  }
  \db\mysql_free_result($result);

  if ($old_file_id > 0) // There is a file to delete
  {
    //########################
    //# folder_id = 1 = NEWS #
    //########################

    $query = sprintf("DELETE FROM files WHERE folder_id = 1 AND file_id = %d", $old_file_id);
    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  }
}

if ($input->iFileID == -1) // New File
{
  //########################
  //# folder_id = 1 = NEWS #
  //########################

  $query = sprintf("INSERT INTO files " .
                   "(" .
                   "  file_name, folder_id, file_size, file_blob, mime_type, image_width, image_height, " .
                   "  allowed_group_id, cre_by_user_id, cre_date" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  '%s', %d, %d, '%s', '%s', %d, %d, " .
                   "  %d, %d, '%s'" .
                   ")",
                   \db\mysql_real_escape_string($input->iFileName),
                   1,
                   $input->iFileSize,
                   $input->iFileData,
                   \db\mysql_real_escape_string($input->iMimeType),
                   $image_width,
                   $image_height,
                   0,
                   $user_id,
                   $now);

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $input->iFileID = \db\mysql_insert_id();
        
  if ($input->iFileID == 0)
  {
    trigger_error("Can't get the 'file_id' auto_increment value", E_USER_ERROR);
  }
}

if ($input->iNewsID == 0)
{
  //########################
  //# folder_id = 1 = NEWS #
  //########################

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
                   $input->iFileID,
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
  if ($is_new_file_uploaded)
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
                      $input->iFileID,
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
                      $input->iFileID,
                      $image_width,
                      $image_height,
                      $user_id,
                      $input->iNewsID);
    }
  }
  else if ($input->iFileID == 0) // There is no file
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
                      $input->iFileID,
                      0,
                      0,
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
                      $input->iFileID,
                      0,
                      0,
                      $user_id,
                      $input->iNewsID);
    }
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
                      "  mod_by_user_id = %d," .
                      "  mod_date = '%s' " .
                      "WHERE id = %d",
                      \db\mysql_real_escape_string($input->iRubrik),
                      \db\mysql_real_escape_string($input->iLank),
                      \db\mysql_real_escape_string($input->iInledning),
                      \db\mysql_real_escape_string($input->iTexten),
                      $input->iNewsTypeID,
                      Date("Y-m-d G:i:s", $input->iExpireDate),
                      $input->iFileID,
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
                      "  mod_by_user_id = %d " .
                      "WHERE id = %d",
                      \db\mysql_real_escape_string($input->iRubrik),
                      \db\mysql_real_escape_string($input->iLank),
                      \db\mysql_real_escape_string($input->iInledning),
                      \db\mysql_real_escape_string($input->iTexten),
                      $input->iNewsTypeID,
                      Date("Y-m-d G:i:s", $input->iExpireDate),
                      $input->iFileID,
                      $user_id,
                      $input->iNewsID);
    }
  }

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
}

$sql = "SELECT * FROM news INNER JOIN users ON (news.mod_by_user_id = users.user_id) LEFT OUTER JOIN files ON (news.file_id = files.file_id) WHERE id = " . $input->iNewsID;
$result = \db\mysql_query($sql);
if (!$result)
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}
  
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
    }
}
CloseDatabase();
  
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");
echo json_encode($x);
?>
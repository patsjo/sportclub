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
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");

ValidLogin();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

$title                  = "Nyheter (Spara nyhet)";
$errCode                = 0;
$errText                = Null;
$image_width            = 0;
$image_height           = 0;
$is_new_file_uploaded   = false;
$jsonResponse           = false;

if (isset($_REQUEST['jsonResponse'])) {
  $jsonResponse = true;
}
if (is_numeric($_REQUEST['iNewsID']))
{
  $iNewsID = intval($_REQUEST['iNewsID']);
}
else
{
  trigger_error('Felaktig parameter "iNewsID"', E_USER_ERROR);
}
if (is_numeric($_REQUEST['iNewsTypeID']))
{
  $iNewsTypeID = intval($_REQUEST['iNewsTypeID']);
}
else
{
  trigger_error('Felaktig parameter "iNewsTypeID"', E_USER_ERROR);
}
$iRubrik = getIso88591(stripslashes($_REQUEST['iRubrik']));
if (strlen($iRubrik) > 50)
{
  trigger_error('Felaktig parameter "Rubrik", fler än 50 tecken.', E_USER_ERROR);
}
$iLank = stripslashes($_REQUEST['iLank']);
if (strlen($iLank) > 150)
{
  trigger_error('Felaktig parameter "Länk", fler än 150 tecken.', E_USER_ERROR);
}
$iInledning = getIso88591(stripslashes($_REQUEST['iInledning']));
$iTexten = getIso88591(stripslashes($_REQUEST['iTexten']));
$iExpireDate = string2Date($_REQUEST['iExpireDate']);
if (is_numeric($_REQUEST['iFileID']))
{
  $iFileID = intval($_REQUEST['iFileID']);
}
else
{
  trigger_error('Felaktig parameter "iFileID"', E_USER_ERROR);
}

if ($iFileID == -1) // New File to upload
{
  $is_new_file_uploaded = true;
  if ($_FILES['iFileData']['error'] == 4)
  {
    trigger_error('Felaktig parameter "Filnamn", fil saknas.', E_USER_ERROR);
  }
  else if ($_FILES['iFileData']['error'] != 0)
  {
    trigger_error('Felaktig parameter "Filnamn", kunde ej ladda upp filen.', E_USER_ERROR);
  }
  $file_name = getIso88591($_FILES['iFileData']['name']);
  if (strlen($file_name) > 255)
  {
    trigger_error('Felaktig parameter "Filnamn", fler än 255 tecken.', E_USER_ERROR);
  }
  $file_size = $_FILES['iFileData']['size'];
  $mime_type = $_FILES['iFileData']['type'];

  if ($file_size <= 0)
  {
    trigger_error('Ny bild/fil vald, men ingen fil skickad.', E_USER_ERROR);
  }
  if ($file_size > 2000000) // Don't allow bigger than 2MB
  {
    trigger_error('Bild/fil är större än 2MB.', E_USER_ERROR);
  }

  if (file_exists($_FILES['iFileData']['tmp_name']))
  {
    $iFileData = \db\mysql_real_escape_string(fread(fopen($_FILES['iFileData']['tmp_name'], "r"),$_FILES['iFileData']['size']));
    if (!strlen($iFileData))
    {
      trigger_error('Kunde ej läsa den uppladdade bilden/filen.', E_USER_ERROR);
    }
  }
  else
  {
    trigger_error('Ny bild/fil vald, men ingen fil skickad.', E_USER_ERROR);
  }

  list($image_width, $image_height, $image_type, $image_attr) = @getimagesize($_FILES['iFileData']['tmp_name']);
}

if (!$jsonResponse) {
  htmlHeader("Värend GN, " . $title);
}

OpenDatabase();
$now = date("Y-m-d G:i:s"); // MySQL DATETIME

if (($iNewsID > 0) && (($iFileID == 0) || ($iFileID == -1))) // No file or New File
{
  $old_file_id = 0;
  $query = sprintf("SELECT file_id FROM news WHERE id = %d", $iNewsID);
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

if ($iFileID == -1) // New File
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
                   \db\mysql_real_escape_string($file_name),
                   1,
                   $file_size,
                   $iFileData,
                   \db\mysql_real_escape_string($mime_type),
                   $image_width,
                   $image_height,
                   0,
                   $user_id,
                   $now);

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $iFileID = \db\mysql_insert_id();
        
  if ($iFileID == 0)
  {
    trigger_error("Can't get the 'file_id' auto_increment value", E_USER_ERROR);
  }
}

if ($iNewsID == 0)
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
                   \db\mysql_real_escape_string($iRubrik),
                   \db\mysql_real_escape_string($iLank),
                   \db\mysql_real_escape_string($iInledning),
                   \db\mysql_real_escape_string($iTexten),
                   $iNewsTypeID,
                   Date("Y-m-d G:i:s", $iExpireDate),
                   $iFileID,
                   $image_width,
                   $image_height,
                   $user_id,
                   $now,
                   $user_id,
                   $now);

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $iNewsID = \db\mysql_insert_id();
}
else
{
  if ($is_new_file_uploaded)
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
                     \db\mysql_real_escape_string($iRubrik),
                     \db\mysql_real_escape_string($iLank),
                     \db\mysql_real_escape_string($iInledning),
                     \db\mysql_real_escape_string($iTexten),
                     $iNewsTypeID,
                     Date("Y-m-d G:i:s", $iExpireDate),
                     $iFileID,
                     $image_width,
                     $image_height,
                     $user_id,
                     $now,
                     $iNewsID);
  }
  else if ($iFileID == 0) // There is no file
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
                     \db\mysql_real_escape_string($iRubrik),
                     \db\mysql_real_escape_string($iLank),
                     \db\mysql_real_escape_string($iInledning),
                     \db\mysql_real_escape_string($iTexten),
                     $iNewsTypeID,
                     Date("Y-m-d G:i:s", $iExpireDate),
                     $iFileID,
                     0,
                     0,
                     $user_id,
                     $now,
                     $iNewsID);
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
                     "  mod_by_user_id = %d," .
                     "  mod_date = '%s' " .
                     "WHERE id = %d",
                     \db\mysql_real_escape_string($iRubrik),
                     \db\mysql_real_escape_string($iLank),
                     \db\mysql_real_escape_string($iInledning),
                     \db\mysql_real_escape_string($iTexten),
                     $iNewsTypeID,
                     Date("Y-m-d G:i:s", $iExpireDate),
                     $iFileID,
                     $user_id,
                     $now,
                     $iNewsID);
  }

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
}
if ($jsonResponse) {
  $sql = "SELECT * FROM news INNER JOIN users ON (news.mod_by_user_id = users.user_id) LEFT OUTER JOIN files ON (news.file_id = files.file_id) WHERE id = " . $iNewsID;
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }
  
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
        $x->modifiedBy            = utf8_encode($row['first_name'] . " " . $row['last_name']);
      }
  }
  
  header("Access-Control-Allow-Credentials: true");
  header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
  header("Access-Control-Allow-Headers: *");
  header("Content-Type: application/json; charset=ISO-8859-1");
  echo utf8_decode(json_encode($x));
  CloseDatabase();
  exit();
}

CloseDatabase();
?>
<TABLE class="body">
  <TR>
    <TD><H1><?php echo $title ?></H1></TD>
  </TR>
  <TR>
    <TD>Posten sparad i databasen.</TD>
  </TR>
  <TR>
    <TD><INPUT type="button" value=" Åter till startsidan " onClick="location.href='/'"/></TD>
  </TR>
</TABLE>
</BODY>
</HTML>
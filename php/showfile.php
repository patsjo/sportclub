<?php
//############################################################
//# File:    showfile.php                                    #
//# Created: 2003-12-25                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iFileID                                      #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2003-12-25  PatSjo  Initial version                      #
//# 2005-08-28  PatSjo  Changes from Access to MySQL         #
//# 2006-01-04  PatSjo  Changes from ASP to PHP              #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

$iFileID = 0;
$cBUFFER_SIZE = 32767;

if (is_numeric($_REQUEST['iFileID']))
{
  $iFileID = intval($_REQUEST['iFileID']);
}
else
{
  trigger_error('Felaktig parameter "iFileID"', E_USER_ERROR);
}
   
OpenDatabase();

$query = sprintf("SELECT f.file_blob, f.file_name, f.file_size, f.mime_type, f.need_password, f.allowed_group_id " .
                 "FROM files f WHERE f.file_id = %d",
                 $iFileID);

$result = \db\mysql_query($query) or trigger_error('SQL-ERROR, kunde ej hämta filen.', E_USER_ERROR);

list($file_blob, $file_name, $file_size, $mime_type, $need_password, $allowed_group_id) = \db\mysql_fetch_array($result);

if (strcasecmp($need_password, "YES") == 0)
{
  ValidLogin(false, false, true);
  if ((intval($allowed_group_id) > 0) && !(ValidGroup(intval($allowed_group_id))))
  {
    NotAuthorized(true);
  }
}

header("Content-type: $mime_type");
header('Content-Transfer-Encoding: binary');
header('Accept-Ranges: bytes');
header('Content-Disposition: inline; filename="' . $file_name . '"');
header("Content-length: $file_size");

echo $file_blob;

CloseDatabase();
exit;

?>
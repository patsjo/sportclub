<?php
//############################################################
//# File:    delete.php                                      #
//# Created: 2003-12-28                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iNewsID                                      #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2003-12-28  PatSjo  Initial version                      #
//# 2005-02-12  PatSjo  Don't delete file if it isn't in the #
//#                     news folder (folder_id = 1).         #
//# 2005-08-28  PatSjo  Changes from Access to MySQL         #
//# 2014-04-20  PatSjo  Changes from ASP to PHP              #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

ValidLogin();

$iNewsID     = 0;
$file_id     = 0;
$errCode     = 0;

if (is_numeric($_REQUEST['iNewsID']))
{
  $iNewsID = intval($_REQUEST['iNewsID']);
}
else
{
  trigger_error('Felaktig parameter "iNewsID"', E_USER_ERROR);
}

if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  NotAuthorized();
}

htmlHeader("Värend GN, Radera nyhet");

echo "<TABLE class=\"body\">\n";
echo "  <TR>\n";
echo "    <TD><H1>Radera nyhet</H1></TD>\n";
echo "  </TR>\n";

OpenDatabase();

$sql = "SELECT file_id FROM news WHERE id = " . $iNewsID;

$result = \db\mysql_query($sql);
if (!$result)
{
  die('SQL Error: ' . \db\mysql_error());
}

while ($row = \db\mysql_fetch_assoc($result))
{
  $file_id              = is_null($row['file_id']) ? 0 : intval($row['file_id']);
}
\db\mysql_free_result($result);

$sql = "DELETE FROM news WHERE id = " . $iNewsID;

if (!\db\mysql_query($sql))
{
  $errCode = 1;
  $errText = "<P>Databasfel: " . \db\mysql_error() . "</P>\n";
}

if ($file_id > 0) //There is a file to delete
{
  //########################
  //# folder_id = 1 = NEWS #
  //########################

  $sql = "DELETE FROM files WHERE folder_id = 1 AND file_id = " . $file_id;

  if (!\db\mysql_query($sql))
  {
    $errCode = 1;
    $errText = "<P>Databasfel: " . \db\mysql_error() . "</P>\n";
  }
}

CloseDatabase();

if ($errCode == 0)
{
  echo "  <TR>\n";
  echo "    <TD>Posten raderad från databasen.</TD>\n";
  echo "  </TR>\n";
}
else
{
  echo "  <TR>\n";
  echo "    <TD><H2>FEL!!!</H2></TD>\n";
  echo "  </TR>\n";
  echo "  <TR>\n";
  echo "    <TD>" . $errText . "</TD>\n";
  echo "  </TR>\n";
  echo "  <TR>\n";
  echo "    <TD><INPUT type=\"button\" value=\" Tillbaka \" onClick=\"javascript:window.history.back();\"/></TD>\n";
  echo "  </TR>\n";
}

echo "</TABLE>\n";
echo "</BODY>\n";
echo "</HTML>\n";
?>
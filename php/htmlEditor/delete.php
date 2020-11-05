<?php
//############################################################
//# File:    delete.php                                      #
//# Created: 2020-10-18                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iPageID                                      #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2020-10-18  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

ValidLogin();

$iPageID     = 0;
$iLinkID     = 0;
$errCode     = 0;

if (isset($_REQUEST['iPageID']) && is_numeric($_REQUEST['iPageID']))
{
  $iPageID = intval($_REQUEST['iPageID']);
}
if (isset($_REQUEST['iLinkID']) && is_numeric($_REQUEST['iLinkID']))
{
  $iLinkID = intval($_REQUEST['iLinkID']);
}

if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  NotAuthorized();
}

htmlHeader("Radera hemsida/länk");

echo "<TABLE class=\"body\">\n";
echo "  <TR>\n";
echo "    <TD><H1>Radera hemsida/länk</H1></TD>\n";
echo "  </TR>\n";

OpenDatabase();

if ($iPageID > 0)
{
  $sql = "DELETE FROM HTMLEDITOR_GROUPS WHERE PAGE_ID = " . $iPageID;
  
  if (!\db\mysql_query($sql))
  {
    $errCode = 1;
    $errText = "<P>Databasfel: " . \db\mysql_error() . "</P>\n";
  }
  
  $sql = "DELETE FROM HTMLEDITOR_PAGES WHERE PAGE_ID = " . $iPageID;
  
  if (!\db\mysql_query($sql))
  {
    $errCode = 1;
    $errText = "<P>Databasfel: " . \db\mysql_error() . "</P>\n";
  }
}
elseif ($iLinkID > 0)
{
  $sql = "DELETE FROM HTMLEDITOR_LINKS WHERE LINK_ID = " . $iLinkID;
  
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
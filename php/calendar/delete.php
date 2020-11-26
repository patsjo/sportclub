<?php
//############################################################
//# File:    /kalender/delete.php                            #
//# Created: 2005-09-24                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iActivityID                                  #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2005-09-24  PatSjo  Initial version                      #
//# 2013-12-15  PatSjo  Changed from ASP to PHP              #
//# 2020-11-24  PatSjo  Added iRepeatingGid                  #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

$iActivityID         = 0;
$iRepeatingGid       = null;
$sql                 = "";

$title                  = "Kalender (Radera aktivitet)";

if(isset($_REQUEST['iActivityID']) && $_REQUEST['iActivityID']!="")
{
  $iActivityID = intval($_REQUEST['iActivityID']);
}
if(isset($_REQUEST['iRepeatingGid']) && $_REQUEST['iRepeatingGid']!="")
{
  $iRepeatingGid = $_REQUEST['iRepeatingGid'];
}

ValidLogin();
if (!ValidGroup(8888)) //Not a admin user
{
  NotAuthorized();
}

htmlHeader("Värend GN, Radera aktivitet");

echo "<TABLE class=\"body\">\n";
echo "  <TR>\n";
echo "    <TD><H1>Radera aktivitet</H1></TD>\n";
echo "  </TR>\n";

OpenDatabase();

if (is_null($iRepeatingGid)) {
  $sql = "DELETE FROM activity " .
         "WHERE activity_id = " . $iActivityID;
} else {
  $sql = "DELETE FROM activity " .
         "WHERE repeating_gid = '" . $iRepeatingGid . "'";
}

if (!\db\mysql_query($sql))
{
  echo "  <TR>\n";
  echo "    <TD>Databasfel: " . \db\mysql_error() . "</TD>\n";
  echo "  </TR>\n";
  echo "</TABLE>\n";
  echo "</BODY>\n";
  echo "</HTML>\n";
  exit(0);
}

\db\mysql_query("COMMIT");

CloseDatabase();

echo "  <TR>\n";
echo "    <TD>Posten raderad från databasen.</TD>\n";
echo "  </TR>\n";
echo "</TABLE>\n";
echo "</BODY>\n";
echo "</HTML>\n";
?>
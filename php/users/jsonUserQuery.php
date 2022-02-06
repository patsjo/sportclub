<?php
//############################################################
//# File:    jsonResultQuery.php                             #
//# Created: 2022-01-06                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2022-01-06  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();
ValidLogin();

$rows = new stdClass();
$rows->users = array();
$rows->groups = array();
$rows->councils = array();

OpenDatabase();

$sql = "SELECT users.USER_ID, BIRTHDAY, FIRST_NAME, LAST_NAME, ADDRESS, ZIP, CITY, " .
"   EMAIL, PHONE_NO, MOBILE_PHONE_NO, WORK_PHONE_NO, COUNCIL_ID, RESPONSIBILITY, " .
"   GROUP_CONCAT(GROUP_ID SEPARATOR ',') AS GROUP_IDS " .
"FROM users " .
"LEFT OUTER JOIN user_groups ON (users.user_id = user_groups.user_id) ".
"GROUP BY users.USER_ID, BIRTHDAY, FIRST_NAME, LAST_NAME, ADDRESS, ZIP, CITY, " .
"   EMAIL, PHONE_NO, MOBILE_PHONE_NO, WORK_PHONE_NO, COUNCIL_ID, RESPONSIBILITY";

$result = \db\mysql_query($sql);
if (!$result)
{
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

if (\db\mysql_num_rows($result) > 0)
{
    while($row = \db\mysql_fetch_assoc($result))
    {
        $x = new stdClass();
        $x->userId                = intval($row['USER_ID']);
        $x->birthDay              = $row['BIRTHDAY'];
        $x->firstName             = $row['FIRST_NAME'];
        $x->lastName              = $row['LAST_NAME'];
        $x->address               = $row['ADDRESS'];
        $x->zip                   = $row['ZIP'];
        $x->city                  = $row['CITY'];
        $x->email                 = $row['EMAIL'];
        $x->phoneNo               = $row['PHONE_NO'];
        $x->mobilePhoneNo         = $row['MOBILE_PHONE_NO'];
        $x->workPhoneNo           = $row['WORK_PHONE_NO'];
        $x->councilId             = intval($row['COUNCIL_ID']);
        $x->responsibility        = $row['RESPONSIBILITY'];
        $x->groupIds              = is_null($row['GROUP_IDS']) ? array() : array_map('intval', explode(",", $row['GROUP_IDS']));
        sort($x->groupIds);
        array_push($rows->users, $x);
    }
}

\db\mysql_free_result($result);

$sql = "SELECT GROUP_ID, NAME, DESCRIPTION, EMAIL, SHOW_IN_CALENDAR FROM groups ";

$result = \db\mysql_query($sql);
if (!$result)
{
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

if (\db\mysql_num_rows($result) > 0)
{
    while($row = \db\mysql_fetch_assoc($result))
    {
        $x = new stdClass();
        $x->groupId               = intval($row['GROUP_ID']);
        $x->name                  = $row['NAME'];
        $x->description           = $row['DESCRIPTION'];
        $x->email                 = $row['EMAIL'];
        $x->showInCalendar        = $row['SHOW_IN_CALENDAR'] == 'YES' ? true : false;
        array_push($rows->groups, $x);
    }
}

\db\mysql_free_result($result);

$sql = "SELECT COUNCIL_ID, NAME FROM councils ";

$result = \db\mysql_query($sql);
if (!$result)
{
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

if (\db\mysql_num_rows($result) > 0)
{
    while($row = \db\mysql_fetch_assoc($result))
    {
        $x = new stdClass();
        $x->councilId             = intval($row['COUNCIL_ID']);
        $x->name                  = $row['NAME'];
        array_push($rows->councils, $x);
    }
}

\db\mysql_free_result($result);

header("Content-Type: application/json");
ini_set( 'precision', 20 );
ini_set( 'serialize_precision', 14 );
echo json_encode($rows);
?>
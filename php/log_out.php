<?php
//############################################################
//# File:    log_out.php                                     #
//# Created: 2019-04-07                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: the login token in "Authorization: Bearer",  #
//#             it is deleted                                #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2019-04-07  PatSjo  Initial version                      #
//# 2026-11-13  PatSjo  Delete the login token               #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();
// A guest has no session, don't start one only to end it
if (isset($_COOKIE[session_name()]))
{
  StartSession();
}

$auth = get_http_authorization();
if (!is_null($auth) && $auth->type == 'bearer')
{
  deleteLoginToken($auth->token);
}

clearSessionLogin();
// A guest token isn't saved anywhere, the web page just forgets it
if (session_status() == PHP_SESSION_ACTIVE)
{
  session_unset();
  session_destroy();
}
header("Content-Type: application/json");
echo "{}";
exit();
?>
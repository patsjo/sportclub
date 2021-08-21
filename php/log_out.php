<?php
//############################################################
//# File:    log_out.php                                     #
//# Created: 2019-04-07                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iURL                                         #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2019-04-07  PatSjo  Initial version                      #
//############################################################

session_start();
session_unset();
session_destroy();
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
header("Access-Control-Allow-Headers: *");
exit();
?>
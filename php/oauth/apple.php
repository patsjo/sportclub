<?php
//############################################################
//# File:    apple.php                                       #
//# Created: 2026-11-15                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Sign in with Apple, see include/oauth.php.               #
//# Register https://<your domain>/oauth/apple.php           #
//# as the Return URL of the Services ID at Apple.           #
//# Parameters: returnUrl, remember (1 = remember me)        #
//# Apple returns with a POST to the same script.            #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-15  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/oauth.php");

oauthAppleLogin();
?>

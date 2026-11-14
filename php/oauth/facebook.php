<?php
//############################################################
//# File:    facebook.php                                    #
//# Created: 2026-11-13                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Login with Facebook, see include/oauth.php.              #
//# Register https://<your domain>/oauth/facebook.php        #
//# as the redirect URI at Facebook.                         #
//# Parameters: returnUrl, remember (1 = remember me)        #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-13  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/oauth.php");

oauthLogin('FACEBOOK');
?>

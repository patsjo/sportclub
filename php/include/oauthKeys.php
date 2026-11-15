<?php
//############################################################
//########## MAKE SURE SET PERMISSIONS TO 0600 ###############
//############################################################
//# File:    oauthKeys.php                                   #
//# Created: 2026-11-13                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# The keys for login with Google, Facebook and Apple, see  #
//# README "Login with Google, Facebook and Apple". Never    #
//# put the secrets in the club config file                  #
//# (src/models/clubs), it is sent to every browser.         #
//# Return an empty string to turn a provider off.           #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-13  PatSjo  Initial version                      #
//############################################################

function GetGoogleClientId()
{
    return "";
}

function GetGoogleClientSecret()
{
    return "";
}

function GetFacebookAppId()
{
    return "";
}

function GetFacebookAppSecret()
{
    return "";
}

// Facebook removes old versions of the Graph API after about two years,
// change to the latest version (developers.facebook.com/docs/graph-api/changelog).
function GetFacebookGraphVersion()
{
    return "v24.0";
}

// Sign in with Apple (developer.apple.com, Certificates, Identifiers & Profiles), all four are needed.
// The Team ID of the membership
function GetAppleTeamId()
{
    return "";
}

// The identifier of the Services ID (the client id), e.g. "com.okorion.web"
function GetAppleServicesId()
{
    return "";
}

// The Key ID of the key with "Sign in with Apple"
function GetAppleKeyId()
{
    return "";
}

// The content of the downloaded key file AuthKey_<Key ID>.p8, e.g.
//     return <<<'KEY'
// -----BEGIN PRIVATE KEY-----
// ...
// -----END PRIVATE KEY-----
// KEY;
function GetApplePrivateKey()
{
    return "";
}

// The web pages that Google/Facebook/Apple may return to after the login, scheme + host (+ port).
// An empty array allows the same host as the PHP scripts.
function GetOAuthAllowedReturnOrigins()
{
    return array(
        // "https://okorion.com",
        // "https://www.okorion.com",
        // "http://localhost:5173"
    );
}

// Optional, signs the login of guests (they aren't saved until they react, comment or ask for access).
// A long random string, e.g. from "openssl rand -hex 32". Empty uses the secrets above instead,
// changing it (or them) logs out all guests.
function GetLoginTokenSecret()
{
    return "";
}

?>

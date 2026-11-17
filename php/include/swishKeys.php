<?php
//############################################################
//########## MAKE SURE SET PERMISSIONS TO 0600 ###############
//############################################################
//# File:    swishKeys.php                                   #
//# Created: 2026-11-17                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Swish Handel (the Swish Commerce API) for the invoices,  #
//# see README "Invoices and Swish". Never put the           #
//# certificate or the password in the club config file      #
//# (src/models/clubs), it is sent to every browser.         #
//# An empty GetSwishPayeeAlias() turns Swish off, the       #
//# invoices still work (paid manually).                     #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-17  PatSjo  Initial version                      #
//############################################################

// The Swish number of the club (Swish Handel), only digits, e.g. "1231985837".
// The test environment (MSS) uses "1234679304".
function GetSwishPayeeAlias()
{
    return "";
}

// Production: "https://cpc.getswish.net/swish-cpcapi/api"
// Test (MSS): "https://mss.cpc.getswish.net/swish-cpcapi/api"
function GetSwishApiUrl()
{
    return "https://cpc.getswish.net/swish-cpcapi/api";
}

// The QR code of a payment request (no certificate needed)
function GetSwishQrUrl()
{
    return "https://mpc.getswish.net/qrg-swish/api/v1/commerce";
}

// The client certificate from Swish Certificate Management, in PEM format, with the whole chain.
// Keep the files outside the web root, e.g. "/home/hostname/swish/swish_certificate.pem".
function GetSwishCertificateFile()
{
    return "";
}

// The private key of the certificate, in PEM format (can be the same file as the certificate)
function GetSwishKeyFile()
{
    return "";
}

// The password of the private key, empty when the key has no password
function GetSwishKeyPassword()
{
    return "";
}

// The root certificate of the Swish servers (Swish_TLS_RootCA.pem from developer.swish.nu),
// empty uses the root certificates of the server
function GetSwishCaFile()
{
    return "";
}

// Swish posts the result of a payment here, must be https (port 443) with a valid certificate,
// e.g. "https://hostname.com/invoices/swishCallback.php"
function GetSwishCallbackUrl()
{
    return "";
}

// The reminders are sent from this address, e.g. "Club <ekonomi@hostname.com>"
function GetInvoiceEmailFrom()
{
    return "";
}

// The page with "My invoices", sent in the reminders, e.g. "https://hostname.com/invoices"
function GetInvoiceWebUrl()
{
    return "";
}
?>

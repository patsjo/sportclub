<?php
//############################################################
//# File:    swishCallback.php                               #
//# Created: 2026-11-17                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Swish posts the result of a payment request here         #
//# (GetSwishCallbackUrl in swishKeys.php). Anyone can post  #
//# here, so only the id is used: Swish is asked about the   #
//# payment with the client certificate, and the invoice is  #
//# paid when Swish says PAID. When Swish can't be asked the #
//# answer is an error, then Swish posts again.              #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-17  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/invoices.php");

if ($_SERVER['REQUEST_METHOD'] != 'POST' || !swishEnabled())
{
  header("HTTP/1.0 404 Not Found");
  die(0);
}

$json = file_get_contents('php://input');
$callback = json_decode($json === false ? '' : $json);
$paymentId = is_object($callback) && isset($callback->id) && is_string($callback->id) ? strtoupper($callback->id) : '';

if (isSwishPaymentId($paymentId))
{
  OpenDatabase();
  refreshSwishPayment($paymentId, true);
  CloseDatabase();
}

header("Content-Type: text/plain");
echo "OK";
?>

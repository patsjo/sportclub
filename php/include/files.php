<?php

//############################################################
//# File:    files.php                                       #
//# Created: 2005-02-11                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2005-02-11  PatSjo  Initial version                      #
//# 2005-08-28  PatSjo  Changes from Access to MySQL         #
//# 2005-12-31  PatSjo  Changes from ASP to PHP              #
//# 2021-08-21  PatSjo  Remove HTML functions                #
//############################################################

function getLongFolderName($iFolderID, $iOutput = "")
{
  if ($iFolderID == 0)
  {
    return $iOutput;
  }
  else
  {
    OpenDatabase();

    $query = sprintf("SELECT parent_folder_id, folder_name FROM folders WHERE folder_id = %d",
                     $iFolderID);
    $result = \db\mysql_query($query);
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $parent_folder_id = $row['parent_folder_id'];
      $folder_name = $row['folder_name'];
    }

    \db\mysql_free_result($result);

    if (strlen($iOutput) == 0)
    {
      return getLongFolderName($parent_folder_id, $folder_name);
    }
    else
    {
      return getLongFolderName($parent_folder_id, $folder_name . "/" . $iOutput);
    }
  }
}

function getAllChildFolderID($iFolderID, $iOutput = "")
{
  if (strlen($iOutput) == 0)
  {
    $all_child_folder_id = sprintf("%d", $iFolderID);
  }
  else
  {
    $all_child_folder_id = sprintf("%d", $iFolderID) . ", " . $iOutput;
  }

  OpenDatabase();

  $query = sprintf("SELECT folder_id FROM folders WHERE parent_folder_id = %d",
                   $iFolderID);
  $result = \db\mysql_query($query);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $all_child_folder_id = getAllChildFolderID($row['folder_id'], $all_child_folder_id);
  }

  \db\mysql_free_result($result);

  return $all_child_folder_id;
}

?>
import React from "react";
import HomeIcon from "@material-ui/icons/Home";
import MenuIcon from "@material-ui/icons/Menu";
import AddressIcon from "@material-ui/icons/People";
import CalendarIcon from "@material-ui/icons/CalendarToday";
import ScoringBoardIcon from "@material-ui/icons/FormatListNumbered";
import NewsIcon from "@material-ui/icons/ArtTrack";
import PhotoIcon from "@material-ui/icons/PhotoLibrary";

const MaterialIcon = ({ icon }) => {
  switch (icon) {
    case "HomeIcon":
      return <HomeIcon />;
    case "MenuIcon":
      return <MenuIcon />;
    case "AddressIcon":
      return <AddressIcon />;
    case "CalendarIcon":
      return <CalendarIcon />;
    case "NewsIcon":
      return <NewsIcon />;
    case "PhotoIcon":
      return <PhotoIcon />;
    case "ScoringBoardIcon":
      return <ScoringBoardIcon />;
    case "EventorIcon":
      return (
        <img
          src="https://eventor.orientering.se/Content/Images/FederationWebsiteIcon.png"
          width="24"
          height="24"
          alt="SOFT"
        />
      );
    default:
      return <div style={{ minWidth: 24, minHeight: 27 }} />;
  }
};

export default MaterialIcon;

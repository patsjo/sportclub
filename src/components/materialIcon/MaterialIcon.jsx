import React from "react";
import { Icon } from "antd";
import styled from "styled-components";

const StyledIcon = styled(Icon)`
  vertical-align: middle;
`;

const StyledImg = styled.img`
  vertical-align: middle;
`;

const MaterialIcon = ({ icon, fontSize, marginRight }) => {
  switch (icon) {
    case "HomeIcon":
      return <StyledIcon type="home" style={{ fontSize: fontSize }} />;
    case "LoginIcon":
      return <StyledIcon type="login" style={{ fontSize: fontSize }} />;
    case "LogoutIcon":
      return <StyledIcon type="logout" style={{ fontSize: fontSize }} />;
    case "MenuIcon":
      return <StyledIcon type="menu" style={{ fontSize: fontSize }} />;
    case "AddressIcon":
      return <StyledIcon type="team" style={{ fontSize: fontSize }} />;
    case "CalendarIcon":
      return <StyledIcon type="calendar" style={{ fontSize: fontSize }} />;
    case "NewsIcon":
      return <StyledIcon type="pic-right" style={{ fontSize: fontSize }} />;
    case "ResultsIcon":
      return <StyledIcon type="ordered-list" style={{ fontSize: fontSize }} />;
    case "PhotoIcon":
      return <StyledIcon type="picture" style={{ fontSize: fontSize }} />;
    case "ScoringBoardIcon":
      return <StyledIcon type="trophy" style={{ fontSize: fontSize }} />;
    case "EventorIcon":
      return (
        <StyledImg
          src="https://eventor.orientering.se/Content/Images/FederationWebsiteIcon.png"
          width={fontSize}
          height={fontSize}
          alt="SOFT"
          style={{ marginRight: marginRight }}
        />
      );
    default:
      return <StyledIcon type={icon} style={{ fontSize: fontSize }} />;
  }
};

export default MaterialIcon;

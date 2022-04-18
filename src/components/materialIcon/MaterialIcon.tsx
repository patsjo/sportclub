import {
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EuroOutlined,
  FrownOutlined,
  HomeOutlined,
  LoadingOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  OrderedListOutlined,
  PicRightOutlined,
  PictureOutlined,
  PlusOutlined,
  RollbackOutlined,
  SmileOutlined,
  StarOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import React from 'react';
import styled from 'styled-components';

const StyledImg = styled.img`
  vertical-align: middle;
`;

export type MaterialIconsType =
  | 'bank'
  | 'book'
  | 'cloud-upload'
  | 'delete'
  | 'download'
  | 'edit'
  | 'euro'
  | 'frown'
  | 'loading'
  | 'menu-fold'
  | 'menu-unfold'
  | 'plus'
  | 'rollback'
  | 'smile'
  | 'star'
  | 'team'
  | 'user'
  | 'HomeIcon'
  | 'LoginIcon'
  | 'LogoutIcon'
  | 'MenuIcon'
  | 'AddressIcon'
  | 'CalendarIcon'
  | 'NewsIcon'
  | 'ResultsIcon'
  | 'PhotoIcon'
  | 'ScoringBoardIcon'
  | 'StarsIcon'
  | 'EventorIcon';

interface IMaterialIconProps {
  icon: MaterialIconsType | React.ReactElement;
  fontSize: number;
  marginRight?: number;
}
const MaterialIcon = ({ icon, fontSize, marginRight }: IMaterialIconProps) => {
  switch (icon) {
    case 'bank':
      return <BankOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'book':
      return <BookOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'cloud-upload':
      return <CloudUploadOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'delete':
      return <DeleteOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'download':
      return <DownloadOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'edit':
      return <EditOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'euro':
      return <EuroOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'frown':
      return <FrownOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'menu-fold':
      return <MenuFoldOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'menu-unfold':
      return <MenuUnfoldOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'plus':
      return <PlusOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'rollback':
      return <RollbackOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'smile':
      return <SmileOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'star':
      return <StarOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'team':
      return <TeamOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'user':
      return <UserOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'HomeIcon':
      return <HomeOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'LoginIcon':
      return <LoginOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'LogoutIcon':
      return <LogoutOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'MenuIcon':
      return <MenuOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'AddressIcon':
      return <TeamOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'CalendarIcon':
      return <CalendarOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'NewsIcon':
      return <PicRightOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'ResultsIcon':
      return <OrderedListOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'PhotoIcon':
      return <PictureOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'ScoringBoardIcon':
      return <TrophyOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'StarsIcon':
      return <StarOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'loading':
      return <LoadingOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'EventorIcon':
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
      return icon;
  }
};

export default MaterialIcon;

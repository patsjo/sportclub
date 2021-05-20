import React, { useState, useEffect } from 'react';
import { Avatar, Button, Skeleton, message } from 'antd';
import { UserOutlined, EditOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { observer, inject } from 'mobx-react';
import CompetitorPresentationModal from './CompetitorPresentationModal';
import { PostJsonData } from '../../utils/api';

const StyledAvatar = styled(Avatar)`
  display: block;
  float: left;
  background-color: #808080;
  border-radius: 0px;
  margin-right: 16px;
  height: 92px;
  width: 92px;
  &&& .anticon svg {
    height: 88px;
    width: 70px;
  }

  @media screen and (min-width: 800px) {
    height: 64px;
    width: 64px;
    &&& .anticon svg {
      height: 60px;
      width: 44px;
    }
  }
  @media screen and (max-width: 400px) {
    height: 88px;
    width: 88px;
    &&& .anticon svg {
      height: 84px;
      width: 66px;
    }
  }
`;

const StyledImage = styled.img`
  display: block;
  float: left;
  margin-right: 16px;
  height: 92px;
  width: 92px;

  @media screen and (min-width: 800px) {
    height: 64px;
    width: 64px;
  }
  @media screen and (max-width: 400px) {
    height: 88px;
    width: 88px;
  }
`;

const StyledTitle = styled.div`
  display: block;
  font-size: 24px;
  line-height: 36px;

  @media screen and (min-width: 800px) {
    float: left;
    font-size: 32px;
    line-height: 60px;
  }
  @media screen and (max-width: 400px) {
    font-size: 20px;
    line-height: 32px;
  }
`;

const StyledAchievements = styled.div`
  display: block;
  font-size: 10px;
  font-style: italic;
  line-height: 12px;
  padding-left: 15px;
  &&& > ul {
    margin-bottom: 0;
    padding-inline-start: 108px;
  }

  @media screen and (min-width: 800px) {
    float: right;
    padding-right: ${(props) => (props.canEdit ? 42 : 6)}px;
    padding-top: 4px;
    &&& > ul {
      padding-inline-start: 15px;
    }
  }
  @media screen and (max-width: 400px) {
    &&& > ul {
      padding-inline-start: 104px;
    }
  }
`;

const StyledButton = styled(Button)`
  &&& {
    position: absolute;
    right: 4px;
    top: 4px;
  }
`;

const CompetitorTitle = inject(
  'clubModel',
  'sessionModel'
)(
  observer(({ clubModel, sessionModel, competitor }) => {
    const { t } = useTranslation();
    const [editModalIsOpen, setEditModalIsOpen] = useState(false);
    const [competitorInfo, setCompetitorInfo] = useState(undefined);
    const canEdit = sessionModel.isAdmin || sessionModel.name === competitor.name;

    useEffect(() => {
      const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;

      PostJsonData(
        url,
        {
          iType: 'COMPETITOR_INFO',
          iCompetitorId: competitor.competitorId,
        },
        true,
        sessionModel.authorizationHeader
      )
        .then(setCompetitorInfo)
        .catch((e) => {
          if (e && e.message) {
            message.error(e.message);
          }
          setCompetitorInfo({});
        });
    }, []);

    return (
      <div>
        {competitorInfo?.thumbnail ? (
          <StyledImage src={competitorInfo.thumbnail} />
        ) : (
          <StyledAvatar icon={<UserOutlined />} />
        )}
        <StyledTitle>{competitor.name}</StyledTitle>
        <StyledAchievements canEdit={canEdit}>
          <div>{t('competitor.Achievements')}</div>
          {competitorInfo ? (
            <ul>
              {competitorInfo.seniorAchievements ? (
                <li>
                  {t('competitor.Senior')}: {competitorInfo.seniorAchievements}
                </li>
              ) : null}
              {competitorInfo.juniorAchievements ? (
                <li>
                  {t('competitor.Junior')}: {competitorInfo.juniorAchievements}
                </li>
              ) : null}
              {competitorInfo.youthAchievements ? (
                <li>
                  {t('competitor.Youth')}: {competitorInfo.youthAchievements}
                </li>
              ) : null}
            </ul>
          ) : (
            <Skeleton.Button active shape="round" />
          )}
        </StyledAchievements>
        {canEdit ? <StyledButton icon={<EditOutlined />} onClick={() => setEditModalIsOpen(true)} /> : null}
        {editModalIsOpen ? (
          <CompetitorPresentationModal
            competitor={competitorInfo}
            open={editModalIsOpen}
            onClose={() => setEditModalIsOpen(false)}
            onChange={setCompetitorInfo}
          />
        ) : null}
      </div>
    );
  })
);

export default CompetitorTitle;

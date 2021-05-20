import React, { useState, useEffect } from 'react';
import { Avatar, Button, Skeleton, message } from 'antd';
import { UserOutlined, EditOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { observer, inject } from 'mobx-react';
import CompetitorPresentationModal from './CompetitorPresentationModal';
import { PostJsonData } from '../../utils/api';

const StyledAvatar = styled(Avatar)`
  &&& {
    display: block;
    float: left;
    background-color: #808080;
    border-radius: 0px;
    margin-right: 16px;
  }
`;

const StyledImage = styled.img`
  display: block;
  float: left;
  margin-right: 16px;
  width: 64px;
  height: 64px;
`;

const StyledTitle = styled.div`
  display: block;
  font-size: 32px;
  line-height: 60px;
`;

const StyledAchievements = styled.div`
  display: block;
  float: right;
  font-size: 10px;
  font-style: italic;
  padding-right: ${(props) => (props.canEdit ? 40 : 4)}px;
  padding-top: 3px;

  &&& > ul {
    margin-bottom: 0;
    padding-inline-start: 15px;
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
          <StyledAvatar size={64} icon={<UserOutlined />} />
        )}
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
        <StyledTitle>{competitor.name}</StyledTitle>
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

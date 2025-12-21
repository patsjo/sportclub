import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, message, Skeleton } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { ICompetitor, ICompetitorInfo } from '../../utils/responseCompetitorInterfaces';
import CompetitorPresentationModal from './CompetitorPresentationModal';

const StyledAvatar = styled(Avatar)`
  &&& {
    display: block;
    float: left;
    background-color: #808080;
    border-radius: 0px;
    margin-right: 16px;
    height: 92px;
    width: 92px;
  }
  &&& .anticon svg {
    height: 88px;
    width: 70px;
  }

  @media screen and (min-width: 800px) {
    &&& {
      height: 64px;
      width: 64px;
    }
    &&& .anticon svg {
      height: 60px;
      width: 44px;
    }
  }
  @media screen and (max-width: 400px) {
    &&& {
      height: 88px;
      width: 88px;
    }
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

const StyledAchievements = styled.div<{ canEdit: boolean }>`
  display: block;
  font-size: 10px;
  font-style: italic;
  line-height: 12px;
  padding-left: 15px;
  &&& > ul {
    margin-bottom: 0;
    padding-inline-start: 108px;
    padding-inline-end: 4px;
    white-space: normal;
  }

  @media screen and (min-width: 800px) {
    float: right;
    padding-right: ${props => (props.canEdit ? 42 : 6)}px;
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

interface ICompetitorTitleProps {
  competitor: ICompetitor;
}
const CompetitorTitle = observer(({ competitor }: ICompetitorTitleProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [competitorInfo, setCompetitorInfo] = useState<ICompetitorInfo | undefined>();
  const canEdit = sessionModel.isAdmin || sessionModel.name === competitor.name;

  useEffect(() => {
    const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
    if (!url) return;

    PostJsonData<ICompetitorInfo>(
      url,
      {
        iType: 'COMPETITOR_INFO',
        iCompetitorId: competitor.competitorId
      },
      true,
      sessionModel.authorizationHeader
    )
      .then(setCompetitorInfo)
      .catch(e => {
        if (e?.message) message.error(e.message);
        setCompetitorInfo(undefined);
      });
  }, [clubModel.modules, competitor.competitorId, sessionModel.authorizationHeader]);

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
      {editModalIsOpen && competitorInfo ? (
        <CompetitorPresentationModal
          name={competitor.name}
          competitorInfo={competitorInfo}
          open={editModalIsOpen}
          onClose={() => setEditModalIsOpen(false)}
          onChange={setCompetitorInfo}
        />
      ) : null}
    </div>
  );
});

export default CompetitorTitle;

import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Col, message, Row, Skeleton, theme } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { ICompetitor, ICompetitorInfo } from '../../utils/responseCompetitorInterfaces';
import CompetitorPresentationModal from './CompetitorPresentationModal';

const { useToken } = theme;

interface IBorderRadiusProps {
  'border-radius': number;
}

const StyledAvatar = styled(Avatar)<IBorderRadiusProps>`
  &&& {
    display: block;
    background-color: #808080;
    border-radius: ${props => props['border-radius']}px 0 0 0;
    height: 128px;
    width: 128px;
    min-width: 128px;
  }
  &&& .anticon svg {
    height: 128px;
    width: 96px;
  }
`;

const StyledImage = styled.img<IBorderRadiusProps>`
  display: block;
  height: 128px;
  width: 128px;
  border-radius: ${props => props['border-radius']}px 0 0 0;
`;

const StyledTitle = styled.div`
  display: block;
  font-size: 24px;
  line-height: 36px;
`;

const StyledAchievements = styled.div<{ canEdit: boolean }>`
  font-size: 10px;
  font-style: italic;
  line-height: 12px;
  &&& > ul {
    margin: 0;
    padding-inline-start: 15px;
    padding-inline-end: 4px;
    padding-right: ${props => (props.canEdit ? 42 : 6)}px;
    white-space: normal;
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
  const {
    token: { borderRadius }
  } = useToken();

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
    <Row align="top" gutter={15}>
      <Col xs={24} flex="140px">
        {competitorInfo?.thumbnail ? (
          <StyledImage src={competitorInfo.thumbnail} border-radius={borderRadius} />
        ) : (
          <StyledAvatar shape="square" icon={<UserOutlined />} border-radius={borderRadius} />
        )}
      </Col>
      <Col xs={24} flex="1">
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
      </Col>
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
    </Row>
  );
});

export default CompetitorTitle;

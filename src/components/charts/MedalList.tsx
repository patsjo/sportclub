import { TeamOutlined } from '@ant-design/icons';
import { theme, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { GetMedalListSelection, GetYears } from '../../utils/statisticsHelper';
import { IMedalListItem } from './ChartInterface';
import StatisticsYearSelect from './StatisticsYearSelect';

const medalColors: Record<number, { background: string; border: string }> = {
  1: { background: 'linear-gradient(135deg, #f9e27d 0%, #daa520 60%, #b8860b 100%)', border: '#b8860b' },
  2: { background: 'linear-gradient(135deg, #f2f2f2 0%, #c0c0c0 60%, #8f8f8f 100%)', border: '#8f8f8f' },
  3: { background: 'linear-gradient(135deg, #e3c39d 0%, #b08d57 60%, #7f5f33 100%)', border: '#7f5f33' }
};

const Wrapper = styled.div`
  display: block;
  margin: 0 8px 32px 8px;
  max-width: 1900px;
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-bottom: 4px;
  h5.ant-typography {
    margin: 0;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 8px 16px;
  margin-top: 12px;
`;

const Item = styled.div<{ $borderColor: string; $background: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid ${props => props.$borderColor};
  border-radius: 8px;
  background: ${props => props.$background};
  min-width: 0;
`;

const Badge = styled.div<{ $position: number; $color: string; $borderColor: string }>`
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  color: ${props => (medalColors[props.$position] ? '#3a2a00' : props.$color)};
  background: ${props => medalColors[props.$position]?.background ?? 'transparent'};
  border: 2px solid ${props => medalColors[props.$position]?.border ?? props.$borderColor};
  box-shadow: ${props => (medalColors[props.$position] ? 'inset 0 1px 2px rgba(255, 255, 255, 0.6)' : 'none')};
`;

const Texts = styled.div`
  min-width: 0;
  flex: 1 1 auto;
`;

const Names = styled.div`
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Members = styled.div<{ $color: string }>`
  font-size: 12px;
  color: ${props => props.$color};
`;

const Event = styled.div<{ $color: string }>`
  font-size: 12px;
  color: ${props => props.$color};
`;

const getTeamMembers = (item: IMedalListItem) =>
  item.names.map((name, idx) => (item.legs?.[idx] ? `${item.legs[idx]}. ${name}` : name)).join(', ');

interface IMedalListProps {
  data: IMedalListItem[];
}

const MedalList = ({ data }: IMedalListProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [year, setYear] = useState<number | undefined>();
  const years = useMemo(() => GetYears(data), [data]);
  const selection = useMemo(() => GetMedalListSelection(data, year), [data, year]);

  return (
    <Wrapper>
      <Header>
        <Typography.Title level={5}>{t('chart.championchipsList')}</Typography.Title>
        <StatisticsYearSelect years={years} value={year} onChange={setYear} />
        <Typography.Text type="secondary">
          {!selection.items.length
            ? t('chart.NoPlacings')
            : year !== undefined
              ? t('chart.ShowingAllTop30')
              : selection.positionLimit === 3
                ? t('chart.ShowingMedals')
                : t('chart.ShowingTop', { limit: selection.positionLimit })}
        </Typography.Text>
      </Header>
      <Grid>
        {selection.items.map(item => (
          <Item key={item.key} $borderColor={token.colorBorderSecondary} $background={token.colorBgContainer}>
            <Badge $position={item.position} $color={token.colorTextSecondary} $borderColor={token.colorBorder}>
              {item.position}
            </Badge>
            <Texts>
              {item.teamName ? (
                <>
                  <Names title={item.teamName}>
                    <TeamOutlined /> {item.teamName}
                  </Names>
                  {item.names.length ? (
                    <Members $color={token.colorTextSecondary} title={t('chart.TeamMembersHint')}>
                      {getTeamMembers(item)}
                    </Members>
                  ) : null}
                </>
              ) : (
                <Names title={item.names.join(', ')}>{item.names.join(', ')}</Names>
              )}
              <Event $color={token.colorTextSecondary}>
                {item.eventName} · {item.className} · {item.raceDate}
              </Event>
            </Texts>
          </Item>
        ))}
      </Grid>
    </Wrapper>
  );
};

export default MedalList;

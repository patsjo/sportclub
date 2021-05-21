import React from 'react';
import { Modal } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import FiveStars from './FiveStars';
import { StyledTable } from '../styled/styled';

const { info } = Modal;

const dataSource = (t, gender) => [
  {
    key: '1',
    stars: t('competitor.StarsRank'),
    star5: `Snitt av 6 bästa ranking < ${gender === 'MALE' ? '5,0' : '12,5'}`,
    star4: `Ranking < ${gender === 'MALE' ? '12,5' : '20,0'}`,
    star3: `Ranking < ${gender === 'MALE' ? '20,0' : '35,0'}`,
    star2: `Ranking < ${gender === 'MALE' ? '35,0' : '50,0'}`,
    star1: `Ranking < ${gender === 'MALE' ? '50,0' : '65,0'}`,
    star0: 'Övriga senaste året',
    nodata: '-',
  },
  {
    key: '2',
    stars: t('competitor.StarsImportant'),
    star5: 'Mer än 5,0 bättre på viktiga tävlingar',
    star4: 'Bättre på viktiga tävlingar',
    star3: 'Mindre än 5,0 sämre på viktiga tävlingar',
    star2: 'Mindre än 10,0 sämre på viktiga tävlingar',
    star1: 'Mindre än 20,0 sämre på viktiga tävlingar',
    star0: 'Mer än 20,0 sämre på viktiga tävlingar',
    nodata: 'Saknar nivåskillnad senaste två åren',
  },
  {
    key: '3',
    stars: t('competitor.StarsStability'),
    star5: 'Medelavvikelse < 3,0 baserat på högsta nivå*',
    star4: 'Medelavvikelse < 6,0 baserat på högsta nivå*',
    star3: 'Medelavvikelse < 10,0 baserat på högsta nivå*',
    star2: 'Medelavvikelse < 15,0 baserat på högsta nivå*',
    star1: 'Medelavvikelse < 20,0 baserat på högsta nivå*',
    star0: 'Medelavvikelse > 20,0 baserat på högsta nivå*',
    nodata: 'Mindre än 5 tävlingar senaste två åren',
  },
  {
    key: '4',
    stars: t('competitor.StarsTechnical'),
    star5: `Snitt av 3 bästa teknikranking < ${gender === 'MALE' ? '3,0' : '3,75'}`,
    star4: `teknikranking < ${gender === 'MALE' ? '6,5' : '7,5'}`,
    star3: `teknikranking < ${gender === 'MALE' ? '10,0' : '11,5'}`,
    star2: `teknikranking < ${gender === 'MALE' ? '17,5' : '19,0'}`,
    star1: `teknikranking < ${gender === 'MALE' ? '25,0' : '26,5'}`,
    star0: 'Övriga',
    nodata: 'Saknar sträcktider senaste två åren',
  },
  {
    key: '5',
    stars: t('competitor.StarsSpeed'),
    star5: `Snitt av 3 bästa löphastigheter < ${gender === 'MALE' ? '3,0' : '10,0'}`,
    star4: `löphastighet < ${gender === 'MALE' ? '10,0' : '17,0'}`,
    star3: `löphastighet < ${gender === 'MALE' ? '17,0' : '30,0'}`,
    star2: `löphastighet < ${gender === 'MALE' ? '30,0' : '45,0'}`,
    star1: `löphastighet < ${gender === 'MALE' ? '45,0' : '60,0'}`,
    star0: 'Övriga',
    nodata: 'Saknar sträcktider senaste två åren',
  },
  {
    key: '6',
    stars: t('competitor.StarsRelay'),
    star5: 'Mer än 5,0 bättre på stafetter',
    star4: 'Mer än 2,0 bättre på stafetter',
    star3: 'Mindre än 5,0 sämre på stafetter',
    star2: 'Mindre än 15,0 sämre på stafetter',
    star1: 'Mindre än 25,0 sämre på stafetter',
    star0: 'Mer än 25,0 sämre på stafetter',
    nodata: 'Saknar individuell/stafett senaste två åren',
  },
  {
    key: '7',
    stars: t('competitor.StarsNight'),
    star5: 'Mer än 5,0 bättre på natt',
    star4: 'Mer än 2,0 bättre på natt',
    star3: 'Mindre än 5,0 sämre på natt',
    star2: 'Mindre än 15,0 sämre på natt',
    star1: 'Mindre än 25,0 sämre på natt',
    star0: 'Mer än 25,0 sämre på natt',
    nodata: 'Saknar dag/natt senaste två åren',
  },
  {
    key: '8',
    stars: t('competitor.StarsShape'),
    star5: 'Mer än 8,0 bättre senaste månaden/två/tre',
    star4: 'Mer än 3,0 bättre senaste månaden/två/tre',
    star3: 'Mindre än 3,0 sämre senaste månaden/två/tre',
    star2: 'Mindre än 8,0 sämre senaste månaden/två/tre',
    star1: 'Mindre än 15,0 sämre senaste månaden/två/tre',
    star0: 'Mer än 15,0 sämre senaste månaden/två/tre',
    nodata: 'Saknar två tävlingar senaste månaden/två/tre eller saknar två äldre resultat senaste två åren',
  },
];

const columns = [
  {
    title: 'Stars',
    dataIndex: 'stars',
    key: 'stars',
    width: 150,
    fixed: true,
  },
  {
    title: <FiveStars key="star5" stars={5} size={25} />,
    dataIndex: 'star5',
    key: 'star5',
    width: 150,
  },
  {
    title: <FiveStars key="star4" stars={4} size={25} />,
    dataIndex: 'star4',
    key: 'star4',
    width: 150,
  },
  {
    title: <FiveStars key="star3" stars={3} size={25} />,
    dataIndex: 'star3',
    key: 'star3',
    width: 150,
  },
  {
    title: <FiveStars key="star2" stars={2} size={25} />,
    dataIndex: 'star2',
    key: 'star2',
    width: 150,
  },
  {
    title: <FiveStars key="star1" stars={1} size={25} />,
    dataIndex: 'star1',
    key: 'star1',
    width: 150,
  },
  {
    title: <FiveStars key="star0" stars={0} size={25} />,
    dataIndex: 'star0',
    key: 'star0',
    width: 150,
  },
  {
    title: <FiveStars key="nodata" stars={-1} size={25} />,
    dataIndex: 'nodata',
    key: 'nodata',
    width: 150,
  },
];

export const StarsInfoModal = (t, gender) =>
  info({
    title: `${t('competitor.Info')} - ${gender === 'MALE' ? t('results.Male') : t('results.FeMale')}`,
    icon: <StarOutlined />,
    style: { top: 20, minWidth: 800, maxWidth: 1350 },
    width: 'calc(100% - 40px)',
    content: (
      <div>
        <div>
          Allt utgår från antal minuter efter sveriges bästa herrsenior på en 75 minuters bana, oavsett om det är
          orientering, löphastighet eller orienteringsteknik.
        </div>
        <div>OBS! Om man är inloggad kan man även lägga upp foto och meriter på sig själv.</div>
        <div>
          * Nivå - Grupp 1: VM, SM, Swedish league, Elitstafett, SM-Kval, Grupp 2: Nationella, Grupp 3: Närtävlingar, KM
        </div>
        <StyledTable
          dataSource={dataSource(t, gender)}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ x: 0 }}
        />
      </div>
    ),
  });

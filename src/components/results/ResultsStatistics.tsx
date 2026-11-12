import { message, Spin } from 'antd';
import { observer } from 'mobx-react';
import React, { useRef, useState } from 'react';
import { styled } from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { HasCoordinates } from '../../utils/statisticsHelper';
import { useSize } from '../../utils/useSize';
import { IStatistics } from '../charts/ChartInterface';
import CustomLineChart from '../charts/CustomLineChart';
import CustomStackedBarChart from '../charts/CustomStackedBarChart';
import GeographicHeatmap from '../charts/GeographicHeatmap';
import MedalList from '../charts/MedalList';
import { SpinnerDiv } from '../styled/styled';

const Row = styled.div`
  display: block;
  width: calc(100% - 20px);
`;

const hasData = (statistics: IStatistics): boolean => {
  switch (statistics.typeOfChart) {
    case 'medallist':
      return statistics.data.length > 0;
    case 'heatmap':
      return statistics.data.some(HasCoordinates);
    default:
      return (
        statistics.data.length > 0 && statistics.data.some(d => statistics.valueKeys.some(valueKey => !!d[valueKey]))
      );
  }
};

const ResultsStatistics = observer(() => {
  const ref = useRef<HTMLDivElement>(null);
  const { width } = useSize(ref, true, false);
  const { clubModel } = useMobxStore();
  const [chartData, setChartData] = useState<IStatistics[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
    if (!url) return;

    PostJsonData<IStatistics[]>(
      url,
      {
        iType: 'STATISTICS'
      },
      true
    )
      .then(statistics => {
        setChartData(statistics?.filter(hasData) ?? []);
        setLoading(false);
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
      });
  }, [clubModel.modules]);

  return (
    <Row ref={ref}>
      {!loading ? (
        chartData.map(chart =>
          chart.typeOfChart === 'line' ? (
            <CustomLineChart
              key={chart.title}
              totalWidth={width}
              maxWidth={chart.title === 'startsPerYear' ? undefined : 1900}
              {...chart}
            />
          ) : chart.typeOfChart === 'stackedbar' ? (
            <CustomStackedBarChart
              key={chart.title}
              totalWidth={width}
              maxWidth={chart.title === 'startsPerYear' ? undefined : 1900}
              {...chart}
            />
          ) : chart.typeOfChart === 'heatmap' ? (
            <GeographicHeatmap key={chart.title} data={chart.data} />
          ) : chart.typeOfChart === 'medallist' ? (
            <MedalList key={chart.title} data={chart.data} />
          ) : null
        )
      ) : (
        <SpinnerDiv>
          <Spin size="large" />
        </SpinnerDiv>
      )}
    </Row>
  );
});

export default ResultsStatistics;

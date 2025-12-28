import { message, Spin } from 'antd';
import { observer } from 'mobx-react';
import React, { useRef, useState } from 'react';
import { styled } from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { useSize } from '../../utils/useSize';
import { ICustomChart } from '../charts/ChartInterface';
import CustomLineChart from '../charts/CustomLineChart';
import CustomStackedBarChart from '../charts/CustomStackedBarChart';
import { SpinnerDiv } from '../styled/styled';

const Row = styled.div`
  display: block;
  width: calc(100% - 20px);
`;

const ResultsStatistics = observer(() => {
  const ref = useRef<HTMLDivElement>(null);
  const { width } = useSize(ref, true, false);
  const { clubModel } = useMobxStore();
  const [chartData, setChartData] = useState<ICustomChart[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
    if (!url) return;

    PostJsonData<ICustomChart[]>(
      url,
      {
        iType: 'STATISTICS'
      },
      true
    )
      .then(statistics => {
        setChartData(
          statistics?.filter(
            chart => chart.data.length && chart.data.some(d => chart.valueKeys.some(valueKey => !!d[valueKey]))
          ) ?? []
        );
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

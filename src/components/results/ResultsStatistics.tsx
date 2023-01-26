import { message, Spin } from 'antd';
import { ICustomChart } from 'components/charts/ChartInterface';
import CustomLineChart from 'components/charts/CustomLineChart';
import CustomStackedBarChart from 'components/charts/CustomStackedBarChart';
import { observer } from 'mobx-react';
import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { useSize } from 'utils/useSize';
import { PostJsonData } from '../../utils/api';
import { SpinnerDiv } from '../styled/styled';

const Row = styled.div`
  display: block;
  width: calc(100% - 20px);
`;

const ResultsStatistics = observer(() => {
  const ref = useRef<HTMLDivElement>(null);
  const { width } = useSize(ref, ['width']);
  const { clubModel } = useMobxStore();
  const [chartData, setChartData] = useState<ICustomChart[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
    if (!url) return;

    PostJsonData(
      url,
      {
        iType: 'STATISTICS',
      },
      true
    )
      .then((statistics: ICustomChart[]) => {
        setChartData(statistics);
        setLoading(false);
      })
      .catch((e) => {
        message.error(e.message);
      });
  }, []);

  return (
    <Row ref={ref}>
      {!loading ? (
        chartData.map((chart) =>
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

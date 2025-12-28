import { Typography } from 'antd';
import { ParseKeys } from 'i18next';
import { observer } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { Col, getWidth, ICustomChartProps, paletteColors } from './ChartInterface';

const CustomStackedBarChart = observer(
  ({ totalWidth, maxWidth, data, dataKey, valueKeys, valueColors, title }: ICustomChartProps) => {
    const { t } = useTranslation();
    const width = getWidth(data.length, maxWidth, totalWidth);

    return (
      <Col width={!maxWidth ? '100%' : `${width}px`}>
        <Typography.Title level={5}>{t(`chart.${title}`)}</Typography.Title>
        <BarChart
          height={300}
          width={width}
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 10
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey={dataKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {valueKeys
            .map((valueKey, idx) => ({ valueKey, idx }))
            .filter(({ valueKey }) =>
              data.some(d => typeof d[valueKey] === 'number' && !isNaN(d[valueKey]) && d[valueKey] > 0)
            )
            .map(({ valueKey, idx }) => (
              <Bar
                key={valueKey}
                type="monotone"
                dataKey={valueKey}
                stackId={dataKey}
                name={t(`chart.${valueKey}` as ParseKeys) ?? undefined}
                fill={
                  valueColors && valueColors.length > idx ? valueColors[idx] : paletteColors[idx % paletteColors.length]
                }
              />
            ))}
        </BarChart>
      </Col>
    );
  }
);
export default CustomStackedBarChart;

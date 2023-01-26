import { Typography } from 'antd';
import { observer } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Col, getWidth, ICustomChartProps, paletteColors } from './ChartInterface';

const CustomLineChart = observer(
  ({ totalWidth, maxWidth, data, dataKey, valueKeys, valueColors, title }: ICustomChartProps) => {
    const { t } = useTranslation();
    const width = getWidth(data.length, maxWidth, totalWidth);

    return (
      <Col width={!maxWidth ? '100%' : `${width}px`}>
        <Typography.Title level={5}>{t(`chart.${title}`)}</Typography.Title>
        <LineChart
          height={300}
          width={width}
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey={dataKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {valueKeys
            .map((valueKey, idx) => ({ valueKey, idx }))
            .filter(({ valueKey }) => data.some((d) => d[valueKey] > 0))
            .map(({ valueKey, idx }) => (
              <Line
                type="monotone"
                dataKey={valueKey}
                name={t(`chart.${valueKey}`) ?? undefined}
                stroke={
                  valueColors && valueColors.length > idx ? valueColors[idx] : paletteColors[idx % paletteColors.length]
                }
                activeDot={{ r: idx === 0 ? 8 : 4 }}
              />
            ))}
        </LineChart>
      </Col>
    );
  }
);
export default CustomLineChart;

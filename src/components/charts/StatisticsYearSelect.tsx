import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

const AllYears = -1;

interface IStatisticsYearSelectProps {
  years: number[];
  value?: number;
  onChange: (year?: number) => void;
}

const StatisticsYearSelect = ({ years, value, onChange }: IStatisticsYearSelectProps) => {
  const { t } = useTranslation();

  return (
    <Select<number>
      style={{ width: 120 }}
      value={value ?? AllYears}
      options={[{ value: AllYears, label: t('chart.AllYears') }, ...years.map(year => ({ value: year, label: year }))]}
      onChange={year => onChange(year === AllYears ? undefined : year)}
    />
  );
};

export default StatisticsYearSelect;

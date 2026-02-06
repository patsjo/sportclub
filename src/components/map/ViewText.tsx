import { Typography } from 'antd';

interface IViewTextProps {
  value?: string;
  endValue?: string;
  smallEndValue?: string;
  type?: 'header' | 'normal' | 'description';
}

const ViewText = ({ value, endValue, smallEndValue, type = 'normal' }: IViewTextProps) => (
  <Typography.Text
    style={{
      fontSize: type === 'header' ? 24 : type === 'description' ? 14 : 16,
      fontWeight: type === 'header' ? 'bold' : 'normal'
    }}
    italic={type === 'description'}
  >
    {value}
    {endValue ? ` - ${endValue}` : ''}
    <Typography.Text
      italic
      style={{
        fontSize: type === 'header' ? 16 : type === 'description' ? 10 : 12,
        fontWeight: 'normal',
        verticalAlign: 5
      }}
    >
      {smallEndValue ? ` (${smallEndValue})` : ''}
    </Typography.Text>
  </Typography.Text>
);

export default ViewText;

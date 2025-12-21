import { Select, SelectProps } from 'antd';
import { IOption } from '../../utils/formHelper';

interface IFormSelectProps extends Omit<SelectProps, 'options'> {
  options: IOption[];
}
export const FormSelect = ({ options, ...props }: IFormSelectProps) => {
  return <Select {...props} options={options.map(option => ({ value: option.code, label: option.description }))} />;
};

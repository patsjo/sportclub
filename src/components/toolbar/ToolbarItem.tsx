import { styled } from 'styled-components';
import MaterialIcon, { MaterialIconsType } from '../materialIcon/MaterialIcon';

interface IToolbarItemHolderProps {
  disabled?: boolean;
}
const ToolbarItemHolder = styled.div<IToolbarItemHolderProps>`
  & {
    display: ${({ disabled }) => (disabled ? 'none' : 'inline-block')};
    cursor: pointer;
    min-width: 46px;
    height: 46px;
    line-height: 20px;
    text-align: center;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    padding: 5px;
    margin-left: 10px;
    margin-top: 9px;
    margin-bottom: 9px;
  }
  &:hover {
    background-color: rgba(0, 0, 0, 0.4);
  }
`;

const MaterialIconText = styled.div`
  margin-top: 2px;
  line-height: 10px;
  font-size: 10px;
  white-space: nowrap;
`;

interface IToolbarItemProps {
  icon: MaterialIconsType;
  name: string;
  onClick: () => void;
  disabled?: boolean;
}
const ToolbarItem = ({ icon, name, onClick, disabled }: IToolbarItemProps) => (
  <ToolbarItemHolder disabled={disabled} onClick={onClick}>
    <MaterialIcon icon={icon} fontSize={20} />
    <MaterialIconText>{name}</MaterialIconText>
  </ToolbarItemHolder>
);

export default ToolbarItem;

import { DeleteTwoTone, EditTwoTone, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Table, Tag } from 'antd';
import type { TableProps } from 'antd/lib/table';
import { TFunction } from 'i18next';
import { MouseEventHandler } from 'react';
import { styled } from 'styled-components';

const StyledDeleteTwoTone = styled(DeleteTwoTone)`
  &&& {
    margin-right: 8px;
    font-size: 20px;
  }
`;

const StyledEditTwoTone = styled(EditTwoTone)`
  &&& {
    margin-right: 8px;
    font-size: 20px;
  }
`;

const StyledPlusOutlined = styled(PlusOutlined)`
  &&& {
    margin-right: 8px;
    font-size: 20px;
  }
`;

const StyledUploadOutlined = styled(UploadOutlined)`
  &&& {
    margin-right: 8px;
    font-size: 20px;
  }
`;

export const MissingTag = ({ t }: { t: TFunction }) => {
  return <Tag color="volcano">{t('error.Missing')}</Tag>;
};

export const NoWrap = styled.div`
  white-space: nowrap;
`;

interface ISpinnerDivProps {
  visible?: boolean;
}

export const SpinnerDiv = styled.div<ISpinnerDivProps>`
  display: ${({ visible = true }) => (visible ? 'block' : 'none')};
  text-align: center;
  width: 100%;
`;

interface IStyledIconProps {
  type: 'delete' | 'edit' | 'plus' | 'upload';
  onClick?: MouseEventHandler | undefined;
}
export const StyledIcon = ({ type, ...props }: IStyledIconProps) => {
  switch (type) {
    case 'delete':
      return <StyledDeleteTwoTone {...props} />;
    case 'edit':
      return <StyledEditTwoTone {...props} />;
    case 'plus':
      return <StyledPlusOutlined {...props} />;
    case 'upload':
      return <StyledUploadOutlined {...props} />;
    default:
      return null;
  }
};

export interface IStyledTableProps<RecordType> extends TableProps<RecordType> {
  minWidth?: number;
}

export const StyledTable = styled(Table)<{ minWidth?: number }>`
  .table-row-red,
  .table-row-red:hover,
  .table-row-red:hover > td,
  .table-row-red:hover > td.ant-table-cell-row-hover {
    background-color: #ffccc7;
  }
  &&& {
    margin-top: 8px;
    min-width: ${({ minWidth }) => (minWidth ? `${minWidth}px` : 'unset')};
  }
  &&& .ant-table-scroll > .ant-table-body {
    overflow-x: auto !important;
  }
  &&& .ant-table-pagination.ant-pagination {
    margin-top: 8px;
    margin-bottom: 0;
  }
  &&& .ant-table-thead > tr > th,
  .ant-table-tbody > tr > td,
  .ant-table-summary > tr > td {
    padding: 4px 8px !important;
  }
  &&& .ant-table-thead > tr > th,
  .ant-table-summary > tr > td {
    background: #fafafa !important;
    font-weight: 600;
  }
  &&& .ant-table-cell-ellipsis {
    max-width: 250px;
  }
` as <T extends object>(props: IStyledTableProps<T>) => JSX.Element;

import { DownOutlined, FileZipOutlined, PrinterOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Dropdown, Menu, Modal, Progress, Spin } from 'antd';
import { SpinnerDiv } from 'components/styled/styled';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { IPrintSettings, IPrintSettingsColumn } from 'utils/responseInterfaces';
import { TableSettingModal, getLocalStorage } from './TableSettingModal';

const ButtonsContainer = styled.div`
  min-width: 150px;
`;

interface ITablePrintSettingButtonsProps {
  localStorageName: 'resultFees' | 'results';
  columns: IPrintSettingsColumn[];
  disablePrint: boolean;
  disablePrintAll: boolean;
  processed: number;
  total: number;
  spinnerTitle: string | null;
  spinnerText: string | null;
  onAbortLoading: () => void;
  onPrint: (settings: IPrintSettings) => Promise<void>;
  onPrintAll?: (settings: IPrintSettings, allInOnePdf: boolean) => Promise<void>;
  onTableColumns: React.Dispatch<React.SetStateAction<IPrintSettingsColumn[]>>;
}

const TablePrintSettingButtons = ({
  localStorageName,
  columns,
  disablePrint,
  disablePrintAll,
  processed,
  total,
  spinnerTitle,
  spinnerText,
  onAbortLoading,
  onPrint,
  onPrintAll,
  onTableColumns,
}: ITablePrintSettingButtonsProps) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<IPrintSettings>(getLocalStorage(localStorageName, columns));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onTableColumns(settings.table.columns);
  }, [settings]);

  const onCancel = () => {
    setLoading(false);
    onAbortLoading();
  };

  const printAllmenu = (
    <Menu>
      <Menu.Item
        key="allInOnePdf"
        icon={<PrinterOutlined />}
        onClick={() => {
          setLoading(true);
          onPrintAll &&
            onPrintAll(settings, true)
              .then(() => setLoading(false))
              .catch(() => setLoading(false));
        }}
      >
        {t('common.AllInOnePdf')}
      </Menu.Item>
      <Menu.Item
        key="allDividedInZip"
        icon={<FileZipOutlined />}
        onClick={() => {
          setLoading(true);
          onPrintAll &&
            onPrintAll(settings, false)
              .then(() => setLoading(false))
              .catch(() => setLoading(false));
        }}
      >
        {t('common.AllDividedInZip')}
      </Menu.Item>
    </Menu>
  );

  return (
    <ButtonsContainer>
      <Button
        icon={<PrinterOutlined />}
        disabled={disablePrint}
        style={{ marginRight: 5 }}
        loading={loading}
        onClick={() => {
          setLoading(true);
          onPrint(settings)
            .then(() => setLoading(false))
            .catch(() => setLoading(false));
        }}
      />
      {onPrintAll && !disablePrintAll && !loading ? (
        <Dropdown overlay={printAllmenu} placement="bottomLeft">
          <Button style={{ marginRight: 5 }} disabled={disablePrintAll} loading={loading}>
            {t('common.All')} <DownOutlined />
          </Button>
        </Dropdown>
      ) : onPrintAll ? (
        <Button style={{ marginRight: 5 }} disabled={disablePrintAll} loading={loading}>
          {t('common.All')} <DownOutlined />
        </Button>
      ) : null}
      <Button
        icon={<SettingOutlined />}
        onClick={() =>
          TableSettingModal(t, localStorageName, columns).then((value) => {
            setSettings(value);
          })
        }
      />
      <Modal
        title={spinnerTitle}
        open={loading && total > 0}
        onCancel={onCancel}
        okButtonProps={{ hidden: true }}
        maskClosable={false}
      >
        {total > 0 ? (
          <SpinnerDiv>
            <Progress type="circle" percent={(100 * processed) / total} format={() => `${processed}/${total}`} />
            <div>{spinnerText}...</div>
            <Spin size="large" />
          </SpinnerDiv>
        ) : null}
      </Modal>
    </ButtonsContainer>
  );
};

export default TablePrintSettingButtons;

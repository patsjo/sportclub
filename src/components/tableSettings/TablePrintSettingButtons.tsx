import { DownOutlined, FileZipOutlined, PrinterOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Dropdown, Menu } from 'antd';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { IPrintSettings, IPrintSettingsColumn } from 'utils/responseInterfaces';
import { getLocalStorage, TableSettingModal } from './TableSettingModal';

const ButtonsContainer = styled.div`
  min-width: 150px;
`;

interface ITablePrintSettingButtonsProps {
  localStorageName: string;
  columns: IPrintSettingsColumn[];
  disablePrint: boolean;
  disablePrintAll: boolean;
  onPrint: (settings: IPrintSettings) => Promise<void>;
  onPrintAll?: (settings: IPrintSettings, allInOnePdf: boolean) => Promise<void>;
  onTableColumns: React.Dispatch<React.SetStateAction<IPrintSettingsColumn[]>>;
}

const TablePrintSettingButtons = ({
  localStorageName,
  columns,
  disablePrint,
  disablePrintAll,
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
      {onPrintAll ? (
        <Dropdown overlay={printAllmenu} placement="bottomLeft">
          <Button style={{ marginRight: 5 }} disabled={disablePrintAll} loading={loading}>
            {t('common.All')} <DownOutlined />
          </Button>
        </Dropdown>
      ) : null}
      <Button
        icon={<SettingOutlined />}
        onClick={() =>
          TableSettingModal(t, localStorageName, columns).then((value) => {
            setSettings(value);
          })
        }
      />
    </ButtonsContainer>
  );
};

export default TablePrintSettingButtons;

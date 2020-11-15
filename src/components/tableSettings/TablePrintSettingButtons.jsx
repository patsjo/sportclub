import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { PrinterOutlined, SettingOutlined } from '@ant-design/icons';
import { getLocalStorage, TableSettingModal } from './TableSettingModal';
import styled from 'styled-components';

const ButtonsContainer = styled.div`
  min-width: 150px;
`;

const TablePrintSettingButtons = ({
  localStorageName,
  columns,
  disablePrint,
  disablePrintAll,
  onPrint,
  onPrintAll,
  onTableColumns,
}) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(getLocalStorage(localStorageName, columns));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onTableColumns(settings.table.columns);
  }, [settings]);

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
        <Button
          icon={<PrinterOutlined />}
          disabled={disablePrintAll}
          style={{ marginRight: 5 }}
          loading={loading}
          onClick={() => {
            setLoading(true);
            onPrintAll(settings)
              .then(() => setLoading(false))
              .catch(() => setLoading(false));
          }}
        >
          {t('common.All')}
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
    </ButtonsContainer>
  );
};

export default TablePrintSettingButtons;

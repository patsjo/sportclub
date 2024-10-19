import { SettingOutlined } from '@ant-design/icons';
import { InputNumber, Modal, Radio, Switch, Table, Tabs } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { TFunction } from 'i18next';
import styled from 'styled-components';
import { IPrintSettings, IPrintSettingsColumn } from 'utils/responseInterfaces';

const { confirm } = Modal;
const { TabPane } = Tabs;
const Label = styled.div`
  margin-bottom: 2px;
`;
const RadioGroup = styled(Radio.Group)`
  &&& {
    margin-bottom: 8px;
  }
`;
const StyledInputNumber = styled(InputNumber)`
  &&& {
    width: 60px;
    margin-right: 4px;
  }
`;

const setLocalStorage = (localStorageName: 'resultFees' | 'results', settings: IPrintSettings) => {
  localStorage.setItem(`${localStorageName}TableData`, JSON.stringify(settings));
};

export const getLocalStorage = (
  localStorageName: 'resultFees' | 'results',
  columns: IPrintSettingsColumn[]
): IPrintSettings => {
  let tableData: IPrintSettings | undefined = undefined;
  try {
    const tableDataString = localStorage.getItem(`${localStorageName}TableData`);
    if (tableDataString) {
      tableData = JSON.parse(tableDataString) as IPrintSettings;
      tableData.table.columns = columns.map((col) => {
        const storedValue = tableData?.table.columns.find((c) => c.key === col.key);
        return storedValue ? storedValue : { key: col.key, title: col.title, selected: col.selected };
      });
      tableData.pdf.columns = columns.map((col) => {
        const storedValue = tableData?.pdf.columns.find((c) => c.key === col.key);
        return storedValue ? storedValue : { key: col.key, title: col.title, selected: col.selected };
      });
    }
  } catch (error) {
    console.error(error);
  }

  if (!tableData || !tableData.table || !tableData.pdf) {
    tableData = {
      table: {
        columns: columns.map((col) => ({ key: col.key, title: col.title, selected: col.selected })),
      },
      pdf: {
        pageOrientation: 'portrait',
        // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
        pageMargins: localStorageName === 'resultFees' ? [25, 20, 20, 20] : [15, 10, 10, 10],
        pageSize: 'A4',
        columns:
          localStorageName === 'resultFees'
            ? []
            : columns.map((col) => ({ key: col.key, title: col.title, selected: col.selected })),
      },
    };
  }

  if (!tableData.pdf.pageOrientation) tableData.pdf.pageOrientation = 'portrait';
  if (!tableData.pdf.pageMargins) tableData.pdf.pageMargins = [15, 10, 10, 10];
  if (!tableData.pdf.pageSize) tableData.pdf.pageSize = 'A4';

  return tableData;
};

const selectColumns: ColumnsType<IPrintSettingsColumn> = [
  {
    dataIndex: 'selected',
    key: 'selected',
    render: (value, record) => <Switch defaultChecked={value} onChange={(val) => (record.selected = val)} />,
  },
  {
    dataIndex: 'title',
    key: 'title',
  },
];

export const TableSettingModal = (
  t: TFunction,
  localStorageName: 'resultFees' | 'results',
  columns: IPrintSettingsColumn[]
): Promise<IPrintSettings> =>
  new Promise((resolve, reject) => {
    const settings = getLocalStorage(localStorageName, columns);
    confirm({
      title: `${t('common.Table')}/${t('common.PDF')}`,
      style: { top: 40 },
      icon: <SettingOutlined />,
      content: (
        <Tabs defaultActiveKey="tableTab">
          <TabPane tab={t('common.Table')} key="tableTab">
            <Table
              showHeader={false}
              pagination={false}
              scroll={{ y: 'calc(100vh - 295px)' }}
              columns={selectColumns}
              dataSource={settings.table.columns}
            />
          </TabPane>
          <TabPane tab={t('common.PDF')} key="pdfTab">
            <RadioGroup
              defaultValue={settings.pdf.pageOrientation}
              buttonStyle="solid"
              onChange={(e) => (settings.pdf.pageOrientation = e.target.value)}
            >
              <Radio.Button value="portrait">{t('common.Portrait')}</Radio.Button>
              <Radio.Button value="landscape">{t('common.Landscape')}</Radio.Button>
            </RadioGroup>
            <RadioGroup
              defaultValue={settings.pdf.pageSize}
              style={{ marginLeft: 24 }}
              buttonStyle="solid"
              onChange={(e) => (settings.pdf.pageSize = e.target.value)}
            >
              <Radio.Button value="A3">A3</Radio.Button>
              <Radio.Button value="A4">A4</Radio.Button>
            </RadioGroup>
            <Label>{t('common.MarginsLabel')}</Label>
            {[0, 1, 2, 3].map((index) => (
              <StyledInputNumber
                min={5}
                max={50}
                step={5}
                defaultValue={settings.pdf.pageMargins[index]}
                onChange={(value) => value && (settings.pdf.pageMargins[index] = value as number)}
              />
            ))}
            <Label />
            {localStorageName !== 'resultFees' ? (
              <Table
                showHeader={false}
                pagination={false}
                scroll={{ y: 'calc(100vh - 393px)' }}
                columns={selectColumns}
                dataSource={settings.pdf.columns}
              />
            ) : null}
          </TabPane>
        </Tabs>
      ),
      okText: t('common.Save'),
      cancelText: t('common.Cancel'),
      onOk() {
        setLocalStorage(localStorageName, settings);
        resolve(settings);
      },
      onCancel() {
        reject();
      },
    });
  });

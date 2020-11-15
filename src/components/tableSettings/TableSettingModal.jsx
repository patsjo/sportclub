import React from 'react';
import { InputNumber, Modal, Radio, Switch, Table, Tabs } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import styled from 'styled-components';

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

const setLocalStorage = (localStorageName, settings) => {
  localStorage.setItem(`${localStorageName}TableData`, JSON.stringify(settings));
};

export const getLocalStorage = (localStorageName, columns) => {
  let tableData;
  try {
    tableData = JSON.parse(localStorage.getItem(`${localStorageName}TableData`));
    tableData.table.columns = columns.map((col) => {
      const storedValue = tableData.table.columns.find((c) => c.key === col.key);
      return storedValue ? storedValue : { key: col.key, title: col.title, selected: col.selected };
    });
    tableData.pdf.columns = columns.map((col) => {
      const storedValue = tableData.pdf.columns.find((c) => c.key === col.key);
      return storedValue ? storedValue : { key: col.key, title: col.title, selected: col.selected };
    });
  } catch (error) {}

  if (!tableData || !tableData.table || !tableData.pdf) {
    tableData = {
      table: {
        columns: columns.map((col) => ({ key: col.key, title: col.title, selected: col.selected })),
      },
      pdf: {
        pageOrientation: 'portrait',
        // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
        pageMargins: [15, 10, 10, 10],
        pageSize: 'A4',
        columns: columns.map((col) => ({ key: col.key, title: col.title, selected: col.selected })),
      },
    };
  }

  if (!tableData.pdf.pageOrientation) tableData.pdf.pageOrientation = 'portrait';
  if (!tableData.pdf.pageMargins) tableData.pdf.pageMargins = [15, 10, 10, 10];
  if (!tableData.pdf.pageSize) tableData.pdf.pageSize = 'A4';

  return tableData;
};

const selectColumns = [
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

export const TableSettingModal = (t, localStorageName, columns) =>
  new Promise((resolve, reject) => {
    const settings = getLocalStorage(localStorageName, columns);
    let confirmModal;
    confirmModal = confirm({
      title: `${t('common.Table')}/${t('common.PDF')}`,
      icon: <SettingOutlined />,
      content: (
        <Tabs defaultActiveKey="tableTab">
          <TabPane tab={t('common.Table')} key="tableTab">
            <Table
              showHeader={false}
              pagination={false}
              scroll={false}
              columns={selectColumns}
              dataSource={settings.table.columns}
            />
          </TabPane>
          <TabPane tab={t('common.PDF')} key="pdfTab">
            <RadioGroup
              defaultValue={settings.pdf.pageOrientation}
              onChange={(e) => (settings.pdf.pageOrientation = e.target.value)}
            >
              <Radio.Button value="portrait">{t('common.Portrait')}</Radio.Button>
              <Radio.Button value="landscape">{t('common.Landscape')}</Radio.Button>
            </RadioGroup>
            <Label>{t('common.MarginsLabel')}</Label>
            {[0, 1, 2, 3].map((index) => (
              <StyledInputNumber
                min={5}
                max={50}
                step={5}
                defaultValue={settings.pdf.pageMargins[index]}
                onChange={(value) => (settings.pdf.pageMargins[index] = value)}
              />
            ))}
            <Label />
            <RadioGroup defaultValue={settings.pdf.pageSize} onChange={(e) => (settings.pdf.pageSize = e.target.value)}>
              <Radio.Button value="A3">A3</Radio.Button>
              <Radio.Button value="A4">A4</Radio.Button>
            </RadioGroup>
            <Table
              showHeader={false}
              pagination={false}
              scroll={false}
              columns={selectColumns}
              dataSource={settings.pdf.columns}
            />
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

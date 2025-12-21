import { message, Spin, Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { TableRowSelection } from 'antd/lib/table/interface';
import { observer } from 'mobx-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { IEventViewResultResponse } from '../../utils/responseInterfaces';
import { useResultWizardStore } from '../../utils/resultWizardStore';
import { SpinnerDiv, StyledTable } from '../styled/styled';

interface IInvoiceEvent extends IEventViewResultResponse {
  key: string;
}

interface IInvoiceWizardStep1ChooseRaceProps {
  height: number;
  visible: boolean;
  onValidate: (valid: boolean) => void;
  onFailed?: () => void;
}
const InvoiceWizardStep1ChooseRace = observer(
  ({ height, visible, onValidate, onFailed }: IInvoiceWizardStep1ChooseRaceProps) => {
    const { t } = useTranslation();
    const { clubModel, sessionModel } = useMobxStore();
    const { raceWizardModel } = useResultWizardStore();
    const [loaded, setLoaded] = useState(false);
    const [events, setEvents] = useState<IInvoiceEvent[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>();
    const [totalFee, setTotalFee] = useState(0);
    const [totalFeeToClub, setTotalFeeToClub] = useState(0);
    const [totalServiceFeeToClub, setTotalServiceFeeToClub] = useState(0);

    const onSelectChange = useCallback(
      (keys: React.Key[]) => {
        const selectedEventId = Array.isArray(keys) ? keys[0] : keys;

        raceWizardModel.setNumberValueOrNull(
          'selectedEventId',
          selectedEventId != null ? parseInt(selectedEventId as string) : null
        );
        setSelectedRowKeys(keys);
        onValidate(true);
      },
      [onValidate, raceWizardModel]
    );

    useEffect(() => {
      const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
      if (!url) return;

      const queryData = {
        iType: 'EVENTS',
        iIncludeFees: true,
        iClubId: clubModel.raceClubs?.selectedClub?.clubId,
        iFromDate: raceWizardModel.queryStartDate,
        iToDate: raceWizardModel.queryEndDate
      };

      PostJsonData<IEventViewResultResponse[]>(url, queryData, true, sessionModel.authorizationHeader)
        .then(eventsJson => {
          let events = eventsJson ? eventsJson : [];
          if (!raceWizardModel.queryIncludeExisting) {
            events = events.filter(e => !e.invoiceVerified);
          }
          const data = events
            .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0))
            .map(event => ({ ...event, key: event.eventId.toString() }));

          setSelectedRowKeys(undefined);
          setEvents(data);
          setTotalFee(
            data.reduce((a, b) => {
              return a + (b.fee ?? 0);
            }, 0)
          );
          setTotalFeeToClub(
            data.reduce((a, b) => {
              return a + (b.feeToClub ?? 0);
            }, 0)
          );
          setTotalServiceFeeToClub(
            data.reduce((a, b) => {
              return a + (b.serviceFeeToClub ?? 0);
            }, 0)
          );
          setLoaded(true);
        })
        .catch(e => {
          if (e?.message) message.error(e.message);
          onFailed?.();
        });
    }, [
      clubModel.modules,
      clubModel.raceClubs?.selectedClub?.clubId,
      onFailed,
      raceWizardModel.queryEndDate,
      raceWizardModel.queryIncludeExisting,
      raceWizardModel.queryStartDate,
      sessionModel.authorizationHeader
    ]);

    useEffect(() => {
      setSelectedRowKeys([]);
      setEvents(oldEvents =>
        raceWizardModel.queryIncludeExisting
          ? oldEvents.map(
              (e): IInvoiceEvent => ({
                ...e,
                invoiceVerified: e.invoiceVerified || raceWizardModel.importedIds.includes(e.eventId)
              })
            )
          : oldEvents.filter(e => !raceWizardModel.importedIds.includes(e.eventId))
      );
    }, [raceWizardModel.importedIds, raceWizardModel.importedIds.length, raceWizardModel.queryIncludeExisting]);

    const rowSelection: TableRowSelection<IInvoiceEvent> = {
      selectedRowKeys,
      fixed: true,
      onChange: onSelectChange,
      type: 'radio'
    };
    const columns: ColumnType<IInvoiceEvent>[] = [
      {
        title: t('results.Date'),
        dataIndex: 'date',
        key: 'date',
        ellipsis: true,
        width: 100,
        fixed: 'left'
      },
      {
        title: t('results.Time'),
        dataIndex: 'time',
        key: 'time',
        ellipsis: true,
        width: 80,
        fixed: 'left'
      },
      {
        title: t('results.Name'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        width: 200,
        fixed: 'left'
      },
      {
        title: t('results.InvoiceAlreadyVerified'),
        dataIndex: 'invoiceVerified',
        key: 'invoiceVerified',
        render: (invoiceVerified: boolean) => (invoiceVerified ? t('common.Yes') : t('common.No')),
        ellipsis: true,
        width: 120
      },
      {
        title: t('results.EventFee'),
        dataIndex: 'fee',
        key: 'fee',
        ellipsis: true,
        width: 120
      },
      {
        title: t('results.FeeToClub'),
        dataIndex: 'feeToClub',
        key: 'feeToClub',
        ellipsis: true,
        width: 120
      },
      {
        title: t('results.ServiceFeeToClub'),
        dataIndex: 'serviceFeeToClub',
        key: 'serviceFeeToClub',
        ellipsis: true,
        width: 120
      }
    ];

    return loaded && visible ? (
      <StyledTable
        rowSelection={rowSelection}
        columns={columns}
        dataSource={events}
        pagination={{ pageSize: Math.trunc((height - 128) / 32), hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: true }}
        tableLayout="fixed"
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} />
              <Table.Summary.Cell index={1}>Total</Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
              <Table.Summary.Cell index={3} />
              <Table.Summary.Cell index={4} />
              <Table.Summary.Cell index={5}>{totalFee}</Table.Summary.Cell>
              <Table.Summary.Cell index={6}>{totalFeeToClub}</Table.Summary.Cell>
              <Table.Summary.Cell index={7}>{totalServiceFeeToClub}</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
        size="middle"
        onRow={record => {
          return {
            onClick: () => onSelectChange([(record as IInvoiceEvent).key])
          };
        }}
      />
    ) : visible ? (
      <SpinnerDiv>
        <Spin size="large" />
      </SpinnerDiv>
    ) : null;
  }
);

export default InvoiceWizardStep1ChooseRace;

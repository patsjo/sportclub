import { message, Spin } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { TableRowSelection } from 'antd/lib/table/interface';
import { observer } from 'mobx-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from 'utils/mobxStore';
import { IEventViewResultResponse } from 'utils/responseInterfaces';
import { useResultWizardStore } from 'utils/resultWizardStore';
import { PostJsonData } from '../../utils/api';
import { SpinnerDiv, StyledTable } from '../styled/styled';

interface IInvoiceEvent extends IEventViewResultResponse {
  key: string;
}

interface IInvoiceWizardStep1ChooseRaceProps {
  visible: boolean;
  onValidate: (valid: boolean) => void;
  onFailed?: () => void;
}
const InvoiceWizardStep1ChooseRace = observer(
  ({ visible, onValidate, onFailed }: IInvoiceWizardStep1ChooseRaceProps) => {
    const { t } = useTranslation();
    const { clubModel, sessionModel } = useMobxStore();
    const { raceWizardModel } = useResultWizardStore();
    const [loaded, setLoaded] = useState(false);
    const [events, setEvents] = useState<IInvoiceEvent[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>();

    const onSelectChange = useCallback((keys: React.Key[]) => {
      const selectedEventId = Array.isArray(keys) ? keys[0] : keys;

      raceWizardModel.setNumberValueOrNull(
        'selectedEventId',
        selectedEventId != null ? parseInt(selectedEventId as string) : null
      );
      setSelectedRowKeys(keys);
      onValidate(true);
    }, []);

    useEffect(() => {
      const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
      if (!url) return;

      const queryData = {
        iType: 'EVENTS',
        iClubId: clubModel.raceClubs?.selectedClub.clubId,
        iFromDate: raceWizardModel.queryStartDate,
        iToDate: raceWizardModel.queryEndDate,
      };

      PostJsonData(url, queryData, true, sessionModel.authorizationHeader)
        .then((eventsJson: IEventViewResultResponse[]) => {
          let events = eventsJson ? eventsJson : [];
          if (!raceWizardModel.queryIncludeExisting) {
            events = events.filter((e) => !e.invoiceVerified);
          }
          const data = events
            .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0))
            .map((event) => ({ ...event, key: event.eventId.toString() }));

          setSelectedRowKeys(undefined);
          setEvents(data);
          setLoaded(true);
        })
        .catch((e) => {
          message.error(e.message);
          onFailed && onFailed();
        });
    }, []);

    useEffect(() => {
      setSelectedRowKeys([]);
      setEvents((oldEvents) =>
        raceWizardModel.queryIncludeExisting
          ? oldEvents.map(
              (e): IInvoiceEvent => ({
                ...e,
                invoiceVerified: e.invoiceVerified || raceWizardModel.importedIds.includes(e.eventId),
              })
            )
          : oldEvents.filter((e) => !raceWizardModel.importedIds.includes(e.eventId))
      );
    }, [raceWizardModel.importedIds.length]);

    const rowSelection: TableRowSelection<IInvoiceEvent> = {
      selectedRowKeys,
      onChange: onSelectChange,
      type: 'radio',
    };
    const columns: ColumnType<IInvoiceEvent>[] = [
      {
        title: t('results.Date'),
        dataIndex: 'date',
        key: 'date',
      },
      {
        title: t('results.Time'),
        dataIndex: 'time',
        key: 'time',
      },
      {
        title: t('results.Name'),
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: t('results.InvoiceAlreadyVerified'),
        dataIndex: 'invoiceVerified',
        key: 'invoiceVerified',
        render: (invoiceVerified: boolean) => (invoiceVerified ? t('common.Yes') : t('common.No')),
      },
    ];

    return loaded && visible ? (
      <StyledTable
        rowSelection={rowSelection as TableRowSelection<any>}
        onRow={(record) => {
          return {
            onClick: () => onSelectChange([(record as IInvoiceEvent).key]),
          };
        }}
        columns={columns as ColumnType<any>[]}
        dataSource={events}
        pagination={{ pageSize: 8 }}
        size="middle"
      />
    ) : visible ? (
      <SpinnerDiv>
        <Spin size="large" />
      </SpinnerDiv>
    ) : null;
  }
);

export default InvoiceWizardStep1ChooseRace;

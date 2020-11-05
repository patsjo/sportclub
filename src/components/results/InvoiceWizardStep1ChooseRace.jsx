import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { Spin, message } from 'antd';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import { observer, inject } from 'mobx-react';
import { PostJsonData } from '../../utils/api';
import moment from 'moment';
import { dateFormat } from '../../utils/formHelper';

// @inject("clubModel")
// @observer
const InvoiceWizardStep1ChooseRace = inject(
  'clubModel',
  'raceWizardModel',
  'sessionModel'
)(
  observer(
    class InvoiceWizardStep1ChooseRace extends Component {
      constructor(props) {
        super(props);
        this.state = {
          loaded: false,
          events: [],
          selectedRowKeys: undefined,
        };
      }

      componentDidMount() {
        const self = this;
        const { raceWizardModel, clubModel, sessionModel, onFailed } = this.props;
        const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
        const queryData = {
          iType: 'EVENTS',
          iClubId: clubModel.raceClubs.selectedClub.clubId,
          iFromDate: raceWizardModel.queryStartDate,
          iToDate: raceWizardModel.queryEndDate,
        };

        PostJsonData(url, queryData, true, sessionModel.authorizationHeader)
          .then((eventsJson) => {
            let events = eventsJson ? eventsJson : [];
            if (!raceWizardModel.queryIncludeExisting) {
              events = events.filter((e) => !e.invoiceVerified);
            }
            events = events.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
            self.setState({
              loaded: true,
              events: events,
              selectedEventId: undefined,
            });
          })
          .catch((e) => {
            message.error(e.message);
            onFailed && onFailed();
          });
      }

      onSelectChange = (selectedRowKeys) => {
        const { raceWizardModel, onValidate } = this.props;
        const selectedEventId = Array.isArray(selectedRowKeys) ? selectedRowKeys[0] : selectedRowKeys;

        raceWizardModel.setValue('selectedEventId', parseInt(selectedEventId));
        this.setState({ selectedRowKeys });
        onValidate(true);
      };

      render() {
        const { visible, t } = this.props;
        const { loaded, selectedRowKeys, events } = this.state;
        const rowSelection = {
          selectedRowKeys,
          onChange: this.onSelectChange,
          type: 'radio',
        };
        const columns = [
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
            render: (invoiceVerified) => (invoiceVerified ? t('common.Yes') : t('common.No')),
          },
        ];

        const data = events.map((event) => ({ ...event, key: event.eventId.toString() }));

        return loaded && visible ? (
          <StyledTable
            rowSelection={rowSelection}
            onRow={(record) => {
              return {
                onClick: () => this.onSelectChange([record.key]),
              };
            }}
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 8 }}
            size="middle"
          />
        ) : visible ? (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        ) : null;
      }
    }
  )
);

const InvoiceWizardStep1ChooseRaceWithI18n = withTranslation()(InvoiceWizardStep1ChooseRace); // pass `t` function to App

export default InvoiceWizardStep1ChooseRaceWithI18n;

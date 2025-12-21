import { Empty, message, Modal, ModalFuncProps, Popconfirm, Spin, Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IRaceClubsProps, IRaceCompetitor } from '../../models/resultModel';
import { PickRequired } from '../../models/typescriptPartial';
import { PostJsonData } from '../../utils/api';
import { getTextColorBasedOnBackground, lightenColor } from '../../utils/colorHelper';
import { IOption } from '../../utils/formHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { genderOptions } from '../../utils/resultConstants';
import { IStyledTableProps, NoWrap, SpinnerDiv, StyledIcon } from '../styled/styled';
import EditCompetitor from './EditCompetitor';

interface ICompetitorTableProps<RecordType> extends IStyledTableProps<RecordType> {
  familyBackgroundColor: string;
  familyTextColor: string;
}
export const CompetitorTable = styled(Table)<{
  minWidth?: number;
  familyBackgroundColor: string;
  familyTextColor: string;
}>`
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
  .table-row-club,
  .table-row-club:hover,
  .table-row-club:hover > td {
    background-color: ${({ familyBackgroundColor }) => familyBackgroundColor};
    color: ${({ familyTextColor }) => familyTextColor};
    font-weight: bold;
  }
  &&& .ant-table-row-level-1 > td {
    padding-left: 20px !important;
  }
  &&& .ant-table-row-level-1 > td > span.indent-level-1 {
    padding-left: 0 !important;
  }
` as <T extends object>(props: ICompetitorTableProps<T>) => JSX.Element;

interface ICompetitorTable extends PickRequired<IRaceCompetitor, 'firstName' | 'lastName'> {
  key: React.Key;
  edit?: undefined;
  children?: ICompetitorTable[];
  isFamily?: boolean;
}

const competitorSort = (a: ICompetitorTable, b: ICompetitorTable) =>
  `${a.isFamily ? a.lastName.substring(a.lastName.indexOf(' ') + 1) : a.lastName} ${a.firstName}`
    .toLowerCase()
    .localeCompare(
      `${b.isFamily ? b.lastName.substring(b.lastName.indexOf(' ') + 1) : b.lastName} ${b.firstName}`.toLowerCase()
    );

const Competitors = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [loaded, setLoaded] = useState(!sessionModel.isAdmin);
  const [saving, setSaving] = useState(false);
  const [modal, contextHolder] = Modal.useModal();

  const familyOptions = useMemo(
    () =>
      clubModel.raceClubs?.selectedClub?.families
        .map(
          (f): IOption => ({
            code: f.familyId,
            description: f.familyName
          })
        )
        .sort((a, b) =>
          a.description
            .substring(a.description.indexOf(' ') + 1)
            .toLowerCase()
            .localeCompare(b.description.substring(b.description.indexOf(' ') + 1).toLowerCase())
        ) ?? [],
    [clubModel.raceClubs?.selectedClub?.families]
  );

  const familesAndCompetitors = useMemo(() => {
    const families =
      clubModel.raceClubs?.selectedClub?.families.map(
        (f): ICompetitorTable => ({
          key: `family${f.familyId}`,
          isFamily: true,
          firstName: t('users.Family'),
          lastName: f.familyName,
          children: clubModel.raceClubs?.selectedClub?.competitors
            ?.filter(c => c.familyId === f.familyId)
            ?.map((c): ICompetitorTable => ({ key: `competitor${c.competitorId}`, ...c }))
        })
      ) ?? [];
    const competitors =
      clubModel.raceClubs?.selectedClub?.competitors
        ?.filter(c => c.familyId == null)
        ?.map((c): ICompetitorTable => ({ key: `competitor${c.competitorId}`, ...c })) ?? [];
    return [...families, ...competitors]?.sort(competitorSort);
  }, [clubModel.raceClubs?.selectedClub?.families, clubModel.raceClubs?.selectedClub?.competitors, t]);

  const familyTableKeys = useMemo(
    () => familesAndCompetitors.filter(f => f.isFamily).map(f => f.key),
    [familesAndCompetitors]
  );

  const onDeleteCompetitor = useCallback(
    (competitorId: number) => {
      const url = clubModel.modules.find(module => module.name === 'Results')?.deleteUrl;

      if (!sessionModel.loggedIn || !url) {
        return;
      }
      setSaving(true);

      PostJsonData(
        url,
        { iType: 'COMPETITOR', competitorId, clubId: clubModel.raceClubs?.selectedClub?.clubId },
        true,
        sessionModel.authorizationHeader
      )
        .then(() => {
          setSaving(false);
          setLoaded(false);
        })
        .catch(e => {
          if (e?.message) message.error(e.message);
          setSaving(false);
        });
    },
    [
      clubModel.modules,
      clubModel.raceClubs?.selectedClub?.clubId,
      sessionModel.authorizationHeader,
      sessionModel.loggedIn
    ]
  );

  const onDeleteFamily = useCallback(
    (familyId: number) => {
      const url = clubModel.modules.find(module => module.name === 'Results')?.deleteUrl;

      if (!sessionModel.loggedIn || !url) {
        return;
      }
      setSaving(true);

      PostJsonData(url, { iType: 'FAMILY', familyId }, true, sessionModel.authorizationHeader)
        .then(() => {
          setSaving(false);
          setLoaded(false);
        })
        .catch(e => {
          if (e?.message) message.error(e.message);
          setSaving(false);
        });
    },
    [clubModel.modules, sessionModel.authorizationHeader, sessionModel.loggedIn]
  );

  const onSaveCompetitor = useCallback(
    (competitor: ICompetitorTable & { familyName?: string }) => {
      const url = clubModel.modules.find(module => module.name === 'Results')?.updateUrl;

      if (!sessionModel.loggedIn || !url) {
        return;
      }
      setSaving(true);

      PostJsonData<IRaceCompetitor>(
        url,
        {
          iType: 'COMPETITOR',
          iClubId: clubModel.raceClubs?.selectedClub?.clubId,
          iCompetitorId: competitor.competitorId,
          iFirstName: competitor.firstName,
          iLastName: competitor.lastName,
          iGender: competitor.gender,
          iFamilyId: competitor.familyId,
          iFamilyName: competitor.familyName,
          iBirthDay: competitor.birthDay,
          iStartDate: competitor.startDate,
          iEndDate: competitor.endDate,
          iEventorCompetitorIds: competitor.eventorCompetitorIds ?? []
        },
        true,
        sessionModel.authorizationHeader
      )
        .then(updatedCompetitor => {
          if (updatedCompetitor) {
            const c = clubModel.raceClubs?.selectedClub?.competitors?.find(
              c => c.competitorId === updatedCompetitor.competitorId
            );
            if (competitor.familyId === -1 && updatedCompetitor.familyId) {
              clubModel.raceClubs?.selectedClub?.addFamily(updatedCompetitor.familyId, competitor.familyName!);
            }
            if (c) {
              c.setValues(updatedCompetitor);
              clubModel.raceClubs?.selectedClub?.updateCompetitors();
            }
            setSaving(false);
          }
        })
        .catch(e => {
          if (e?.message) message.error(e.message);
          setSaving(false);
        });
    },
    [clubModel.modules, clubModel.raceClubs?.selectedClub, sessionModel.authorizationHeader, sessionModel.loggedIn]
  );

  useEffect(() => {
    const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
    if (loaded || !url || !sessionModel.isAdmin) return;

    PostJsonData<IRaceClubsProps>(
      url,
      {
        iType: 'CLUBS'
      },
      true,
      sessionModel.authorizationHeader
    )
      .then(clubsJson => {
        if (clubsJson) clubModel.setRaceClubs(clubsJson);
        setLoaded(true);
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
      });
  }, [clubModel, loaded, sessionModel.authorizationHeader, sessionModel.isAdmin]);

  const columns: ColumnType<ICompetitorTable>[] = [
    {
      title: t('results.Edit'),
      dataIndex: 'edit',
      key: 'edit',
      render: (text, record) => (
        <NoWrap>
          {record.competitorId && (
            <StyledIcon
              type="edit"
              onClick={() => {
                const competitorObject = { ...record, familyName: undefined };
                let confirmModal: {
                  destroy: () => void;
                  update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
                };

                // eslint-disable-next-line prefer-const
                confirmModal = modal.confirm({
                  width: 800,
                  icon: <StyledIcon type="edit" />,
                  title: `${t('results.Edit')} (${record.firstName} ${record.lastName})`,
                  content: (
                    <EditCompetitor
                      competitor={competitorObject}
                      familyOptions={familyOptions}
                      onChange={changes => Object.assign(competitorObject, changes)}
                      onValidate={(valid: boolean) =>
                        confirmModal.update({
                          okButtonProps: {
                            disabled: !valid
                          }
                        })
                      }
                    />
                  ),
                  okText: t('common.Save'),
                  okButtonProps: {
                    disabled: true
                  },
                  cancelText: t('common.Cancel'),
                  onOk() {
                    confirmModal.update({
                      okButtonProps: {
                        loading: true
                      }
                    });
                    onSaveCompetitor(competitorObject);
                  }
                });
              }}
            />
          )}
          <Popconfirm
            placement="right"
            title={t('common.Confirm')}
            okText={t('common.Yes')}
            cancelText={t('common.No')}
            onConfirm={() => {
              if (!record.isFamily && record.competitorId) {
                onDeleteCompetitor(record.competitorId);
              } else if (record.isFamily && record.familyId) {
                onDeleteFamily(record.familyId);
              }
            }}
          >
            <StyledIcon type="delete" />
          </Popconfirm>
        </NoWrap>
      )
    },
    {
      title: t('users.FirstName'),
      dataIndex: 'firstName',
      key: 'firstName'
    },
    {
      title: t('users.LastName'),
      dataIndex: 'lastName',
      key: 'lastName'
    },
    {
      title: t('users.BirthDay'),
      dataIndex: 'birthDay',
      key: 'birthDay',
      render: value => value?.substr(0, 4)
    },
    {
      title: t('users.Gender'),
      dataIndex: 'gender',
      key: 'gender',
      render: value => genderOptions(t).find(opt => opt.code === value)?.description ?? null
    },
    {
      title: t('results.Renounce'),
      dataIndex: 'excludeResults',
      key: 'excludeResults',
      render: value => (value ? t('common.Yes') : t('common.No'))
    },
    {
      title: t('results.StartDate'),
      dataIndex: 'startDate',
      key: 'startDate'
    },
    {
      title: t('results.EndDate'),
      dataIndex: 'endDate',
      key: 'endDate'
    },
    {
      title: 'Eventor Id',
      dataIndex: 'eventorCompetitorIds',
      key: 'eventorCompetitorIds',
      render: values => (Array.isArray(values) ? values.join(', ') : null)
    }
  ];

  const clubBgColor = lightenColor('#1075E0', 85);
  const clubTextColor = getTextColorBasedOnBackground(clubBgColor);
  return (
    <>
      {loaded && sessionModel.isAdmin ? (
        <CompetitorTable
          familyBackgroundColor={clubBgColor}
          familyTextColor={clubTextColor}
          columns={columns}
          dataSource={familesAndCompetitors}
          pagination={false}
          size="middle"
          expandable={{
            defaultExpandAllRows: true,
            expandedRowKeys: familyTableKeys,
            expandedRowClassName: () => 'table-row-familymember',
            rowExpandable: () => false,
            showExpandColumn: false
          }}
          rowClassName={record => (record.isFamily ? 'table-row-club' : '')}
        />
      ) : !loaded ? (
        <SpinnerDiv>
          <Spin size="large" />
        </SpinnerDiv>
      ) : (
        <Empty description={t('common.Unauthorized')} />
      )}
      {contextHolder}
    </>
  );
});

export default Competitors;

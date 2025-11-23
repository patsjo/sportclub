import { Empty, message, Modal, ModalFuncProps, Popconfirm, Spin } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { observer } from 'mobx-react';
import { ICouncilModel, IGroupModel, IUserModel } from '../../models/userModel';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { MissingTag, NoWrap, SpinnerDiv, StyledIcon, StyledTable } from '../styled/styled';
import EditUser from './EditUser';

const { confirm } = Modal;

interface IUserTable extends IUserModel {
  edit?: undefined;
}

const userSort = (a: IUserModel, b: IUserModel) =>
  a.councilId !== b.councilId
    ? !a.councilId
      ? 1
      : !b.councilId
      ? -1
      : a.councilId - b.councilId
    : a.lastName.toLowerCase() !== b.lastName.toLowerCase()
    ? a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase())
    : a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());

const Users = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [loaded, setLoaded] = useState(false);
  const [users, setUsers] = useState<IUserTable[]>([]);
  const [groups, setGroups] = useState<IGroupModel[]>([]);
  const [councils, setCouncils] = useState<ICouncilModel[]>([]);

  const onDeleteUser = useCallback(
    (userId: number) => {
      const url = clubModel.modules.find((module) => module.name === 'Users')?.deleteUrl;
      setLoaded(false);

      if (!sessionModel.loggedIn || !url) {
        setLoaded(true);
        return;
      }

      PostJsonData(url, { userId: userId }, true, sessionModel.authorizationHeader)
        .then(() => {
          setUsers((oldUsers) => oldUsers.filter((u) => u.userId !== userId));
          setLoaded(true);
        })
        .catch((e) => {
          if (e && e.message) {
            message.error(e.message);
          }
          setLoaded(true);
        });
    },
    [clubModel.modules]
  );

  const onSaveUser = useCallback(
    (user: IUserModel) => {
      const url = clubModel.modules.find((module) => module.name === 'Users')?.updateUrl;
      setLoaded(false);

      if (!sessionModel.loggedIn || !url) {
        setLoaded(true);
        return;
      }

      PostJsonData(url, user, true, sessionModel.authorizationHeader)
        .then((updatedUser: IUserModel) => {
          setUsers((oldUsers) =>
            [...oldUsers.filter((u) => u.userId !== updatedUser.userId), updatedUser].sort(userSort)
          );
          setLoaded(true);
        })
        .catch((e) => {
          if (e && e.message) {
            message.error(e.message);
          }
          setLoaded(true);
        });
    },
    [clubModel.modules]
  );

  useEffect(() => {
    const url = clubModel.modules.find((module) => module.name === 'Users')?.queryUrl;
    setLoaded(false);

    if (!sessionModel.loggedIn || !url) {
      setLoaded(true);
      return;
    }

    PostJsonData(url, {}, true, sessionModel.authorizationHeader)
      .then((data: { users: IUserModel[]; groups: IGroupModel[]; councils: ICouncilModel[] }) => {
        setCouncils(data.councils);
        setGroups(data.groups);
        setUsers(data.users.sort(userSort));
        setLoaded(true);
      })
      .catch((e) => {
        if (e && e.message) {
          message.error(e.message);
        }
      });
  }, [sessionModel.loggedIn, clubModel.modules]);

  const columns: ColumnType<IUserTable>[] = [
    {
      title: t('results.Edit'),
      dataIndex: 'edit',
      key: 'edit',
      render: (text, record) => (
        <NoWrap>
          {sessionModel.isAdmin || (sessionModel.loggedIn && sessionModel.id === record.userId.toString()) ? (
            <StyledIcon
              type="edit"
              onClick={() => {
                const userObject = { ...record };
                let confirmModal: {
                  destroy: () => void;
                  update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
                };
                // eslint-disable-next-line prefer-const
                confirmModal = confirm({
                  width: 800,
                  icon: <StyledIcon type="edit" />,
                  title: `${t('results.Edit')} (${record.firstName} ${record.lastName})`,
                  content: (
                    <EditUser
                      groups={groups}
                      councils={councils}
                      user={userObject}
                      sessionModel={sessionModel}
                      onValidate={(valid: boolean) =>
                        confirmModal.update({
                          okButtonProps: {
                            disabled: !valid,
                          },
                        })
                      }
                    />
                  ),
                  okText: t('common.Save'),
                  okButtonProps: {
                    disabled: true,
                  },
                  cancelText: t('common.Cancel'),
                  onOk() {
                    onSaveUser(userObject);
                  },
                });
              }}
            />
          ) : null}
          {sessionModel.isAdmin ? (
            <Popconfirm
              placement="right"
              title={t('common.Confirm')}
              okText={t('common.Yes')}
              cancelText={t('common.No')}
              onConfirm={() => {
                onDeleteUser(record.userId);
              }}
            >
              <StyledIcon type="delete" />
            </Popconfirm>
          ) : null}
        </NoWrap>
      ),
    },
    {
      title: t('users.FirstName'),
      dataIndex: 'firstName',
      key: 'firstName',
    },
    {
      title: t('users.LastName'),
      dataIndex: 'lastName',
      key: 'lastName',
    },
    {
      title: t('users.Council'),
      dataIndex: 'councilId',
      key: 'councilId',
      render: (value) => (value ? councils.find((c) => c.councilId === value)?.name : null),
    },
    {
      title: t('users.Responsibility'),
      dataIndex: 'responsibility',
      key: 'responsibility',
    },
    {
      title: t('users.PhoneNo'),
      dataIndex: 'phoneNo',
      key: 'phoneNo',
      render: (value, record) =>
        [record.mobilePhoneNo, record.phoneNo, record.workPhoneNo].filter((phoneNo) => phoneNo).join(', '),
    },
    {
      title: t('users.Email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('users.BirthDay'),
      dataIndex: 'birthDay',
      key: 'birthDay',
      render: (value) => (value == null ? <MissingTag t={t} /> : value.substr(0, 4)),
    },
    {
      title: t('users.Groups'),
      dataIndex: 'groupIds',
      key: 'groupIds',
      render: (values) =>
        Array.isArray(values)
          ? values
              .map((value) => groups.find((g) => g.groupId === value)?.description)
              .filter((g) => g)
              .join(', ')
          : null,
    },
  ];

  return loaded && sessionModel.loggedIn ? (
    <StyledTable columns={columns as ColumnType<any>[]} dataSource={users} pagination={false} size="middle" />
  ) : !loaded ? (
    <SpinnerDiv>
      <Spin size="large" />
    </SpinnerDiv>
  ) : (
    <Empty description={t('common.Login')} />
  );
});

export default Users;

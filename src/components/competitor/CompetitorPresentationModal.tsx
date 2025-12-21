import { Form, Input, message, Modal } from 'antd';
import { observer } from 'mobx-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { fileAsUrl } from '../../utils/fileHelper';
import { IFile, maxByteSize } from '../../utils/formHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { ICompetitorInfoRequest } from '../../utils/requestInterfaces';
import { ICompetitorInfo } from '../../utils/responseCompetitorInterfaces';
import FormItem from '../formItems/FormItem';
import UploadDragger from '../formItems/UploadDragger';

const StyledModal = styled(Modal)`
  &&& .ant-modal-body {
    max-height: calc(100vh - 200px);
    overflow-y: scroll;
    overflow-x: hidden;
  }
`;
const StyledModalContent = styled.div``;

interface ICompetitorInfoFormProps extends ICompetitorInfoRequest {
  iFiles?: IFile[];
}

interface ICompetitorPresentationModalProps {
  name: string;
  competitorInfo: ICompetitorInfo;
  open: boolean;
  onClose: () => void;
  onChange: (competitorInfo: ICompetitorInfo) => void;
}
const CompetitorPresentationModal = observer(
  ({ name, competitorInfo, open, onClose, onChange }: ICompetitorPresentationModalProps) => {
    const { clubModel, sessionModel } = useMobxStore();
    const { t } = useTranslation();
    const [form] = Form.useForm<ICompetitorInfoFormProps>();
    const [saving, setSaving] = useState(false);
    const formId = 'competitorEditForm' + Math.floor(Math.random() * 10000000000000000);

    const onSave = useCallback(
      async (formValues: ICompetitorInfoFormProps) => {
        const saveUrl = clubModel.modules.find(module => module.name === 'Results')?.updateUrl;
        if (!saveUrl) return;

        setSaving(true);
        const values: ICompetitorInfoRequest = {
          iCompetitorId: formValues.iCompetitorId,
          iSeniorAchievements: formValues.iSeniorAchievements,
          iJuniorAchievements: formValues.iJuniorAchievements,
          iYouthAchievements: formValues.iYouthAchievements,
          iThumbnail: formValues.iThumbnail
        };
        if (!formValues.iFiles?.length) {
          values.iThumbnail = null;
        } else if (!formValues.iFiles[0].isOriginalFile && formValues.iFiles[0].originFileObj) {
          values.iThumbnail = await fileAsUrl(formValues.iFiles[0].originFileObj);
        }
        PostJsonData<ICompetitorInfo>(
          saveUrl,
          {
            ...values,
            iType: 'COMPETITOR_INFO',
            username: sessionModel.username,
            password: sessionModel.password
          },
          true,
          sessionModel.authorizationHeader
        )
          .then(competitorResponse => {
            setSaving(false);
            if (competitorResponse) {
              onChange?.(competitorResponse);
              onClose();
            }
          })
          .catch(e => {
            if (e?.message) message.error(e.message);
            setSaving(false);
          });
      },
      [
        clubModel.modules,
        onChange,
        onClose,
        sessionModel.authorizationHeader,
        sessionModel.password,
        sessionModel.username
      ]
    );

    return (
      <StyledModal
        closable={false}
        maskClosable={false}
        title={`${t('competitor.Edit')} - ${name}`}
        open={open}
        okText={t('common.Save')}
        okButtonProps={{ loading: saving }}
        cancelText={t('common.Cancel')}
        cancelButtonProps={{ loading: saving }}
        style={{ top: 40 }}
        width={800}
        onOk={() => {
          form.validateFields().then(values => {
            onSave(values);
          });
        }}
        onCancel={onClose}
      >
        <StyledModalContent>
          <Form
            form={form}
            id={formId}
            layout="vertical"
            initialValues={{
              iCompetitorId: competitorInfo.competitorId,
              iSeniorAchievements: competitorInfo.seniorAchievements || null,
              iJuniorAchievements: competitorInfo.juniorAchievements || null,
              iYouthAchievements: competitorInfo.youthAchievements || null,
              iThumbnail: competitorInfo.thumbnail || null,
              iFiles: competitorInfo.thumbnail
                ? [
                    {
                      uid: '1',
                      name: 'thumbnail.png',
                      type: 'image/png',
                      size: 0,
                      status: 'done',
                      isOriginalFile: true
                    }
                  ]
                : []
            }}
          >
            <FormItem name="iCompetitorId">
              <Input type="hidden" />
            </FormItem>
            <FormItem name="iSeniorAchievements" label={t('competitor.Senior')}>
              <Input />
            </FormItem>
            <FormItem name="iJuniorAchievements" label={t('competitor.Junior')}>
              <Input />
            </FormItem>
            <FormItem name="iYouthAchievements" label={t('competitor.Youth')}>
              <Input />
            </FormItem>
            <UploadDragger
              form={form}
              fieldName="iFiles"
              maxByteSize={maxByteSize}
              multiple={false}
              asThumbnail={true}
              allowedFileTypes={['image/png', 'image/gif', 'image/jpeg']}
            />
            <FormItem name="iThumbnail">
              <Input type="hidden" />
            </FormItem>
          </Form>
        </StyledModalContent>
      </StyledModal>
    );
  }
);

export default CompetitorPresentationModal;

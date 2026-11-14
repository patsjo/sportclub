import { Form, Input, Modal, Select } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { ICupReportProps, ICupSeasonProps } from '../../../models/cupModel';
import { cupReportPlainText } from '../../../utils/cupHelper';
import { fileAsBase64, getFileType } from '../../../utils/fileHelper';
import { errorRequiredField, IFile, maxByteSize } from '../../../utils/formHelper';
import { useMobxStore } from '../../../utils/mobxStore';
import { INewsFileRequest } from '../../../utils/requestInterfaces';
import FormItem from '../../formItems/FormItem';
import SimpleHtmlHelp from '../../simpleHtml/SimpleHtmlHelp';
import UploadDragger from '../../formItems/UploadDragger';
import { showCupError, useCupApi } from '../useCup';

const { TextArea } = Input;
const StyledModal = styled(Modal)`
  &&& .ant-modal-body {
    max-height: calc(100vh - 200px);
    overflow-y: scroll;
    overflow-x: hidden;
  }
`;
const StyledUploadContainer = styled.div`
  margin-top: 16px;
  margin-bottom: 8px;
`;

interface IReportForm {
  header: string;
  introduction: string;
  text: string;
  cupRaceId: number | -1;
  files: IFile[];
}

interface ICupReportEditModalProps {
  season: ICupSeasonProps;
  report?: ICupReportProps;
  /** Preselected race for a new report, undefined = the whole season */
  cupRaceId?: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** A plain text report with images, for one race or for the whole season. Same form as a news item. */
const CupReportEditModal = ({ season, report, cupRaceId, open, onClose, onSaved }: ICupReportEditModalProps) => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const { save } = useCupApi();
  const [form] = Form.useForm<IReportForm>();
  const [saving, setSaving] = useState(false);

  const onOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const iFiles: INewsFileRequest[] = [];
      for (const file of values.files ?? []) {
        if (file.isOriginalFile) {
          iFiles.push({ iFileID: parseInt(file.uid) });
        } else {
          iFiles.push({
            iFileID: -1,
            iFileData: await fileAsBase64(file.originFileObj),
            iMimeType: getFileType(file),
            iFileSize: file.size,
            iFileName: file.name
          });
        }
      }
      await save({
        iType: 'REPORT',
        iReportId: report?.reportId ?? -1,
        iSeasonId: season.seasonId,
        iCupRaceId: values.cupRaceId === -1 ? null : values.cupRaceId,
        iHeader: values.header,
        iIntroduction: values.introduction ?? '',
        iText: values.text ?? '',
        iFiles
      });
      setSaving(false);
      onSaved();
    } catch (e) {
      setSaving(false);
      showCupError(e);
    }
  };

  return (
    <StyledModal
      destroyOnHidden
      closable={false}
      maskClosable={false}
      title={report ? t('cup.EditReport') : t('cup.NewReport')}
      open={open}
      width={800}
      okText={t('common.Save')}
      cancelText={t('common.Cancel')}
      okButtonProps={{ loading: saving }}
      cancelButtonProps={{ loading: saving }}
      style={{ top: 40 }}
      onOk={onOk}
      onCancel={onClose}
    >
      <Form<IReportForm>
        form={form}
        layout="vertical"
        initialValues={{
          header: report?.header ?? '',
          introduction: report?.introduction ?? '',
          text: cupReportPlainText(report?.text),
          cupRaceId: report ? (report.cupRaceId ?? -1) : (cupRaceId ?? -1),
          files: (report?.files ?? []).map(file => ({
            uid: file.fileId.toString(),
            name: file.fileName,
            type: file.fileType,
            size: file.fileSize,
            status: 'done',
            isOriginalFile: true,
            url: clubModel.attachmentUrl + file.fileId,
            thumbUrl: file.imageWidth && file.imageHeight ? clubModel.attachmentUrl + file.fileId : undefined
          }))
        }}
      >
        <FormItem name="cupRaceId" label={t('cup.ReportFor')}>
          <Select
            style={{ minWidth: 174 }}
            options={[
              { value: -1, label: t('cup.WholeSeason', { season: season.name }) },
              ...season.races.map(r => ({ value: r.cupRaceId, label: `${r.raceDate} ${r.name}` }))
            ]}
          />
        </FormItem>
        <FormItem
          name="header"
          label={t('news.Header')}
          rules={[{ required: true, message: errorRequiredField(t, 'news.Header') }, { max: 128 }]}
        >
          <Input />
        </FormItem>
        <FormItem
          name="introduction"
          label={
            <>
              {t('news.Introduction')}
              <SimpleHtmlHelp />
            </>
          }
        >
          <TextArea autoSize={{ minRows: 1, maxRows: 4 }} />
        </FormItem>
        <FormItem
          name="text"
          label={
            <>
              {t('news.Text')}
              <SimpleHtmlHelp />
            </>
          }
        >
          <TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
        </FormItem>
        <StyledUploadContainer>
          <UploadDragger
            form={form}
            fieldName="files"
            maxByteSize={maxByteSize}
            multiple={true}
            label={t('news.Attachments')}
            extra={t('news.AttachmentsInfo')}
          />
        </StyledUploadContainer>
      </Form>
    </StyledModal>
  );
};

export default CupReportEditModal;

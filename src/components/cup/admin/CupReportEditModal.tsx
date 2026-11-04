import { Form, Input, Modal, Select } from 'antd';
import { ClassicEditor } from 'ckeditor5';
import { lazy, Suspense, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ICupReportProps, ICupSeasonProps } from '../../../models/cupModel';
import { fileAsBase64, getFileType } from '../../../utils/fileHelper';
import { IFile, maxByteSize } from '../../../utils/formHelper';
import { useMobxStore } from '../../../utils/mobxStore';
import { INewsFileRequest } from '../../../utils/requestInterfaces';
import UploadDragger from '../../formItems/UploadDragger';
import { showCupError, useCupApi } from '../useCup';

const CustomCKEditor = lazy(() => import('../../htmlEditor/CustomCKEditor'));

interface IReportForm {
  header: string;
  introduction: string;
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

/** A report with images, for one race or for the whole season */
const CupReportEditModal = ({ season, report, cupRaceId, open, onClose, onSaved }: ICupReportEditModalProps) => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const { save } = useCupApi();
  const [form] = Form.useForm<IReportForm>();
  const [saving, setSaving] = useState(false);
  const editor = useRef<ClassicEditor>(null);

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
        iText: editor.current?.getData() ?? report?.text ?? '',
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
    <Modal
      destroyOnHidden
      title={report ? t('cup.EditReport') : t('cup.NewReport')}
      open={open}
      width={900}
      okText={t('common.Save')}
      cancelText={t('common.Cancel')}
      okButtonProps={{ loading: saving }}
      maskClosable={false}
      style={{ top: 30 }}
      onOk={onOk}
      onCancel={onClose}
    >
      <Form<IReportForm>
        form={form}
        layout="vertical"
        initialValues={{
          header: report?.header ?? '',
          introduction: report?.introduction ?? '',
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
        <Form.Item name="cupRaceId" label={t('cup.ReportFor')}>
          <Select
            options={[
              { value: -1, label: t('cup.WholeSeason', { season: season.name }) },
              ...season.races.map(r => ({ value: r.cupRaceId, label: `${r.raceDate} ${r.name}` }))
            ]}
          />
        </Form.Item>
        <Form.Item name="header" label={t('cup.ReportHeader')} rules={[{ required: true, max: 128 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="introduction" label={t('cup.ReportIntroduction')}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>
        <Form.Item label={t('cup.ReportText')}>
          <Suspense fallback={null}>
            <CustomCKEditor
              data={report?.text ?? ''}
              isReadOnly={false}
              onReady={instance => {
                editor.current = instance;
              }}
            />
          </Suspense>
        </Form.Item>
        <UploadDragger
          form={form}
          fieldName="files"
          maxByteSize={maxByteSize}
          multiple={true}
          label={t('cup.ReportImages')}
          extra={t('news.AttachmentsInfo')}
        />
      </Form>
    </Modal>
  );
};

export default CupReportEditModal;

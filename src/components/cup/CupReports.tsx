import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { ICupReportProps } from '../../models/cupModel';
import { cupReportPlainText } from '../../utils/cupHelper';
import NewsImages from '../news/NewsImages';
import SimpleHtmlText from '../simpleHtml/SimpleHtmlText';
import SocialSection from '../social/SocialSection';
import { formatCupDate } from './cupDate';
import { CupCaption, CupMuted, CupPanel } from './CupStyled';
import { cupHeadingFont } from './cupThemes';

const ReportHeader = styled.h3`
  font-family: ${cupHeadingFont};
  font-weight: 400;
  font-size: clamp(30px, 4.4vw, 52px);
  line-height: 0.95;
  text-transform: uppercase;
  margin: 6px 0 14px 0;
  color: inherit;
  overflow-wrap: anywhere;
`;
const Introduction = styled.p`
  font-size: clamp(17px, 1.8vw, 21px);
  font-weight: 600;
  line-height: 1.45;
  white-space: pre-line;
  border-left: 6px solid var(--cup-highlight);
  padding-left: 14px;
  margin: 0 0 18px 0;
`;
const Text = styled.div`
  font-size: 16px;
  line-height: 1.6;
  white-space: pre-line;
  overflow-wrap: anywhere;
  margin-bottom: 12px;
`;

interface ICupReportsProps {
  reports: ICupReportProps[];
  isAdmin: boolean;
  onEdit: (report: ICupReportProps) => void;
  onDelete: (report: ICupReportProps) => void;
}

/** Race reports as magazine style panels with images */
const CupReports = ({ reports, isAdmin, onEdit, onDelete }: ICupReportsProps) => {
  const { t } = useTranslation();
  if (reports.length === 0) return null;

  return (
    <>
      {reports.map(report => (
        <CupPanel key={report.reportId}>
          {isAdmin ? (
            <Space style={{ float: 'right' }}>
              <Button icon={<EditOutlined />} onClick={() => onEdit(report)} />
              <Popconfirm
                title={t('common.Confirm')}
                okText={t('common.Yes')}
                cancelText={t('common.No')}
                onConfirm={() => onDelete(report)}
              >
                <Button danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          ) : null}
          <CupCaption>
            {report.modificationDate ? formatCupDate(report.modificationDate, 'D MMM YYYY') : t('cup.Report')}
          </CupCaption>
          <ReportHeader>{report.header}</ReportHeader>
          {report.introduction ? (
            <Introduction>
              <SimpleHtmlText text={report.introduction} />
            </Introduction>
          ) : null}
          <NewsImages files={report.files} maxSize={360} />
          {report.text ? (
            <Text>
              <SimpleHtmlText text={cupReportPlainText(report.text)} />
            </Text>
          ) : null}
          {report.modifiedBy ? <CupMuted>{report.modifiedBy}</CupMuted> : null}
          <SocialSection targetType="CUP_REPORT" targetId={report.reportId} />
        </CupPanel>
      ))}
    </>
  );
};

export default CupReports;

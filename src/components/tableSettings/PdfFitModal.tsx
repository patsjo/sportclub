import { ColumnWidthOutlined } from '@ant-design/icons';
import { Modal, Radio, Space, Typography } from 'antd';
import { TFunction } from 'i18next';
import { IPdfFit, IPdfFitOption, IPdfSettings, PdfReducedMargin, PdfTableFontSize } from '../../utils/pdf';

const formatSize = (size: number) => size.toLocaleString(undefined, { maximumFractionDigits: 1 });

const optionLabel = (t: TFunction, option: IPdfFitOption) =>
  option.key === 'current'
    ? t('common.PdfFitCurrent', {
        settings: `${String(option.settings.pageSize)}, ${t(
          option.settings.pageOrientation === 'landscape' ? 'common.Landscape' : 'common.Portrait'
        ).toLowerCase()}`
      })
    : t(`common.PdfFit${option.key}`, { margin: PdfReducedMargin });

const sizeText = (t: TFunction, fontSize: number) =>
  fontSize >= PdfTableFontSize
    ? t('common.PdfFitNormalSize', { size: formatSize(PdfTableFontSize) })
    : t('common.PdfFitTextSize', {
        size: formatSize(fontSize),
        percent: Math.round((100 * fontSize) / PdfTableFontSize)
      });

/**
 * Tells how small the text gets for the tables to fit the width of the page, and lets the user choose a page that
 * gives larger text. The settings to make the PDF with, or undefined when cancelled. The dialog closes at once, the
 * progress of the making of the PDF is shown by the dialog of the progress.
 */
export const ConfirmPdfFit = (
  t: TFunction,
  modal: ReturnType<typeof Modal.useModal>[0],
  fit: IPdfFit
): Promise<IPdfSettings | undefined> =>
  new Promise(resolve => {
    // The largest text is chosen first, the current settings when no alternative is better
    let selected = fit.options.reduce((best, option) => (option.fontSize > best.fontSize ? option : best)).key;
    modal.confirm({
      title: t('common.PdfFitTitle'),
      icon: <ColumnWidthOutlined />,
      width: 560,
      content: (
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          <Typography.Text>
            {fit.total > 1
              ? t('common.PdfFitDescriptionMany', {
                  count: fit.tooWide,
                  total: fit.total,
                  normal: formatSize(PdfTableFontSize)
                })
              : t('common.PdfFitDescription', { normal: formatSize(PdfTableFontSize) })}
          </Typography.Text>
          <Radio.Group defaultValue={selected} onChange={e => (selected = e.target.value)}>
            <Space orientation="vertical" size={4}>
              {fit.options.map(option => (
                <Radio key={option.key} value={option.key}>
                  {optionLabel(t, option)}
                  {' – '}
                  <Typography.Text type={option.fontSize < PdfTableFontSize ? 'warning' : 'success'}>
                    {sizeText(t, option.fontSize)}
                  </Typography.Text>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
          <Typography.Text type="secondary">{t('common.PdfFitNotSaved')}</Typography.Text>
        </Space>
      ),
      okText: t('common.PdfFitCreate'),
      cancelText: t('common.Cancel'),
      onOk() {
        resolve(fit.options.find(option => option.key === selected)?.settings);
      },
      onCancel() {
        resolve(undefined);
      }
    });
  });

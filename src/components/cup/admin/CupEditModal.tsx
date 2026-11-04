import { ColorPicker, Form, Input, Modal, Radio, Switch } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cupThemes, CupThemeType, ICupProps } from '../../../models/cupModel';
import { useMobxStore } from '../../../utils/mobxStore';
import { CupThemePreview } from '../CupArt';
import { getCupTheme } from '../cupThemes';
import { notifyCupsChanged, showCupError, useCupApi } from '../useCup';

interface ICupForm {
  name: string;
  slug: string;
  description: string;
  theme: CupThemeType;
  primaryColor: string | null;
  secondaryColor: string | null;
  isActive: boolean;
  showInToolbar: boolean;
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 64);

interface ICupEditModalProps {
  cup?: ICupProps;
  open: boolean;
  onClose: () => void;
  onSaved: (cup: ICupProps) => void;
}

const colorToString = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const color = value as { toHexString?: () => string; cleared?: boolean };
  if (color.cleared) return null;
  return color.toHexString ? color.toHexString() : null;
};

const CupEditModal = ({ cup, open, onClose, onSaved }: ICupEditModalProps) => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const { save } = useCupApi();
  const [form] = Form.useForm<ICupForm>();
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!cup);
  const theme = Form.useWatch('theme', form) ?? cup?.theme ?? 'SUMMER';
  const primaryColor = colorToString(Form.useWatch('primaryColor', form));
  const secondaryColor = colorToString(Form.useWatch('secondaryColor', form));

  const colorPresets = [
    {
      label: t('cup.ClubColors'),
      colors: [clubModel.theme.palette.primary.main, clubModel.theme.palette.secondary.main].filter(Boolean)
    }
  ];

  const onOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const saved = await save<ICupProps>({
        iType: 'CUP',
        iCupId: cup?.cupId ?? -1,
        iName: values.name,
        iSlug: values.slug,
        iDescription: values.description ?? '',
        iTheme: values.theme,
        iPrimaryColor: colorToString(values.primaryColor),
        iSecondaryColor: colorToString(values.secondaryColor),
        iIsActive: values.isActive,
        iShowInToolbar: values.showInToolbar
      });
      setSaving(false);
      if (saved) {
        notifyCupsChanged();
        onSaved(saved);
      }
    } catch (e) {
      setSaving(false);
      showCupError(e);
    }
  };

  return (
    <Modal
      destroyOnHidden
      title={cup ? t('cup.EditCup') : t('cup.NewCup')}
      open={open}
      width={760}
      okText={t('common.Save')}
      cancelText={t('common.Cancel')}
      okButtonProps={{ loading: saving }}
      maskClosable={false}
      onOk={onOk}
      onCancel={onClose}
    >
      <Form<ICupForm>
        form={form}
        layout="vertical"
        initialValues={{
          name: cup?.name ?? '',
          slug: cup?.slug ?? '',
          description: cup?.description ?? '',
          theme: cup?.theme ?? 'SUMMER',
          primaryColor: cup?.primaryColor ?? null,
          secondaryColor: cup?.secondaryColor ?? null,
          isActive: cup?.isActive ?? true,
          showInToolbar: cup?.showInToolbar ?? false
        }}
        onValuesChange={changed => {
          if (changed.name !== undefined && !slugTouched) form.setFieldValue('slug', slugify(changed.name));
          if (changed.slug !== undefined) setSlugTouched(true);
        }}
      >
        <Form.Item name="name" label={t('cup.Name')} rules={[{ required: true, max: 128 }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="slug"
          label={t('cup.Slug')}
          extra={`${window.location.origin}/cup/${form.getFieldValue('slug') ?? ''}`}
          rules={[{ required: true, pattern: /^[a-z0-9][a-z0-9-]{0,63}$/, message: t('cup.SlugRule') }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label={t('cup.Description')}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
        </Form.Item>
        <Form.Item name="theme" label={t('cup.Theme')} rules={[{ required: true }]}>
          <Radio.Group style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {cupThemes.map(themeType => (
              <Radio key={themeType} value={themeType} style={{ alignItems: 'flex-start' }}>
                <div>{t(`cup.Theme${themeType}`)}</div>
                <CupThemePreview theme={getCupTheme(themeType, primaryColor, secondaryColor)} width={150} />
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Form.Item name="primaryColor" label={t('cup.PrimaryColor')} extra={t('cup.ColorInfo')}>
            <ColorPicker allowClear showText format="hex" presets={colorPresets} />
          </Form.Item>
          <Form.Item name="secondaryColor" label={t('cup.SecondaryColor')}>
            <ColorPicker allowClear showText format="hex" presets={colorPresets} />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Form.Item name="isActive" label={t('cup.IsActive')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="showInToolbar" label={t('cup.ShowInToolbar')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
        <CupThemePreview theme={getCupTheme(theme, primaryColor, secondaryColor)} width={700} />
      </Form>
    </Modal>
  );
};

export default CupEditModal;

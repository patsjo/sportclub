import { Modal } from 'antd';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SocialTargetType } from '../../models/socialModel';
import SocialBar from './SocialBar';
import SocialSection from './SocialSection';

/** Height of the bar, to add to the height of the widget */
export const socialFooterHeight = 32;

interface ISocialFooterProps {
  targetType: SocialTargetType;
  targetId: string | number;
  /** Title of the comments modal */
  title?: string;
}

/** Reactions below a widget that isn't a news card, e.g. the map. The comments open in a modal. */
const SocialFooter = observer(({ targetType, targetId, title }: ISocialFooterProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <SocialBar targetType={targetType} targetId={targetId} onComments={() => setOpen(true)} />
      {open ? (
        <Modal
          open
          title={title ?? t('social.Comments')}
          footer={null}
          width={600}
          style={{ top: 40 }}
          onCancel={() => setOpen(false)}
        >
          <SocialSection targetType={targetType} targetId={targetId} />
        </Modal>
      ) : null}
    </>
  );
});

export default SocialFooter;

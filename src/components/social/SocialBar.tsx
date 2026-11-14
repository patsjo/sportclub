import { CommentOutlined } from '@ant-design/icons';
import { message, Popover, Spin, Tooltip } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { socialKey, SocialReaction, socialReactions, SocialTargetType } from '../../models/socialModel';
import { useMobxStore } from '../../utils/mobxStore';

const Bar = styled.div<{ $compact: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ $compact }) => ($compact ? 2 : 6)}px;
  padding-top: ${({ $compact }) => ($compact ? 0 : 4)}px;
  font-size: ${({ $compact }) => ($compact ? 11 : 13)}px;
  color: inherit;
`;

/** The rounded pill around a reaction, the emoji reacts and the number shows who */
const Pill = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: stretch;
  border: 1px solid ${({ $active }) => ($active ? 'currentColor' : 'rgba(128, 128, 128, 0.35)')};
  border-radius: 14px;
  background: ${({ $active }) => ($active ? 'rgba(128, 128, 128, 0.18)' : 'transparent')};
  overflow: hidden;
`;

const PillButton = styled.button<{ $compact: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1.4;
  padding: ${({ $compact }) => ($compact ? '0 6px' : '1px 9px')};
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: rgba(128, 128, 128, 0.14);
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: -2px;
  }
  &:disabled {
    cursor: default;
  }
  .social-count {
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
  }
`;

const EmojiButton = styled(PillButton)`
  padding-right: 2px;
`;

const CountButton = styled(PillButton)`
  padding-left: 3px;
  &:hover:not(:disabled) .social-count {
    text-decoration: underline;
  }
`;

const NameList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  min-width: 120px;
  max-width: 240px;
  max-height: 220px;
  overflow-y: auto;
  li {
    padding: 2px 0;
  }
`;

interface ISocialBarProps {
  targetType: SocialTargetType;
  targetId: string | number;
  /** Small, and only shown when someone has reacted or commented */
  compact?: boolean;
  /** Opens the comments, e.g. the modal of the item */
  onComments?: () => void;
}

/** Like, dislike and heart, and the number of comments. Logged in, click on a number to see who. */
const SocialBar = observer(({ targetType, targetId, compact = false, onComments }: ISocialBarProps) => {
  const { socialModel, sessionModel, globalStateModel } = useMobxStore();
  const { t } = useTranslation();
  const [whoOpen, setWhoOpen] = useState<SocialReaction>();
  const [loadingWho, setLoadingWho] = useState(false);
  const [whoFailed, setWhoFailed] = useState(false);
  const key = socialKey(targetType, targetId);
  const summary = socialModel.summaries.get(key);
  const details = socialModel.details.get(key);

  useEffect(() => {
    socialModel.request(targetType, targetId);
  }, [socialModel, targetId, targetType]);

  if (!socialModel.enabled || !summary) return null;
  const total = socialReactions.reduce((sum, r) => sum + summary.counts[r.reaction], 0);
  if (compact && total === 0 && summary.comments === 0) return null;

  const onReact = (reaction: SocialReaction) => {
    if (!sessionModel.canInteract) {
      globalStateModel.setLoginModalVisible(true);
      return;
    }
    socialModel
      .react(targetType, targetId, summary.myReaction === reaction ? null : reaction)
      .catch(e => message.error(e?.message));
  };

  // Always fetch again when opened, someone else may have reacted since
  const onWhoOpenChange = (reaction: SocialReaction, open: boolean) => {
    setWhoOpen(open ? reaction : undefined);
    if (!open) return;
    setLoadingWho(true);
    setWhoFailed(false);
    socialModel
      .loadDetails(targetType, targetId)
      .catch(() => setWhoFailed(true))
      .finally(() => setLoadingWho(false));
  };

  const names = (reaction: SocialReaction) =>
    details?.reactions.filter(r => r.reaction === reaction).map(r => r.name) ?? [];

  const whoContent = (reaction: SocialReaction) => {
    const list = names(reaction);
    if (whoFailed && list.length === 0) return t('social.NamesLoadFailed');
    return (
      <Spin spinning={loadingWho && list.length === 0} size="small">
        <NameList>
          {list.map((name, index) => (
            <li key={`${name}#${index}`}>{name}</li>
          ))}
        </NameList>
      </Spin>
    );
  };

  return (
    <Bar $compact={compact} onClick={e => e.stopPropagation()}>
      {socialReactions
        .filter(r => !compact || summary.counts[r.reaction] > 0)
        .map(r => {
          const count = summary.counts[r.reaction];
          // Only the ones logged in (users and guests) can see who, the server doesn't send the names to others
          const canShowWho = count > 0 && sessionModel.canInteract;
          return (
            <Pill key={r.reaction} $active={summary.myReaction === r.reaction}>
              <Tooltip title={sessionModel.canInteract ? t(`social.${r.reaction}`) : t('social.LoginToReact')}>
                <EmojiButton
                  type="button"
                  $compact={compact}
                  aria-pressed={summary.myReaction === r.reaction}
                  aria-label={t(`social.${r.reaction}`)}
                  onClick={() => onReact(r.reaction)}
                >
                  <span aria-hidden>{r.emoji}</span>
                </EmojiButton>
              </Tooltip>
              <Popover
                trigger="click"
                placement="bottom"
                title={`${r.emoji} ${t(`social.${r.reaction}`)} (${count})`}
                content={whoContent(r.reaction)}
                open={whoOpen === r.reaction && canShowWho}
                onOpenChange={open => onWhoOpenChange(r.reaction, open && canShowWho)}
              >
                <CountButton
                  type="button"
                  $compact={compact}
                  disabled={!canShowWho}
                  title={canShowWho ? t('social.ShowWho') : undefined}
                  aria-label={`${t('social.ShowWho')}: ${t(`social.${r.reaction}`)} (${count})`}
                >
                  <span className="social-count">{count}</span>
                </CountButton>
              </Popover>
            </Pill>
          );
        })}
      {onComments && (!compact || summary.comments > 0) ? (
        <Tooltip title={t('social.Comments')}>
          <Pill $active={false}>
            <PillButton
              type="button"
              $compact={compact}
              aria-label={`${t('social.Comments')} (${summary.comments})`}
              onClick={onComments}
            >
              <CommentOutlined aria-hidden />
              <span className="social-count">{summary.comments}</span>
            </PillButton>
          </Pill>
        </Tooltip>
      ) : null}
    </Bar>
  );
});

export default SocialBar;

import { DeleteOutlined, SendOutlined, SmileOutlined } from '@ant-design/icons';
import { Avatar, Button, Input, message, Popconfirm, Popover, Spin } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { socialKey, SocialTargetType } from '../../models/socialModel';
import { useMobxStore } from '../../utils/mobxStore';
import SocialBar from './SocialBar';

/** The most common ones, and some for orienteering */
const emojis = [
  '😀',
  '😂',
  '😊',
  '😍',
  '🥰',
  '😎',
  '🤩',
  '😮',
  '😅',
  '😢',
  '😡',
  '🤔',
  '👍',
  '👎',
  '👏',
  '🙌',
  '💪',
  '🙏',
  '❤️',
  '🔥',
  '🎉',
  '🏆',
  '🥇',
  '🥈',
  '🥉',
  '🏃',
  '🧭',
  '🗺️',
  '🌲',
  '☀️',
  '🌧️',
  '❄️'
];
const maxLength = 1000;

const Section = styled.section`
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(128, 128, 128, 0.25);
  color: inherit;
  text-align: left;
`;
const Comment = styled.div`
  display: flex;
  gap: 8px;
  padding: 6px 0;
`;
const CommentBody = styled.div`
  flex: 1;
  min-width: 0;
`;
const CommentHeader = styled.div`
  font-size: 12px;
  .social-name {
    font-weight: 600;
  }
  .social-date {
    opacity: 0.65;
    margin-left: 6px;
  }
`;
const CommentText = styled.div`
  font-size: 13px;
  white-space: pre-line;
  overflow-wrap: anywhere;
`;
const NewComment = styled.div`
  display: flex;
  gap: 6px;
  align-items: flex-end;
  margin-top: 6px;
`;
const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 32px);
  gap: 2px;
  button {
    border: none;
    background: transparent;
    font-size: 20px;
    line-height: 32px;
    cursor: pointer;
    border-radius: 6px;
    padding: 0;
  }
  button:hover,
  button:focus-visible {
    background: rgba(128, 128, 128, 0.18);
  }
`;
const LoginLink = styled(Button)`
  &&& {
    padding: 0;
    color: inherit;
    text-decoration: underline;
  }
`;

interface ISocialSectionProps {
  targetType: SocialTargetType;
  targetId: string | number;
}

/** Reactions with names and the comments, e.g. in the modal of a news item */
const SocialSection = observer(({ targetType, targetId }: ISocialSectionProps) => {
  const { clubModel, socialModel, sessionModel, globalStateModel } = useMobxStore();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textAreaRef = useRef<TextAreaRef>(null);
  const details = socialModel.details.get(socialKey(targetType, targetId));

  useEffect(() => {
    if (!socialModel.enabled) return;
    setLoading(true);
    socialModel
      .loadDetails(targetType, targetId)
      .catch(e => messageApi.warning(`${t('social.LoadFailed')} (${clubModel.social?.queryUrl}: ${e?.message})`))
      .finally(() => setLoading(false));
  }, [clubModel, messageApi, socialModel, t, targetId, targetType]);

  if (!socialModel.enabled) return null;

  const insertEmoji = (emoji: string) => {
    const textArea = textAreaRef.current?.resizableTextArea?.textArea;
    const start = textArea?.selectionStart ?? text.length;
    const end = textArea?.selectionEnd ?? text.length;
    const newText = (text.slice(0, start) + emoji + text.slice(end)).slice(0, maxLength);
    setText(newText);
    setEmojiOpen(false);
    setTimeout(() => {
      textArea?.focus();
      textArea?.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const onSend = () => {
    if (!text.trim() || sending) return;
    setSending(true);
    socialModel
      .comment(targetType, targetId, text.trim())
      .then(() => setText(''))
      .catch(e => messageApi.error(e?.message))
      .finally(() => setSending(false));
  };

  const onDelete = (commentId: number) => socialModel.deleteComment(commentId).catch(e => messageApi.error(e?.message));

  return (
    <Section aria-label={t('social.Comments')} onClick={e => e.stopPropagation()}>
      {contextHolder}
      <SocialBar targetType={targetType} targetId={targetId} />
      <Spin spinning={loading && !details} size="small">
        {details?.commentList.map(comment => (
          <Comment key={comment.commentId}>
            <Avatar size="small" src={comment.pictureUrl ?? undefined}>
              {comment.name.charAt(0)}
            </Avatar>
            <CommentBody>
              <CommentHeader>
                <span className="social-name">{comment.name}</span>
                <span className="social-date">{dayjs(comment.creDate).format('YYYY-MM-DD HH:mm')}</span>
                {comment.canDelete ? (
                  <Popconfirm
                    title={t('social.DeleteComment')}
                    okText={t('common.Yes')}
                    cancelText={t('common.No')}
                    onConfirm={() => onDelete(comment.commentId)}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      aria-label={t('social.DeleteComment')}
                      style={{ color: 'inherit', opacity: 0.6 }}
                    />
                  </Popconfirm>
                ) : null}
              </CommentHeader>
              <CommentText>{comment.text}</CommentText>
            </CommentBody>
          </Comment>
        ))}
      </Spin>
      {sessionModel.canInteract ? (
        <NewComment>
          <Input.TextArea
            ref={textAreaRef}
            value={text}
            maxLength={maxLength}
            autoSize={{ minRows: 1, maxRows: 6 }}
            placeholder={t('social.WriteComment')}
            aria-label={t('social.WriteComment')}
            onChange={e => setText(e.target.value)}
            onPressEnter={e => {
              if (!e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <Popover
            open={emojiOpen}
            trigger="click"
            content={
              <EmojiGrid>
                {emojis.map(emoji => (
                  <button key={emoji} type="button" aria-label={emoji} onClick={() => insertEmoji(emoji)}>
                    {emoji}
                  </button>
                ))}
              </EmojiGrid>
            }
            onOpenChange={setEmojiOpen}
          >
            <Button icon={<SmileOutlined />} aria-label={t('social.Emojis')} />
          </Popover>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={sending}
            disabled={!text.trim()}
            aria-label={t('social.Send')}
            onClick={onSend}
          />
        </NewComment>
      ) : (
        <LoginLink type="link" onClick={() => globalStateModel.setLoginModalVisible(true)}>
          {t('social.LoginToComment')}
        </LoginLink>
      )}
    </Section>
  );
});

export default SocialSection;

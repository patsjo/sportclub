import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Alert, Button, MenuProps, message, Space, Typography } from 'antd';
import { observer } from 'mobx-react';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { applyMenuOrder, isDividerKey, menuOrderKey, newDividerKey } from '../../utils/menuOrder';
import { useMobxStore } from '../../utils/mobxStore';

type TopMenuItem = Exclude<NonNullable<MenuProps['items']>[number], null>;

const List = styled.ul`
  list-style: none;
  margin: 0 0 12px 0;
  padding: 0;
  max-width: 480px;
`;

const Row = styled.li<{ $dragging: boolean; $divider: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 4px;
  margin-bottom: 4px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background-color: ${props => (props.$divider ? '#fafafa' : '#ffffff')};
  box-shadow: ${props => (props.$dragging ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none')};
  position: relative;
  z-index: ${props => (props.$dragging ? 1 : 0)};
`;

const Handle = styled.button`
  border: 0;
  background: transparent;
  cursor: grab;
  padding: 6px 4px;
  font-size: 16px;
  color: #8c8c8c;
  /* The handle drags, the rest of the row scrolls the page on a phone */
  touch-action: none;
  &:active {
    cursor: grabbing;
  }
`;

const Label = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* The labels are the ones in the menu, e.g. a folder has a settings button that shall not be clicked here */
  pointer-events: none;
  /* The menu spaces the icons itself */
  .anticon,
  img {
    vertical-align: middle;
    margin-right: 8px;
  }
`;

const DividerLabel = styled.span`
  flex: 1 1 auto;
  color: #8c8c8c;
  &::before,
  &::after {
    content: '';
    display: inline-block;
    width: 24px;
    border-top: 1px solid #bfbfbf;
    vertical-align: middle;
    margin: 0 8px;
  }
`;

const itemLabel = (item: TopMenuItem): ReactNode =>
  'label' in item ? (
    <>
      {'icon' in item ? item.icon : null}
      {item.label}
    </>
  ) : null;

interface ISortableRowProps {
  id: string;
  index: number;
  count: number;
  label: ReactNode;
  name: string;
  onMove: (from: number, to: number) => void;
  onDelete?: () => void;
}

const SortableRow = ({ id, index, count, label, name, onMove, onDelete }: ISortableRowProps) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id
  });

  return (
    <Row
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      $dragging={isDragging}
      $divider={!!onDelete}
    >
      <Handle
        ref={setActivatorNodeRef}
        type="button"
        aria-label={t('menu.DragHandle', { name })}
        {...attributes}
        {...listeners}
      >
        <HolderOutlined />
      </Handle>
      {onDelete ? <DividerLabel>{t('menu.Divider')}</DividerLabel> : <Label>{label}</Label>}
      <Button
        type="text"
        size="small"
        icon={<ArrowUpOutlined />}
        aria-label={`${t('menu.MoveUp')} ${name}`}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      />
      <Button
        type="text"
        size="small"
        icon={<ArrowDownOutlined />}
        aria-label={`${t('menu.MoveDown')} ${name}`}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
      />
      {onDelete ? (
        <Button
          danger
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          aria-label={`${t('menu.Delete')} ${name}`}
          onClick={onDelete}
        />
      ) : null}
    </Row>
  );
};

/** An administrator drags the top level of the menu in the order that everyone sees */
const MenuOrder = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const [messageApi, contextHolder] = message.useMessage();
  const saveUrl = clubModel.settings?.saveUrl;
  const defaultItems = globalStateModel.defaultTopMenuItems as TopMenuItem[];
  const savedOrder = globalStateModel.menuOrder;
  const [keys, setKeys] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const createDivider = useCallback((key: string): TopMenuItem => ({ type: 'divider', key }), []);
  const itemsByKey = useMemo(() => {
    const map = new Map<string, TopMenuItem>();
    defaultItems.forEach(item => {
      const key = menuOrderKey(item);
      if (key) map.set(key, item);
    });
    return map;
  }, [defaultItems]);
  const toKeys = useCallback(
    (items: TopMenuItem[]) =>
      items.map(item => menuOrderKey(item)).filter((key): key is string => !!key && key !== 'htmlEditorLoading'),
    []
  );
  const defaultKeys = useMemo(
    () => toKeys(applyMenuOrder(defaultItems, [], createDivider)),
    [createDivider, defaultItems, toKeys]
  );

  // The saved order, until the administrator changes it
  useEffect(() => {
    if (!dirty) setKeys(toKeys(applyMenuOrder(defaultItems, savedOrder, createDivider)));
  }, [createDivider, defaultItems, dirty, savedOrder, toKeys]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const change = useCallback((newKeys: string[]) => {
    setKeys(newKeys);
    setDirty(true);
  }, []);

  const onMove = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= keys.length) return;
      change(arrayMove(keys, from, to));
    },
    [change, keys]
  );

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;
      onMove(keys.indexOf(String(active.id)), keys.indexOf(String(over.id)));
    },
    [keys, onMove]
  );

  const onSave = useCallback(() => {
    if (!saveUrl) return;
    // The default order is not saved, then new menu items keep their default place
    const isDefault = keys.length === defaultKeys.length && keys.every((key, index) => key === defaultKeys[index]);
    const order = isDefault ? [] : keys;
    setSaving(true);
    PostJsonData<string[]>(saveUrl, { iKey: 'MENU_ORDER', iValue: order }, true, sessionModel.authorizationHeader, 1)
      .then(saved => {
        globalStateModel.setMenuOrder(Array.isArray(saved) ? saved : order);
        setDirty(false);
        messageApi.success(t('menu.Saved'));
      })
      .catch(e => messageApi.error(t('menu.SaveFailed', { url: saveUrl, error: e?.message ?? String(e) }), 10))
      .finally(() => setSaving(false));
  }, [defaultKeys, globalStateModel, keys, messageApi, saveUrl, sessionModel.authorizationHeader, t]);

  if (!saveUrl) return <Alert showIcon type="info" title={t('menu.NotConfigured')} />;
  if (!sessionModel.loggedIn || !sessionModel.isAdmin)
    return <Alert showIcon type="info" title={t('menu.OnlyAdmin')} />;

  const nameOf = (key: string) => {
    if (isDividerKey(key)) return t('menu.Divider');
    const item = itemsByKey.get(key);
    const text = (node: ReactNode): string =>
      typeof node === 'string' || typeof node === 'number'
        ? String(node)
        : Array.isArray(node)
          ? node.map(text).join('')
          : node && typeof node === 'object' && 'props' in node
            ? text((node.props as { children?: ReactNode }).children)
            : '';
    return (item && 'label' in item ? text(item.label).trim() : '') || key;
  };

  return (
    <>
      {contextHolder}
      <Typography.Title level={3}>{t('menu.MenuOrder')}</Typography.Title>
      <Typography.Paragraph style={{ maxWidth: 480 }}>{t('menu.MenuOrderInfo')}</Typography.Paragraph>
      {savedOrder.length === 0 && !dirty ? (
        <Alert showIcon type="info" title={t('menu.DefaultOrderInfo')} style={{ marginBottom: 12, maxWidth: 480 }} />
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={keys} strategy={verticalListSortingStrategy}>
          <List>
            {keys.map((key, index) => {
              const item = itemsByKey.get(key);
              return (
                <SortableRow
                  key={key}
                  id={key}
                  index={index}
                  count={keys.length}
                  name={nameOf(key)}
                  label={item ? itemLabel(item) : key}
                  onMove={onMove}
                  onDelete={isDividerKey(key) ? () => change(keys.filter(k => k !== key)) : undefined}
                />
              );
            })}
          </List>
        </SortableContext>
      </DndContext>
      <Space wrap style={{ marginBottom: 12 }}>
        <Button icon={<PlusOutlined />} onClick={() => change([...keys, newDividerKey(keys)])}>
          {t('menu.AddDivider')}
        </Button>
        <Button onClick={() => change(defaultKeys)}>{t('menu.DefaultOrder')}</Button>
        <Button type="primary" loading={saving} disabled={!dirty} onClick={onSave}>
          {t('common.Save')}
        </Button>
      </Space>
      {dirty ? <Alert showIcon type="warning" title={t('menu.Unsaved')} style={{ maxWidth: 480 }} /> : null}
    </>
  );
});

export default MenuOrder;

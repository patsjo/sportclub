import { QuestionCircleOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import SimpleHtmlText from './SimpleHtmlText';

const HelpTable = styled.table`
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    text-align: left;
    padding: 4px 12px 4px 0;
    border-bottom: 1px solid rgba(128, 128, 128, 0.2);
    vertical-align: top;
  }
  code {
    font-size: 12px;
    background: rgba(128, 128, 128, 0.12);
    border-radius: 3px;
    padding: 0 3px;
    white-space: nowrap;
  }
`;
const HelpIcon = styled(QuestionCircleOutlined)`
  margin-left: 6px;
  color: rgba(128, 128, 128, 0.85);
  cursor: help;
`;

// {label} is the translated name, e.g. <b>Fetstil</b>
const examples: {
  key: 'Link' | 'Bold' | 'Italic' | 'Underline' | 'Strikethrough' | 'Superscript' | 'Subscript';
  html: string[];
  result: string;
}[] = [
  {
    key: 'Link',
    html: ['<a href="https://…">…</a>'],
    result: '<a href="https://www.svenskorientering.se">svenskorientering.se</a>'
  },
  { key: 'Bold', html: ['<b>', '<strong>'], result: '<b>{label}</b>' },
  { key: 'Italic', html: ['<i>', '<em>'], result: '<i>{label}</i>' },
  { key: 'Underline', html: ['<u>'], result: '<u>{label}</u>' },
  { key: 'Strikethrough', html: ['<s>', '<del>'], result: '<s>{label}</s>' },
  { key: 'Superscript', html: ['<sup>'], result: 'x<sup>2</sup>' },
  { key: 'Subscript', html: ['<sub>'], result: 'H<sub>2</sub>O' }
];

/** A help icon for the label of a text field, that shows the tags that can be used */
const SimpleHtmlHelp = () => {
  const { t } = useTranslation();

  return (
    <Popover
      trigger={['hover', 'click']}
      title={t('formatting.Title')}
      content={
        <>
          <HelpTable>
            <thead>
              <tr>
                <th>{t('formatting.Look')}</th>
                <th>HTML</th>
                <th>{t('formatting.Result')}</th>
              </tr>
            </thead>
            <tbody>
              {examples.map(example => (
                <tr key={example.key}>
                  <td>{t(`formatting.${example.key}`)}</td>
                  <td>
                    {example.html.map((html, index) => (
                      <span key={html}>
                        {index > 0 ? ` ${t('formatting.Or')} ` : ''}
                        <code>{html}</code>
                      </span>
                    ))}
                  </td>
                  <td>
                    <SimpleHtmlText text={example.result.replace('{label}', t(`formatting.${example.key}`))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </HelpTable>
          <p style={{ marginTop: 8, marginBottom: 0, maxWidth: 420, fontSize: 12 }}>{t('formatting.Info')}</p>
        </>
      }
    >
      <HelpIcon aria-label={t('formatting.Title')} onClick={e => e.preventDefault()} />
    </Popover>
  );
};

export default SimpleHtmlHelp;

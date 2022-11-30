/**
 * @license Copyright (c) 2014-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */
import Alignment from '@ckeditor/ckeditor5-alignment/src/alignment.js';
import Autoformat from '@ckeditor/ckeditor5-autoformat/src/autoformat.js';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold.js';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic.js';
import BlockQuote from '@ckeditor/ckeditor5-block-quote/src/blockquote.js';
import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor.js';
import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials.js';
import Heading from '@ckeditor/ckeditor5-heading/src/heading.js';
import Image from '@ckeditor/ckeditor5-image/src/image.js';
import ImageCaption from '@ckeditor/ckeditor5-image/src/imagecaption.js';
import ImageInsert from '@ckeditor/ckeditor5-image/src/imageinsert.js';
import ImageResize from '@ckeditor/ckeditor5-image/src/imageresize.js';
import ImageStyle from '@ckeditor/ckeditor5-image/src/imagestyle.js';
import ImageToolbar from '@ckeditor/ckeditor5-image/src/imagetoolbar.js';
import ImageUpload from '@ckeditor/ckeditor5-image/src/imageupload.js';
import Indent from '@ckeditor/ckeditor5-indent/src/indent.js';
import Link from '@ckeditor/ckeditor5-link/src/link.js';
import LinkImage from '@ckeditor/ckeditor5-link/src/linkimage.js';
import List from '@ckeditor/ckeditor5-list/src/list.js';
import MediaEmbed from '@ckeditor/ckeditor5-media-embed/src/mediaembed.js';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import PasteFromOffice from '@ckeditor/ckeditor5-paste-from-office/src/pastefromoffice';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import Table from '@ckeditor/ckeditor5-table/src/table.js';
import TableCellProperties from '@ckeditor/ckeditor5-table/src/tablecellproperties';
import TableProperties from '@ckeditor/ckeditor5-table/src/tableproperties';
import TableToolbar from '@ckeditor/ckeditor5-table/src/tabletoolbar.js';
import TextTransformation from '@ckeditor/ckeditor5-typing/src/texttransformation.js';
import { StickyPanelView } from '@ckeditor/ckeditor5-ui';
import Base64UploadAdapter from '@ckeditor/ckeditor5-upload/src/adapters/base64uploadadapter.js';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import './ckeditor5.css';

const StyledCKEditor = styled(CKEditor)`
  &&& {
    margin-top: 8px;
    margin-bottom: 8px;
  }
  &&& .ck.ck-toolbar {
    ${(props) => (props.isReadOnly ? 'display: none;' : '')}
  }
`;
interface ICustomCKEditor {
  data: string;
  isReadOnly: boolean;
  onReady: (editor: ClassicEditor) => void;
}

const CustomCKEditor = ({ data, isReadOnly, onReady }: ICustomCKEditor) => {
  const [currentEditor, setCurrentEditor] = useState<ClassicEditor>();
  const toolbarContainer = useRef<StickyPanelView>();

  useEffect(() => {
    if (currentEditor) {
      currentEditor.set({ isReadOnly: isReadOnly });
    }
  }, [currentEditor, isReadOnly]);

  useEffect(() => {
    if (currentEditor && toolbarContainer.current) {
      try {
        if (isReadOnly) {
          currentEditor.ui.view.top.remove(toolbarContainer.current as any);
        } else {
          currentEditor.ui.view.top.add(toolbarContainer.current as any);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }, [currentEditor, isReadOnly]);

  return (
    <StyledCKEditor
      editor={ClassicEditor}
      config={{
        plugins: [
          Alignment,
          Autoformat,
          Base64UploadAdapter,
          BlockQuote,
          Bold,
          Essentials,
          Heading,
          Image,
          ImageCaption,
          ImageInsert,
          ImageResize,
          ImageStyle,
          ImageToolbar,
          ImageUpload,
          Indent,
          Italic,
          Link,
          LinkImage,
          List,
          MediaEmbed,
          Paragraph,
          PasteFromOffice,
          Table,
          TableCellProperties,
          TableProperties,
          TableToolbar,
          TextTransformation,
        ],
        image: {
          customClass: ['ui', 'fluid', 'image'], // Use whatever class names defined in your theme
          styles: ['alignLeft', 'alignCenter', 'alignRight'],
          resizeOptions: [
            {
              name: 'imageResize:original',
              label: 'Original',
              value: null,
            },
            {
              name: 'imageResize:50',
              label: '50%',
              value: '50',
            },
            {
              name: 'imageResize:75',
              label: '75%',
              value: '75',
            },
          ],
          toolbar: [
            'imageStyle:alignLeft',
            'imageStyle:alignCenter',
            'imageStyle:alignRight',
            '|',
            'imageResize',
            '|',
            'imageTextAlternative',
          ],
        },
        table: {
          customClass: ['ui', 'table', 'celled'], // Important!!! need to be array
          contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableCellProperties', 'tableProperties'],
        },
        toolbar: {
          items: [
            'heading',
            '|',
            'bold',
            'italic',
            'link',
            'bulletedList',
            'numberedList',
            '|',
            'indent',
            'outdent',
            '|',
            'imageUpload',
            'insertImage',
            'blockQuote',
            'insertTable',
            'mediaEmbed',
            'undo',
            'redo',
          ],
        },
        language: 'sv',
      }}
      data={data}
      onReady={(editor: ClassicEditor) => {
        toolbarContainer.current = editor.ui.view.stickyPanel;
        setCurrentEditor(editor);
        onReady(editor);
      }}
    />
  );
};

export default CustomCKEditor;

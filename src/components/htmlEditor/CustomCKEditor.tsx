/**
 * @license Copyright (c) 2014-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import 'ckeditor5/ckeditor5.css';
import {
  Alignment,
  Autoformat,
  Base64UploadAdapter,
  BlockQuote,
  Bold,
  ClassicEditor,
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
  StickyPanelView,
  Table,
  TableCellProperties,
  TableProperties,
  TableToolbar,
  TextTransformation,
} from 'ckeditor5';

interface IConatinerProps {
  isReadOnly: boolean;
}
const Container = styled.div<IConatinerProps>`
  margin-top: ${(props) => (props.isReadOnly ? '0' : '8')}px;
  margin-bottom: ${(props) => (props.isReadOnly ? '0' : '8')}px;

  &&&&&& .ck-sticky-panel {
    ${(props) => (props.isReadOnly ? 'display: none;' : '')}
  }
  &&&&&& .ck-read-only {
    border: 0;
    padding: 0;
  }
`;
interface ICustomCKEditor {
  data: string;
  isReadOnly: boolean;
  onReady: (editor: ClassicEditor) => void;
}

const CustomCKEditor = observer(({ data, isReadOnly, onReady }: ICustomCKEditor) => {
  const [currentEditor, setCurrentEditor] = useState<ClassicEditor>();
  const toolbarContainer = useRef<StickyPanelView>();

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
    <Container isReadOnly={isReadOnly}>
      <CKEditor
        editor={ClassicEditor}
        config={{
          licenseKey: 'GPL',
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
        disabled={isReadOnly}
      />
    </Container>
  );
});

export default CustomCKEditor;

import { Alert, Spin } from 'antd';
import { observer } from 'mobx-react';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getPageId, getSubMenu } from '../../utils/htmlEditorMenuHelper';
import { useMobxStore } from '../../utils/mobxStore';
import HtmlEditor from '../htmlEditor/HtmlEditor';
import { SpinnerDiv } from '../styled/styled';
import ShowSubmenuItems from './ShowSubmenuItems';

const OtherRoutes = observer(() => {
  const location = useLocation();
  const { globalStateModel } = useMobxStore();
  const pageIdFromLocation = useMemo(
    () =>
      location.pathname === '/page/new'
        ? -1
        : globalStateModel.htmlEditorMenu
          ? (getPageId(globalStateModel.htmlEditorMenu, decodeURI(location.pathname)) ?? -1000)
          : undefined,
    [globalStateModel.htmlEditorMenu, location.pathname]
  );
  const subMenuFromLocation = useMemo(
    () =>
      location.pathname === '/page/new'
        ? undefined
        : globalStateModel.htmlEditorMenu
          ? (getSubMenu(globalStateModel.htmlEditorMenu, decodeURI(location.pathname)) ?? -1000)
          : undefined,
    [globalStateModel.htmlEditorMenu, location.pathname]
  );

  return pageIdFromLocation === -1000 && subMenuFromLocation === -1000 ? (
    <Alert showIcon title="Error" description="404 - Page not found" type="error" />
  ) : pageIdFromLocation !== undefined && pageIdFromLocation !== -1000 ? (
    <HtmlEditor pageIdFromLocation={pageIdFromLocation} />
  ) : subMenuFromLocation !== undefined && subMenuFromLocation !== -1000 ? (
    <ShowSubmenuItems subMenu={subMenuFromLocation} />
  ) : (
    <SpinnerDiv>
      <Spin size="large" />
    </SpinnerDiv>
  );
});

export default OtherRoutes;

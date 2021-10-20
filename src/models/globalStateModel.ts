import { MessageApi } from 'antd/lib/message';
import { History } from 'history';
import { cast, Instance, types } from 'mobx-state-tree';
import { PostJsonData } from '../utils/api';
import { getMenus } from '../utils/htmlEditorMenuHelper';
import { Graphic, GraphicAttributeTypesType, IGraphic } from './graphic';
import { IMenuSnapshotIn, Menu } from './htmlEditorModel';
import { IModule } from './mobxClubModel';
import { NewsModel } from './newsModel';
import { ISessionModel } from './sessionModel';

export const GlobalStateModel = types
  .model({
    rightMenuVisible: types.optional(types.boolean, false),
    startDate: types.maybeNull(types.string),
    endDate: types.maybeNull(types.string),
    type: types.maybeNull(types.integer),
    news: types.maybe(NewsModel),
    graphics: types.optional(types.array(Graphic), []),
    htmlEditorMenu: types.maybe(Menu),
  })
  .volatile((self) => ({
    updateGraphics: async (graphics: IGraphic[]) => {
      console.warn('globalStateModel.updateGraphics not set.');
    },
  }))
  .actions((self) => {
    return {
      setRightMenuVisible(value: boolean) {
        self.rightMenuVisible = value;
      },
      setUpdateGraphicCallback(callbackFunc: (graphics?: IGraphic[]) => Promise<void>) {
        self.updateGraphics = callbackFunc;
      },
      setDashboard(history: History, path: string, startDate?: string, endDate?: string, newsTypeId?: number) {
        self.news?.reset();
        self.startDate = startDate !== undefined ? startDate : null;
        self.endDate = endDate !== undefined ? endDate : null;
        self.type = newsTypeId !== undefined ? newsTypeId : null;
        self.rightMenuVisible = false;
        history.replace({ pathname: path });
      },
      setHtmlEditor(history: History, path: string) {
        self.rightMenuVisible = false;
        history.replace({ pathname: path });
      },
      setGraphics(type: GraphicAttributeTypesType, graphics: IGraphic[]) {
        self.graphics = cast(self.graphics.filter((gr) => gr.attributes?.type !== type));
        self.graphics = cast(self.graphics.concat(graphics));
        self.updateGraphics(self.graphics).then();
      },
      setHtmlEditorMenu(menu: IMenuSnapshotIn) {
        self.htmlEditorMenu = cast(menu);
      },
      fetchHtmlEditorMenu(htmlEditorModule: IModule, sessionModel: ISessionModel, message: MessageApi) {
        PostJsonData(
          htmlEditorModule.queryUrl,
          {
            iType: 'MENUS',
            username: sessionModel.username,
            password: sessionModel.password,
          },
          true,
          sessionModel.authorizationHeader
        )
          .then((menusResponse) => {
            (self as IGlobalStateModel).setHtmlEditorMenu(getMenus(menusResponse));
          })
          .catch((e) => {
            message.error(e.message);
          });
      },
    };
  });
export type IGlobalStateModel = Instance<typeof GlobalStateModel>;

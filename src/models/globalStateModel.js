import { types, flow } from "mobx-state-tree";
import { NewsModel } from "./newsModel";
import { Graphic } from "./graphic";
import { Menu } from "./htmlEditorModel";
import { PostJsonData } from '../utils/api';
import { getMenus } from '../utils/htmlEditorMenuHelper';
import { getEsriMap } from '../components/map/EsriMapHelper.js';

export const GlobalStateModel = types
  .model({
    rightMenuVisible: types.optional(types.boolean, false),
    startDate: types.maybeNull(types.string),
    endDate: types.maybeNull(types.string),
    type: types.maybeNull(types.integer),
    news: types.compose(NewsModel),
    graphics: types.optional(types.array(Graphic), []),
    htmlEditorMenu: types.maybe(Menu)
  })
  .volatile(self => ({
    map: undefined,
  }))
  .actions((self) => {
    return {
      setValue(key, value) {
        self[key] = value;
      },
      setMap: flow(function* setEsriMap(clubModel) {
        self.map = yield getEsriMap(self, clubModel);
      }),
      setRoute(history, path) {
        history.replace({ pathname: path });
      },
      setDashboard(history, path, startDate, endDate, type) {
        self.startDate = startDate;
        self.endDate = endDate;
        self.type = type;
        self.rightMenuVisible = false;
        self.setRoute(history, path);
      },
      setHtmlEditor(history, path) {
        self.rightMenuVisible = false;
        self.setRoute(history, path);
      },
      setGraphics(type, graphics) {
        self.graphics = self.graphics.filter((gr) => gr.attributes.type !== type);
        self.graphics = self.graphics.concat(graphics);
      },
      setHtmlEditorMenu(menu) {
        self.htmlEditorMenu = menu;
      },
      fetchHtmlEditorMenu(htmlEditorModule, sessionModel, message) {
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
            self.setHtmlEditorMenu(getMenus(menusResponse));
          })
          .catch((e) => {
            message.error(e.message);
          });
      }
    };
  });

import { types } from "mobx-state-tree";
import { NewsModel } from "./newsModel";
import { Graphic } from "./graphic";
import { Menu } from "./htmlEditorModel";
import { PostJsonData } from '../utils/api';
import { getMenus } from '../utils/htmlEditorMenuHelper';

export const dashboardContents = {
  home: 0,
  news: 1,
  scoringBoard: 2,
  calendar: 3,
  address: 4,
  photo: 5,
  info: 6,
  results: 7,
  individualResults: 8,
  ourSponsors: 9,
  resultsFees: 10,
  htmlEditor: 11
};

export const GlobalStateModel = types
  .model({
    dashboardContentId: types.optional(types.integer, dashboardContents.home),
    rightMenuVisible: types.optional(types.boolean, false),
    startDate: types.maybeNull(types.string),
    endDate: types.maybeNull(types.string),
    type: types.maybeNull(types.integer),
    pageId: types.maybe(types.integer),
    news: types.compose(NewsModel),
    graphics: types.optional(types.array(Graphic), []),
    htmlEditorMenu: types.maybe(Menu)
  })
  .actions((self) => {
    return {
      setValue(key, value) {
        self[key] = value;
      },
      setDashboard(dashboardContentId, startDate, endDate, type) {
        self.dashboardContentId = dashboardContentId;
        self.startDate = startDate;
        self.endDate = endDate;
        self.type = type;
        self.rightMenuVisible = false;
      },
      setHtmlEditor(pageId) {
        self.dashboardContentId = dashboardContents.htmlEditor;
        self.pageId = pageId;
        self.rightMenuVisible = false;
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

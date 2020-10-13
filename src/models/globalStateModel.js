import { types } from "mobx-state-tree";
import { NewsModel } from "./newsModel";
import { Graphic } from "./graphic";

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
  resultsFees: 10
};

export const GlobalStateModel = types
  .model({
    dashboardContentId: types.optional(types.integer, dashboardContents.home),
    rightMenuVisible: types.optional(types.boolean, false),
    startDate: types.maybeNull(types.string),
    endDate: types.maybeNull(types.string),
    type: types.maybeNull(types.integer),
    news: types.compose(NewsModel),
    graphics: types.optional(types.array(Graphic), [])
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
      setGraphics(type, graphics) {
        self.graphics = self.graphics.filter((gr) => gr.attributes.type !== type);
        self.graphics = self.graphics.concat(graphics);
      }
    };
  });

import { types } from "mobx-state-tree";
import { NewsModel } from "./newsModel";
import { Graphic } from "./graphic";
import { Menu } from "./htmlEditorModel";
import { PostJsonData } from '../utils/api';
import { getMenus } from '../utils/htmlEditorMenuHelper';

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
    MapView: undefined,
    GraphicsLayer: undefined,
    Graphic: undefined,
    Circle: undefined,
    WebMercatorUtils: undefined,
    Extent: undefined,
    geometryEngine: undefined,
    watchUtils: undefined,
    Home: undefined,
    Fullscreen: undefined,
    Expand: undefined,
    mapLoading: false
  }))
  .actions((self) => {
    return {
      setValue(key, value) {
        self[key] = value;
      },
      setMap(map, MapView, GraphicsLayer, Graphic, Circle, WebMercatorUtils, Extent, geometryEngine, watchUtils, Home, Fullscreen, LayerList, Expand) {
        self.map = map;
        self.MapView = MapView;
        self.GraphicsLayer = GraphicsLayer;
        self.Graphic = Graphic;
        self.Circle = Circle;
        self.WebMercatorUtils = WebMercatorUtils;
        self.Extent = Extent;
        self.geometryEngine = geometryEngine;
        self.watchUtils = watchUtils;
        self.Home = Home;
        self.Fullscreen = Fullscreen;
        self.LayerList = LayerList;
        self.Expand = Expand;
        self.mapLoading = false;
      },
      setMapLoading() {
        self.mapLoading = true;
      },
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

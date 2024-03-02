import { MessageApi } from 'antd/lib/message';
import { action, makeObservable, observable } from 'mobx';
import { NavigateFunction } from 'react-router-dom';
import { IFolderResponse, IMenuResponse } from 'utils/responseInterfaces';
import { PostJsonData } from '../utils/api';
import { getMenus } from '../utils/htmlEditorMenuHelper';
import { GraphicAttributeTypesType, IGraphic } from './graphic';
import { IMenu } from './htmlEditorModel';
import { IModule } from './mobxClubModel';
import { INewsModel, INewsModelProps, NewsModel } from './newsModel';
import { ISessionModel } from './sessionModel';

interface IGlobalStateModelProps {
  rightMenuVisible: boolean;
  startDate?: string;
  endDate?: string;
  type: number;
  news?: INewsModelProps;
  graphics: IGraphic[];
  htmlEditorMenu?: IMenu;
}

export interface IGlobalStateModel extends Omit<IGlobalStateModelProps, 'news'> {
  news?: INewsModel;
  updateGraphics: (graphics: IGraphic[]) => Promise<void>;
  setRightMenuVisible: (value: boolean) => void;
  setUpdateGraphicCallback: (callbackFunc: (graphics: IGraphic[]) => Promise<void>) => void;
  setDashboard: (
    navigate: NavigateFunction,
    path: string,
    startDate?: string,
    endDate?: string,
    newsTypeId?: number
  ) => void;
  setHtmlEditor: (navigate: NavigateFunction, path: string) => void;
  setGraphics: (types: GraphicAttributeTypesType[], graphics: IGraphic[]) => Promise<void>;
  setHtmlEditorMenu: (menu: IMenu) => void;
  fetchHtmlEditorMenu: (
    htmlEditorModule: IModule | undefined,
    filesModule: IModule | undefined,
    sessionModel: ISessionModel,
    message: MessageApi
  ) => Promise<void>;
}

export class GlobalStateModel implements IGlobalStateModel {
  rightMenuVisible = false;
  startDate?: string;
  endDate?: string;
  type = 0;
  news?: INewsModel;
  graphics: IGraphic[] = [];
  htmlEditorMenu?: IMenu;
  updateGraphics: (graphics: IGraphic[]) => Promise<void> = async (graphics: IGraphic[]) => {
    console.warn('globalStateModel.updateGraphics not set.');
  };

  constructor(options?: Partial<IGlobalStateModelProps>) {
    if (options) {
      const { news, ...rest } = options;
      Object.assign(this, rest);
      this.news = new NewsModel(news);
    } else {
      this.news = new NewsModel();
    }

    makeObservable(this, {
      rightMenuVisible: observable,
      startDate: observable,
      endDate: observable,
      type: observable,
      news: observable,
      graphics: observable,
      htmlEditorMenu: observable,
      setRightMenuVisible: action.bound,
      setDashboard: action.bound,
      setHtmlEditor: action.bound,
      setGraphics: action.bound,
      setHtmlEditorMenu: action.bound,
      fetchHtmlEditorMenu: action.bound,
    });
  }

  setRightMenuVisible(value: boolean) {
    this.rightMenuVisible = value;
  }

  setUpdateGraphicCallback(callbackFunc: (graphics: IGraphic[]) => Promise<void>) {
    this.updateGraphics = callbackFunc;
  }

  setDashboard(navigate: NavigateFunction, path: string, startDate?: string, endDate?: string, newsTypeId?: number) {
    this.news?.reset();
    this.startDate = startDate;
    this.endDate = endDate;
    this.type = newsTypeId !== undefined ? newsTypeId : 0;
    this.rightMenuVisible = false;
    navigate(path, { replace: true });
  }

  setHtmlEditor(navigate: NavigateFunction, path: string) {
    this.rightMenuVisible = false;
    navigate(path, { replace: true });
  }

  async setGraphics(types: GraphicAttributeTypesType[], graphics: IGraphic[]) {
    this.graphics = this.graphics.filter(
      (gr) => !(types as (GraphicAttributeTypesType | 'logo' | undefined)[]).includes(gr.attributes?.type)
    );
    this.graphics = [...this.graphics, ...graphics];
    await this.updateGraphics(this.graphics);
  }

  setHtmlEditorMenu(menu: IMenu) {
    this.htmlEditorMenu = menu;
  }

  async fetchHtmlEditorMenu(
    htmlEditorModule: IModule | undefined,
    filesModule: IModule | undefined,
    sessionModel: ISessionModel,
    message: MessageApi
  ) {
    try {
      const menusResponse = htmlEditorModule
        ? ((await PostJsonData(
            htmlEditorModule.queryUrl,
            {
              iType: 'MENUS',
              username: sessionModel.username,
              password: sessionModel.password,
            },
            true,
            sessionModel.authorizationHeader
          )) as IMenuResponse[] | undefined) ?? []
        : [];
      const filesResponse = filesModule
        ? ((await PostJsonData(
            filesModule.queryUrl,
            {
              iType: 'FILES',
              username: sessionModel.username,
              password: sessionModel.password,
            },
            true,
            sessionModel.authorizationHeader
          )) as IMenuResponse[] | undefined) ?? []
        : [];
      const foldersResponse = filesModule
        ? ((await PostJsonData(
            filesModule.queryUrl,
            {
              iType: 'FOLDERS',
              username: sessionModel.username,
              password: sessionModel.password,
            },
            true,
            sessionModel.authorizationHeader
          )) as IFolderResponse[] | undefined) ?? []
        : [];
      this.setHtmlEditorMenu(getMenus([...menusResponse, ...filesResponse], foldersResponse));
    } catch (e: any) {
      message.error(e?.message);
    }
  }
}

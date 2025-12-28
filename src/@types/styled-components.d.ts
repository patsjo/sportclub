import { IThemeProps } from 'models/mobxClubModel';

declare module 'styled-components' {
  export interface DefaultTheme extends IThemeProps {}
}

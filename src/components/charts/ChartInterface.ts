import { styled } from 'styled-components';

export const paletteColors = [
  '#03a9f4', // Blue-Green
  '#c603f4', // Purple
  '#00161f', // Black
  '#f40303', // Dark red
  '#30f403', // Green
  '#f47e03', // Orange
  '#808080', // Grey
  '#f4df03', // Yellow
  '#f4aa80', // Pink
  '#473310', // Brown
  '#0303c6' // Blue
];

export const getWidth = (dataLength: number, maxWidth?: number, totalWidth?: number) =>
  Math.max(
    175,
    maxWidth
      ? Math.min(maxWidth, 75 + 100 * dataLength, totalWidth ?? 400)
      : Math.min(75 + 150 * dataLength, totalWidth ?? 400)
  );

export interface ICustomChart {
  typeOfChart: 'line' | 'stackedbar';
  title: 'startsPerYear';
  dataKey: string;
  valueKeys: (string | number)[];
  valueColors?: string[];
  data: (Record<string, string> | Record<string | number, number>)[];
}

export interface ICustomChartProps extends ICustomChart {
  totalWidth?: number;
  maxWidth?: number;
}

interface IColProps {
  width: string;
}
export const Col = styled.div<IColProps>`
  display: inline-block;
  margin-left: 8px;
  margin-right: 8px;
  margin-bottom: 32px;
  vertical-align: bottom;
  height: 300px;
  width: ${({ width }: IColProps) => width};
  min-width: 400px;
`;

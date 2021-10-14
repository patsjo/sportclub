import React from 'react';
import styled from 'styled-components';

export interface IChildContainerProps {
  key: React.Key | null;
  column: number | undefined;
  preferredColumn?: number;
  marginBottom?: number;
}
export interface IChildColumn extends IChildContainerProps {
  height: number;
  reactChild: IChildColumnElement;
  updatedChilds?: IChildColumn[];
}

export type IChildColumnElement = React.ReactElement<IChildColumn>;

export const ChildContainer = styled.div<IChildContainerProps>`
  margin-bottom: ${(props) => (props.marginBottom !== undefined ? props.marginBottom + 'px' : 'unset')};
  width: 100%;
`;

const getColumn = (child: IChildColumn, columns: number, heights: number[]): number => {
  let index = 0;
  if (child.preferredColumn === undefined) {
    index = heights.indexOf(Math.min(...heights));
  } else if (child.preferredColumn === -50 && columns > 1) {
    const weightedHeights = heights.map((h, idx) =>
      h > 1280 ? h : idx < columns / 2 ? (h < 280 ? 840 : 840 + 0.44 * (h - 280)) : h
    );
    index = weightedHeights.indexOf(Math.min(...weightedHeights));
    if (index < 0) index = columns - 1;
  } else if (child.preferredColumn === 50 && columns > 1) {
    const weightedHeights = heights.map((h, idx) =>
      h > 1280 ? h : idx > columns / 2 ? (h < 280 ? 840 : 840 + 0.44 * (h - 280)) : h
    );
    index = weightedHeights.indexOf(Math.min(...weightedHeights));
    if (index < 0) index = 0;
  } else if (child.preferredColumn < 0 && columns > 2) {
    index = columns + child.preferredColumn;
    if (index < 0) index = 0;
  } else if (child.preferredColumn < 0) {
    index = columns - 1;
  } else if (child.preferredColumn < columns && columns > 2) {
    index = child.preferredColumn;
  } else if (child.preferredColumn < columns) {
    index = 0;
  } else {
    index = heights.indexOf(Math.min(...heights));
  }
  return index;
};

export const maxColumns = 5;

export const getDefaultChild = (reactChild: IChildColumnElement, columns: number): IChildColumn => {
  const child: IChildColumn = {
    key: reactChild!.key,
    preferredColumn: reactChild!.props.column,
    reactChild: reactChild,
    column: 0,
    height: 0,
  };
  child.column = getColumn(child, columns, [...Array(columns)].fill(0));

  return child;
};

export const recalculateChildDistribution = (
  updatedChilds: IChildColumn[],
  childHeights: Record<React.Key, number>,
  columns: number,
  recalculateAll: boolean,
  sendReparentableChild: (
    fromParentId: string,
    toParentId: string,
    childSelector: string | number,
    position: string | number,
    skipUpdate?: boolean | undefined
  ) => number
) => {
  let aboveChildAlreadyCalculated = !recalculateAll;
  const heights = [...Array(columns)].fill(0);
  const newChildDistribution = [...Array(maxColumns)].map((): IChildColumn[] => []);

  updatedChilds.forEach((child) => {
    if (child.key != null) {
      const newChildHeight = childHeights[child.key];
      if (aboveChildAlreadyCalculated && newChildHeight && newChildHeight === child.height && child.column! < columns) {
        heights[child.column!] += child.height;
      } else {
        aboveChildAlreadyCalculated = false;
        child.height = newChildHeight ? newChildHeight : 0;
        const index = getColumn(child, columns, heights);
        heights[index] += child.height;
        if (child.column !== index) {
          sendReparentableChild(
            `column#${child.column}`,
            `column#${index}`,
            `columnItem#${child.key}`,
            newChildDistribution[index].length,
            false
          );
          child.column = index;
        }
      }
      newChildDistribution[child.column!].push(child);
    }
  });

  return newChildDistribution;
};

const getColumn = (child, columns, heights) => {
  let index = 0;
  if (child.preferredColumn === undefined) {
    index = heights.indexOf(Math.min(...heights));
  } else if (child.preferredColumn === -50 && columns > 1) {
    const weightedHeights = heights.map((h, idx) => h > 1280 ? h : (idx < (columns / 2) ? (h < 280 ? 840 : 840 + 0.44 * (h-280)) : h));
    index = weightedHeights.indexOf(Math.min(...weightedHeights));
    if (index < 0) index = columns - 1;
  } else if (child.preferredColumn === 50 && columns > 1) {
    const weightedHeights = heights.map((h, idx) => h > 1280 ? h : (idx > (columns / 2) ? (h < 280 ? 840 : 840 + 0.44 * (h-280)) : h));
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
}

export const maxColumns = 5;

export const getDefaultChild = (reactChild, columns) => {
  const child = { key: reactChild.key, preferredColumn: reactChild.props.column, reactChild: reactChild, column: 0, height: 0 };
  child.column = getColumn(child, columns, [...Array(columns)].fill(0));

  return child;
}

export const recalculateChildDistribution = (updatedChilds, childHeights, columns, recalculateAll, sendReparentableChild) => {
  let aboveChildAlreadyCalculated = !recalculateAll;
  const heights = [...Array(columns)].fill(0);
  const newChildDistribution = [...Array(maxColumns)].map(() => []);

  updatedChilds.forEach((child) => {
    const newChildHeight = childHeights[child.key];
    if (aboveChildAlreadyCalculated && newChildHeight && newChildHeight === child.height && child.column < columns) {
      heights[child.column] += child.height;
    } else {
      aboveChildAlreadyCalculated = false;
      child.height = newChildHeight ? newChildHeight : 0;
      const index = getColumn(child, columns, heights);
      heights[index] += child.height;
      if (child.column !== index) {
        sendReparentableChild(`column#${child.column}`, `column#${index}`, `columnItem#${child.key}`, newChildDistribution[index].length);
        child.column = index;
      }
    }
    newChildDistribution[child.column].push(child);
  });

  return newChildDistribution;
}

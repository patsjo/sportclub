export const mapNodesToColumns = (children, columns) => {
  let heights = [];

  if (columns === 1) {
    return;
  }

  for (let i = 0; i < columns; i++) {
    heights[i] = 0;
  }
  children.forEach((child, i) => {
    let index = 0;
    if (child.preferredColumn === undefined) {
      index = heights.indexOf(Math.min(...heights));
    } else if (child.preferredColumn === -50 && columns > 1) {
      const weightedHeights = heights.map((h, idx) => h > 1000 ? h : (idx < (columns / 2) && h < 280 ? 280 : h) + 300 * ((columns - idx) / columns));
      index = weightedHeights.indexOf(Math.min(...weightedHeights));
      if (index < 0) index = columns - 1;
    } else if (child.preferredColumn === 50 && columns > 1) {
      const weightedHeights = heights.map((h, idx) => h > 1000 ? h : (idx >= (columns / 2) && h < 280 ? 280 : h) + 300 * ((1 + idx) / columns));
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
    child.column = index;
    heights[index] += child.height;
  });
}

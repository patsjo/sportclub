export default function mapNodesToColumns({ children = [], columns = 1, dimensions = [] } = {}) {
  let nodes = [];
  let heights = [];

  if (columns === 1) {
    return children;
  }

  // use dimensions to calculate the best column for each child
  if (dimensions.length && dimensions.length === children.length) {
    for (let i = 0; i < columns; i++) {
      nodes[i] = [];
      heights[i] = 0;
    }
    children.forEach((child, i) => {
      let { height } = dimensions[i];
      let index = 0;
      if (child.props.column === undefined) {
        index = heights.indexOf(Math.min(...heights));
      } else if (child.props.column < 0 && columns > 2) {
        index = columns + child.props.column;
        if (index < 0) index = 0;
      } else if (child.props.column < 0) {
        index = columns - 1;
      } else if (child.props.column < columns && columns > 2) {
        index = child.props.column;
      } else if (child.props.column < columns) {
        index = 0;
      } else {
        index = heights.indexOf(Math.min(...heights));
      }
      nodes[index].push(child);
      heights[index] += !height ? 30 : height;
    });
  }
  // equally spread the children across the columns
  else {
    for (let i = 0; i < columns; i++) {
      nodes[i] = children.filter((child, j) => j % columns === i);
    }
  }

  return nodes;
}

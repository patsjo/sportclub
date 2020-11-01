import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { mediaQueryMapper } from './mq';
import mapNodesToColumns from './mapNodesToColumns';
import styled from 'styled-components';

const flatten = (list) => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

const StyledColumn = styled.div`
  border-left: ${(props) => (props.column > 0 ? '#808080 dotted 1px' : 'unset')};
  box-sizing: border-box;
  float: left;
  width: ${(props) => (1 / props.columns) * 100}%;
  padding-left: ${(props) => (props.column > 0 ? props.gap : 0)}px;
  padding-right: ${(props) => (props.column < props.columns - 1 ? props.gap : 0)}px;
`;

class Columns extends Component {
  constructor(props) {
    super(props);
    this.setColumns = this.setColumns.bind(this);
    this.state = {
      columns: 1,
      dimensions: [],
      refsCount: 0,
    };
    this.refs = [];
  }

  componentDidUpdate(prevProps, prevState) {
    const { dimensions } = this.state;
    const dims =
      this.refs && this.refs.length > 0
        ? this.refs.map((ref) => ({
            width: !ref.current || !ref.current.clientWidth ? 0 : ref.current.clientWidth,
            height: !ref.current || !ref.current.clientHeight ? 0 : ref.current.clientHeight,
          }))
        : [];

    if (this.state.columns > 1 && JSON.stringify(dimensions) !== JSON.stringify(dims)) {
      this.setState({ dimensions: dims });
    }
  }

  componentDidMount() {
    this.updateColumns(this.props);
  }

  componentWillReceiveProps(nextProps) {
    const queriesChanged = JSON.stringify(this.props.queries) !== JSON.stringify(nextProps.queries);
    const columnsChanged = this.props.columns !== nextProps.columns;
    if (queriesChanged || columnsChanged) {
      this.updateColumns(nextProps);
    }
  }

  componentWillUnmount() {
    this.removeColumnListeners();
  }

  updateColumns(props) {
    if (props.queries.length) {
      this.removeColumnListeners();
      this._columns = mediaQueryMapper({
        queries: props.queries,
        valueKey: 'columns',
        defaultValue: props.queries.length ? 1 : props.columns,
        onChange: this.setColumns,
      });
      this.setColumns();
    }
  }

  setColumns() {
    this.setState(() => ({
      columns: this._columns.getValue(),
    }));
  }

  removeColumnListeners() {
    if (this._columns) {
      this._columns.removeListeners();
    }
  }

  renderColumns(columns) {
    const { children, gap } = this.props;
    const { dimensions, refsCount } = this.state;
    const allChildren = flatten(children).filter((child) => child);

    if (columns > 1) {
      this.refs = [];
      const childrenWithRef = React.Children.map(allChildren, (child, index) => {
        const ref = React.createRef();
        this.refs.push(ref);

        return React.cloneElement(child, { ref: ref, key: child.key });
      });

      if (allChildren.length !== refsCount) {
        this.setState({ refsCount: this.refs.length });
        return childrenWithRef;
      }
      const columnsContainers = mapNodesToColumns({
        children: childrenWithRef,
        columns,
        dimensions,
      });
      const renderedColumns = columnsContainers.map((column, i) => (
        <StyledColumn key={i} column={i} columns={columns} gap={gap}>
          {column}
        </StyledColumn>
      ));
      return renderedColumns;
    } else {
      return children;
    }
  }

  render() {
    const { className, rootStyles } = this.props;
    const { columns } = this.state;

    return (
      <div className={className} style={rootStyles}>
        {this.renderColumns(columns)}
        <div style={{ clear: 'both' }}></div>
      </div>
    );
  }
}

Columns.defaultProps = {
  className: '',
  rootStyles: {
    overflowX: 'hidden',
  },
  queries: [
    {
      columns: 1,
      query: 'min-width: 0px',
    },
    {
      columns: 2,
      query: 'min-width: 700px',
    },
    {
      columns: 3,
      query: 'min-width: 1000px',
    },
    {
      columns: 4,
      query: 'min-width: 1400px',
    },
    {
      columns: 5,
      query: 'min-width: 1900px',
    },
  ],
  gap: 8,
};

Columns.propTypes = {
  className: PropTypes.string,
  rootStyles: PropTypes.object,
  query: PropTypes.array,
  gap: PropTypes.number,
};

export default Columns;

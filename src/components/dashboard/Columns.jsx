import React, { Component } from 'react';
import Columns from './columns/Columns';
import styled from 'styled-components';

const StyledColumns = styled(Columns)`
  &&& + div {
    margin-left: 0;
    margin-right: 0;
  }
  &&& + div + div {
    border-left: #808080 dotted 1px;
  }
`;

class ExportColumns extends Component {
  constructor(props) {
    super(props);

    this.state = {
      dimensions: [],
    };
    this.refsArray = [];
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.dimensions.length !== this.refsArray.length) {
      const refs = this.refsArray;

      if (refs.length > 0 && refs[refs.length - 1].current.clientHeight) {
        const dims = refs.map((ref) => ({
          width: ref.current.clientWidth,
          height: ref.current.clientHeight,
        }));

        this.setState({ dimensions: dims });
      } else if (this.state.dimensions.length > 0) {
        this.setState({ dimensions: [] });
      }
    }
  }

  render() {
    const { dimensions } = this.state;

    this.refsArray = [];

    return (
      <StyledColumns
        dimensions={dimensions}
        queries={[
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
        ]}
        gap={12}
      >
        {this.props.children}
      </StyledColumns>
    );
  }
}

export default ExportColumns;

import React from 'react';

const red = '#E31F25';

const Star = ({ size = 40, filled = false, ...props }) => (
  <svg viewBox="-110 -124 220 220" width={size} height={size} {...props}>
    <g id="Star" fill={filled ? red : 'none'} stroke={red} stroke-width="8" stroke-linecap="round">
      <path d="m0-100l22.4514 69.0983 72.6543 0-58.7781 42.7051 22.4509 69.0983-58.7785-42.7051-58.7785 42.7051 22.4509-69.0983-58.7781-42.7051 72.6543 0z" />
    </g>
  </svg>
);

export default Star;

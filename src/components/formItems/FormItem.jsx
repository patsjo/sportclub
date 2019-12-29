import { Form } from "antd";
import styled from "styled-components";

const FormItem = styled(Form.Item)`
  &&& {
    margin-bottom: 0px;
  }
  &&& .ant-form-item-label {
    font-size: 11px;
    margin-bottom: -5px;
    line-height: 26px;
  }
  &&& .ant-form-item-control {
    line-height: unset;
  }
`;

export default FormItem;

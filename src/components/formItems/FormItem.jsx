import { Form } from "antd";
import styled from "styled-components";

const FormItem = styled(Form.Item)`
  &&& {
    margin-bottom: 0px;
  }
  &&& .ant-form-item-label {
    font-size: 11px;
    line-height: 20px;
    padding-bottom: 0px;
    padding-top: 4px;
  }
  &&& .ant-form-item-control {
    line-height: unset;
  }
  &&& .ant-form-item-control-input {
    min-height: unset;
  }
`;

export default FormItem;

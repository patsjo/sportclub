import React, { Component } from "react";
import styled from "styled-components";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import Button from "@material-ui/core/Button";
import PropTypes from "prop-types";
import { withNamespaces } from "react-i18next";

const StyledDialog = styled(Dialog)`
  &&& .MuiPaper-root-10 {
    max-width: 750px;
    margin: 24px;
  }
`;

const ItemHolder = styled.div`
  max-height: 300px;
  overflow: hidden;
`;
const ItemFadeOut = styled.div`
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
  break-inside: avoid-column;
  max-height: 300px;
  overflow: hidden;
  position: relative;
  white-space: nowrap;
  :after {
    content: "";
    position: absolute;
    top: 250px;
    right: 0;
    width: 100%;
    height: 50px;
    background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiP…dpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==);
    background-size: 100%;
    background-image: -webkit-gradient(
      linear,
      50% 0%,
      50% 100%,
      color-stop(0%, rgba(255, 255, 255, 0)),
      color-stop(80%, #ffffff),
      color-stop(100%, #ffffff)
    );
    background-image: -moz-linear-gradient(
      top,
      rgba(255, 255, 255, 0) 0%,
      #ffffff 80%,
      #ffffff 100%
    );
    background-image: -webkit-linear-gradient(
      top,
      rgba(255, 255, 255, 0) 0%,
      #ffffff 80%,
      #ffffff 100%
    );
    background-image: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0) 0%,
      #ffffff 80%,
      #ffffff 100%
    );
    pointer-events: none;
  }
`;
const StyledDialogContentText = styled(DialogContentText)`
  -webkit-columns: 3 200px;
  -moz-columns: 3 200px;
  columns: 3 200px;
  -webkit-column-gap: 1em;
  -moz-column-gap: 1em;
  column-gap: 1em;
  -webkit-column-rule: 1px dotted #ccc;
  -moz-column-rule: 1px dotted #ccc;
  column-rule: 1px dotted #ccc;
`;

class FadeOutItem extends Component {
  static propTypes = {
    content: PropTypes.object.isRequired,
    modalContent: PropTypes.object.isRequired,
    editFormContent: PropTypes.object
  };
  constructor(props) {
    super(props);
    this.state = {
      showModalItem: false,
      showEdit: false
    };
    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
  }

  openModal() {
    this.setState({
      showModalItem: true
    });
  }

  closeModal() {
    this.setState({
      showModalItem: false,
      showEdit: false
    });
  }

  render() {
    const { t } = this.props;
    const ShowEditButton =
      this.props.editFormContent !== undefined ? (
        <Button
          variant="contained"
          onClick={() =>
            this.setState({ showEdit: true, showModalItem: false })
          }
        >
          {t("common.Edit")}
        </Button>
      ) : null;

    const EditFormContent =
      this.props.editFormContent !== undefined
        ? React.cloneElement(this.props.editFormContent, {
            open: this.state.showEdit,
            onClose: this.closeModal
          })
        : null;

    return (
      <ItemHolder>
        <ItemFadeOut onClick={this.openModal}>{this.props.content}</ItemFadeOut>
        <StyledDialog
          open={this.state.showModalItem}
          onClose={this.closeModal}
          onEscapeKeyDown={this.closeModal}
          onBackdropClick={this.closeModal}
        >
          <DialogContent>
            <StyledDialogContentText>
              {this.props.modalContent}
            </StyledDialogContentText>
          </DialogContent>
          <DialogActions>
            {ShowEditButton}
            <Button
              variant="contained"
              color="primary"
              onClick={this.closeModal}
            >
              {t("common.Close")}
            </Button>
          </DialogActions>
        </StyledDialog>
        {EditFormContent}
      </ItemHolder>
    );
  }
}

const FadeOutItemWithI18n = withNamespaces()(FadeOutItem); // pass `t` function to App

export default FadeOutItemWithI18n;

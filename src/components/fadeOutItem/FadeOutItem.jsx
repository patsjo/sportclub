import React, { Component } from "react";
import styled from "styled-components";
import { Button, Modal, Popconfirm, message } from "antd";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";
import { observer, inject } from "mobx-react";
import withForwardedRef from "../../utils/withForwardedRef";

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
  cursor: pointer;
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
    background-image: -moz-linear-gradient(top, rgba(255, 255, 255, 0) 0%, #ffffff 80%, #ffffff 100%);
    background-image: -webkit-linear-gradient(top, rgba(255, 255, 255, 0) 0%, #ffffff 80%, #ffffff 100%);
    background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, #ffffff 80%, #ffffff 100%);
    pointer-events: none;
  }
`;
const StyledModalContent = styled.div`
  -webkit-columns: ${props => props.columns} 200px;
  -moz-columns: ${props => props.columns} 200px;
  columns: ${props => props.columns} 200px;
  -webkit-column-gap: 1em;
  -moz-column-gap: 1em;
  column-gap: 1em;
  -webkit-column-rule: 1px dotted #ccc;
  -moz-column-rule: 1px dotted #ccc;
  column-rule: 1px dotted #ccc;
`;

// @inject("sessionModel")
// @observer
const FadeOutItem = inject("sessionModel")(
  observer(
    class FadeOutItem extends Component {
      static propTypes = {
        content: PropTypes.object.isRequired,
        module: PropTypes.object.isRequired,
        modalContent: PropTypes.object.isRequired,
        modalColumns: PropTypes.number.isRequired,
        editFormContent: PropTypes.object,
        deletePromise: PropTypes.func,
        onDelete: PropTypes.func
      };
      constructor(props) {
        super(props);
        this.state = {
          saving: false,
          showModalItem: false,
          showEdit: false
        };
      }

      openModal = () => {
        this.setState({
          showModalItem: true
        });
      };

      closeModal = () => {
        this.setState({
          saving: false,
          showModalItem: false,
          showEdit: false
        });
      };

      render() {
        const {
          t,
          modalColumns,
          sessionModel,
          editFormContent,
          module,
          deletePromise,
          onDelete,
          forwardedRef
        } = this.props;
        const self = this;

        const ShowEditButton =
          // eslint-disable-next-line eqeqeq
          editFormContent != undefined && module.updateUrl != undefined && sessionModel.loggedIn ? (
            <Button loading={this.state.saving} onClick={() => this.setState({ showEdit: true, showModalItem: false })}>
              {t("common.Edit")}
            </Button>
          ) : null;

        const ShowDeleteButton =
          // eslint-disable-next-line eqeqeq
          module.deleteUrl != undefined && deletePromise && sessionModel.loggedIn ? (
            <Popconfirm
              title={t("common.Confirm")}
              okText={t("common.Yes")}
              cancelText={t("common.No")}
              onConfirm={() => {
                this.setState({
                  saving: true
                });
                deletePromise()
                  .then(() => {
                    onDelete && onDelete();
                    self.closeModal();
                  })
                  .catch(e => {
                    message.error(e.message);
                    self.setState({
                      saving: false
                    });
                  });
              }}
            >
              <Button type="danger" loading={this.state.saving}>
                {t("common.Delete")}
              </Button>
            </Popconfirm>
          ) : null;

        const EditFormContent = ShowEditButton
          ? React.cloneElement(editFormContent, {
              open: this.state.showEdit,
              onClose: this.closeModal
            })
          : null;

        return (
          <ItemHolder ref={forwardedRef}>
            <ItemFadeOut onClick={this.openModal}>{this.props.content}</ItemFadeOut>
            <Modal
              closable={false}
              centered={true}
              visible={this.state.showModalItem}
              onCancel={this.closeModal}
              footer={[
                ShowDeleteButton,
                ShowEditButton,
                <Button type="primary" onClick={this.closeModal} loading={this.state.saving}>
                  {t("common.Close")}
                </Button>
              ]}
            >
              <StyledModalContent columns={modalColumns}>{this.props.modalContent}</StyledModalContent>
            </Modal>
            {EditFormContent}
          </ItemHolder>
        );
      }
    }
  )
);

const FadeOutItemWithI18n = withTranslation()(FadeOutItem); // pass `t` function to App

export default withForwardedRef(FadeOutItemWithI18n);

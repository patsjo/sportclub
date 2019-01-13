import React, { Component } from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import PropTypes from "prop-types";
import { observer, inject } from "mobx-react";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import { withNamespaces } from "react-i18next";

// @inject("clubModel")
// @observer
const NewsEdit = inject("clubModel")(
  observer(
    class NewsEdit extends Component {
      static propTypes = {
        newsObject: PropTypes.object.isRequired,
        open: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired
      };

      constructor(props) {
        super(props);
        this.state = {
          saving: false,
          formValues: {
            id: 0,
            typeId: 1,
            header: "",
            link: "",
            introduction: "",
            text: "",
            expireDate: "",
            fileData: undefined,
            fileID: 0
          }
        };
        this.onSave = this.onSave.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
      }

      componentWillReceiveProps(nextProps) {
        this.setState({
          formValues: { ...nextProps.newsObject }
        });
      }

      handleInputChange(event) {
        const target = event.target;
        const value =
          target.type === "checkbox" ? target.checked : target.value;
        const name = target.name;

        this.setState({
          formValues: { ...this.state.formValues, [name]: value }
        });
      }

      onSave(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        // TODO: Implement fetch to update backend
        // this.props.newsObject is read only { ...this.state.formValues };
        this.props.onClose();
      }

      render() {
        const { t } = this.props;
        return (
          <Dialog
            open={this.props.open}
            onClose={this.props.onClose}
            onEscapeKeyDown={this.props.onClose}
            onBackdropClick={this.props.onClose}
          >
            <form onSubmit={this.onSave}>
              <DialogTitle>Redigera nyhet</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  <TextField
                    label={t("news.Header")}
                    type="text"
                    name="header"
                    value={this.state.formValues.header}
                    onChange={this.handleInputChange}
                    fullWidth={true}
                    margin="normal"
                  />
                  <TextField
                    label={t("news.Link")}
                    type="text"
                    name="link"
                    value={this.state.formValues.link}
                    onChange={this.handleInputChange}
                    fullWidth={true}
                    margin="normal"
                  />
                  <TextField
                    label={t("news.Introduction")}
                    type="text"
                    name="introduction"
                    value={this.state.formValues.introduction}
                    onChange={this.handleInputChange}
                    multiline={true}
                    rowsMax={3}
                    fullWidth={true}
                    margin="normal"
                  />
                  <TextField
                    label={t("news.Text")}
                    type="text"
                    name="text"
                    value={this.state.formValues.text}
                    onChange={this.handleInputChange}
                    multiline={true}
                    rowsMax={3}
                    fullWidth={true}
                    margin="normal"
                  />
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button variant="contained" color="primary" type="submit">
                  {t("common.Save")}
                </Button>
                <Button variant="contained" onClick={this.props.onClose}>
                  {t("common.Cancel")}
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        );
      }
    }
  )
);

const NewsEditWithI18n = withNamespaces()(NewsEdit); // pass `t` function to App

export default NewsEditWithI18n;

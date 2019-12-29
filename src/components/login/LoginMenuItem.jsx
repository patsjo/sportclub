import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { observer, inject } from "mobx-react";
import MenuItem from "../menu/MenuItem";
import LoginForm from "./LoginForm";
import { GetJsonData } from "../../utils/api";

// @inject("sessionModel", "clubModel")
// @observer
const LoginMenuItem = inject(
  "sessionModel",
  "clubModel",
  "globalStateModel"
)(
  observer(
    class LoginMenuItem extends Component {
      constructor(props) {
        super(props);
        this.state = {
          showLoginModal: false,
          loggingOut: false
        };
      }

      openModal = () => {
        const { sessionModel, globalStateModel } = this.props;
        if (sessionModel.loggedIn) {
          this.onLogout();
          return;
        }
        globalStateModel.setValue("rightMenuVisible", false);
        this.setState({
          showLoginModal: true
        });
      };

      closeModal = () => {
        this.setState({
          showLoginModal: false
        });
      };

      onLogout = () => {
        const { clubModel, sessionModel } = this.props;
        const self = this;
        this.setState({
          loggingOut: true
        });
        GetJsonData(clubModel.logoutUrl)
          .then(() => {
            sessionModel.setLogout();
            self.setState({
              loggingOut: false
            });
          })
          .catch(() => {
            sessionModel.setLogout();
            self.setState({
              loggingOut: false
            });
          });
      };

      render() {
        const { t, sessionModel } = this.props;
        const { showLoginModal } = this.state;

        return (
          <React.Fragment>
            <MenuItem
              key={"menuItem#login"}
              icon={sessionModel.loggedIn ? "LogoutIcon" : "LoginIcon"}
              name={
                sessionModel.loggedIn
                  ? t("common.Logout") + " " + sessionModel.name
                  : t("common.Login")
              }
              onClick={this.openModal}
            />
            <LoginForm open={showLoginModal} onClose={this.closeModal} />
          </React.Fragment>
        );
      }
    }
  )
);

const LoginMenuItemWithI18n = withTranslation()(LoginMenuItem); // pass `t` function to App

export default LoginMenuItemWithI18n;

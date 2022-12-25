ALTER TABLE activity
  ADD INDEX IDX_ACTIVITY_ACTIVITYTYPE (activity_type_id),
  ADD CONSTRAINT FK_ACTIVITY_ACTIVITYTYPE FOREIGN KEY (activity_type_id)
  REFERENCES activity_type(activity_type_id);
ALTER TABLE files
  ADD INDEX IDX_FILES_FOLDER (folder_id),
  ADD CONSTRAINT FK_FILES_FOLDER FOREIGN KEY (folder_id)
  REFERENCES folders(folder_id);
ALTER TABLE news
  ADD INDEX IDX_NEWS_NEWSTYPE (news_type_id),
  ADD CONSTRAINT FK_NEWS_NEWSTYPE FOREIGN KEY (news_type_id)
  REFERENCES news_type(news_type_id);
ALTER TABLE users
  ADD CONSTRAINT FK_USERS_COUNCIL FOREIGN KEY (council_id)
  REFERENCES councils(council_id);
DELETE FROM user_groups WHERE user_id not in (select user_id from users);
DELETE FROM user_groups WHERE group_id not in (select group_id from groups);
ALTER TABLE user_groups
  ADD CONSTRAINT FK_USERGROUPS_USER FOREIGN KEY (user_id)
  REFERENCES users(user_id),
  ADD CONSTRAINT FK_USERGROUPS_GROUP FOREIGN KEY (group_id)
  REFERENCES groups(group_id);
ALTER TABLE user_login
  ADD CONSTRAINT FK_USERLOGIN_USER FOREIGN KEY (user_id)
  REFERENCES users(user_id);

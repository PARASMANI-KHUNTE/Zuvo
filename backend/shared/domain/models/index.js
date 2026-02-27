const User = require("./User");
const Post = require("./Post");
const Comment = require("./Comment");
const Notification = require("./Notification");
const Conversation = require("./Conversation");
const Message = require("./Message");

module.exports = {
    User: () => User,
    Post: () => Post,
    Comment: () => Comment,
    Notification: () => Notification,
    Conversation: () => Conversation,
    Message: () => Message
};

const User = require("./User");
const Post = require("./Post");
const Comment = require("./Comment");
const Notification = require("./Notification");
const Conversation = require("./Conversation");
const Message = require("./Message");

const Relationship = require("./Relationship");
const SavedPost = require("./SavedPost");
const HiddenPost = require("./HiddenPost");
const Like = require("./Like");

module.exports = {
    User: () => User,
    Post: () => Post,
    Comment: () => Comment,
    Notification: () => Notification,
    Conversation: () => Conversation,
    Message: () => Message,
    Relationship: () => Relationship,
    SavedPost: () => SavedPost,
    HiddenPost: () => HiddenPost,
    Like: () => Like
};

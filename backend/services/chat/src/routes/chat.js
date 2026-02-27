const express = require("express");
const router = express.Router();
const { authenticate } = require("@zuvo/shared");
const {
    getConversations,
    getOrCreateConversation,
    getMessages,
    createGroup,
    sendMessage // HTTP fallback or for file uploads
} = require("../controllers/chat");

router.use(authenticate);

router.get("/conversations", getConversations);
router.get("/conversation/user/:userId", getOrCreateConversation);
router.get("/messages/:conversationId", getMessages);
router.post("/groups", createGroup);
router.post("/message", sendMessage);

module.exports = router;

const { Conversation, Message, asyncHandler } = require("@zuvo/shared");

/**
 * @desc    Get user's conversations
 * @route   GET /api/v1/chat/conversations
 */
exports.getConversations = asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({
        participants: { $in: [req.user.id] }
    })
        .populate("participants", "name username avatar")
        .populate("lastMessage")
        .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: conversations });
});

/**
 * @desc    Get message history for a conversation
 * @route   GET /api/v1/chat/messages/:conversationId
 */
exports.getMessages = asyncHandler(async (req, res) => {
    const messages = await Message.find({
        conversationId: req.params.conversationId
    })
        .populate("sender", "name username avatar")
        .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: messages });
});

/**
 * @desc    Create a group chat
 * @route   POST /api/v1/chat/groups
 */
exports.createGroup = asyncHandler(async (req, res) => {
    const { name, participants } = req.body;

    const conversation = await Conversation.create({
        participants: [...participants, req.user.id],
        isGroup: true,
        groupName: name,
        groupAdmin: req.user.id
    });

    res.status(201).json({ success: true, data: conversation });
});

/**
 * @desc    Send a message (HTTP fallback / File shares)
 * @route   POST /api/v1/chat/message
 */
exports.sendMessage = asyncHandler(async (req, res) => {
    const { conversationId, content, attachments, recipientId } = req.body;

    let targetConversationId = conversationId;

    // If no conversationId, check for 1-to-1 or create it
    if (!targetConversationId && recipientId) {
        let conversation = await Conversation.findOne({
            isGroup: false,
            participants: { $all: [req.user.id, recipientId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [req.user.id, recipientId],
                isGroup: false
            });
        }
        targetConversationId = conversation._id;
    }

    const message = await Message.create({
        conversationId: targetConversationId,
        sender: req.user.id,
        content,
        attachments
    });

    await Conversation.findByIdAndUpdate(targetConversationId, {
        lastMessage: message._id
    });

    res.status(201).json({ success: true, data: message });
});

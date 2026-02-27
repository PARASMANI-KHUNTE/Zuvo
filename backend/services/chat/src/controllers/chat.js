const { asyncHandler, models, internalServices } = require("@zuvo/shared");
const Conversation = models.Conversation();
const Message = models.Message();

/**
 * @desc    Get user's conversations
 * @route   GET /api/v1/chat/conversations
 */
exports.getConversations = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({
        participants: { $in: [req.user.id || req.user._id] }
    })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

    // DECOUPLING FIX: Manually fetch participant profiles
    const conversationsWithParticipants = await Promise.all(conversations.map(async (conv) => {
        const convObj = conv.toObject();
        convObj.participants = await Promise.all(
            conv.participants.map(pId => internalServices.getUserProfile(pId))
        );
        return convObj;
    }));

    res.status(200).json({ success: true, page: page, data: conversationsWithParticipants });
});

/**
 * @desc    Get message history for a conversation
 * @route   GET /api/v1/chat/messages/:conversationId
 * FIX D1: Added pagination — oldest-first with page/limit
 */
exports.getMessages = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const total = await Message.countDocuments({ conversationId: req.params.conversationId });

    const messages = await Message.find({
        conversationId: req.params.conversationId
    })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit);

    // DECOUPLING FIX: Manually fetch sender profiles
    const messagesWithSenders = await Promise.all(messages.map(async (msg) => {
        const msgObj = msg.toObject();
        msgObj.sender = await internalServices.getUserProfile(msg.sender);
        return msgObj;
    }));

    res.status(200).json({
        success: true,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: messagesWithSenders
    });
});

/**
 * @desc    Create a group chat
 * @route   POST /api/v1/chat/groups
 */
exports.createGroup = asyncHandler(async (req, res) => {
    const { name, participants } = req.body;

    if (!name || !participants || participants.length < 2) {
        return res.status(400).json({ success: false, message: "Group name and at least 2 participants are required" });
    }

    const conversation = await Conversation.create({
        participants: [...participants, req.user.id || req.user._id],
        isGroup: true,
        groupName: name,
        groupAdmin: req.user.id || req.user._id
    });

    res.status(201).json({ success: true, data: conversation });
});

/**
 * @desc    Find or create a 1-on-1 conversation
 * @route   GET /api/v1/chat/conversation/user/:userId
 */
exports.getOrCreateConversation = asyncHandler(async (req, res) => {
    const recipientId = req.params.userId;

    if (recipientId === (req.user.id || req.user._id)) {
        return res.status(400).json({ success: false, message: "Cannot start a conversation with yourself" });
    }

    let conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [req.user.id || req.user._id, recipientId] }
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [req.user.id || req.user._id, recipientId],
            isGroup: false
        });
    }

    // Enrich participants for the frontend
    const convObj = conversation.toObject();
    convObj.participants = await Promise.all(
        conversation.participants.map(pId => internalServices.getUserProfile(pId))
    );

    res.status(200).json({ success: true, data: convObj });
});

/**
 * @desc    Send a message (HTTP fallback / File shares)
 * @route   POST /api/v1/chat/message
 */
exports.sendMessage = asyncHandler(async (req, res) => {
    const { conversationId, content, attachments, recipientId } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
        return res.status(400).json({ success: false, message: "Message must have content or attachments" });
    }

    let targetConversationId = conversationId;

    // If no conversationId, check for 1-to-1 or create it
    if (!targetConversationId && recipientId) {
        let conversation = await Conversation.findOne({
            isGroup: false,
            participants: { $all: [req.user.id || req.user._id, recipientId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [req.user.id || req.user._id, recipientId],
                isGroup: false
            });
        }
        targetConversationId = conversation._id;
    }

    if (!targetConversationId) {
        return res.status(400).json({ success: false, message: "conversationId or recipientId is required" });
    }

    const message = await Message.create({
        conversationId: targetConversationId,
        sender: req.user.id || req.user._id,
        content,
        attachments
    });

    await Conversation.findByIdAndUpdate(targetConversationId, {
        lastMessage: message._id
    });

    res.status(201).json({ success: true, data: message });
});

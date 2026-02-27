const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    isGroup: {
        type: Boolean,
        default: false
    },
    groupName: {
        type: String,
        trim: true
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    }
}, { timestamps: true });

// FIX K1/D2: Index for participant lookups — critical for "find all conversations for a user"
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 }); // For sorting by most recent

module.exports = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);


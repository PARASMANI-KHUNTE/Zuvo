const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    content: {
        type: String,
        required: function () { return !this.attachments || this.attachments.length === 0; }
    },
    attachments: [{
        _id: false,
        url: {
            type: String,
            required: true
        },
        publicId: {
            type: String
        },
        fileType: {
            type: String,
            enum: ["image", "video", "audio", "document"],
            default: "image"
        }
    }],
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ["like", "follow", "comment", "system", "mention"],
        required: true
    },
    actor: {
        id: mongoose.Schema.Types.ObjectId,
        name: String,
        username: String,
        avatar: String
    },
    content: String,
    targetId: mongoose.Schema.Types.ObjectId, // Post ID or Comment ID
    targetImage: String,
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Index for fetching unread count quickly
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

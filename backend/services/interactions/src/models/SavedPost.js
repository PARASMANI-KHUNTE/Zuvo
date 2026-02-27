const mongoose = require("mongoose");

const savedPostSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    }
}, { timestamps: true });

// Prevent duplicate saves
savedPostSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.models.SavedPost || mongoose.model("SavedPost", savedPostSchema);

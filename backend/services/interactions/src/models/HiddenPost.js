const mongoose = require("mongoose");

const hiddenPostSchema = new mongoose.Schema({
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

// Prevent duplicate hides
hiddenPostSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.models.HiddenPost || mongoose.model("HiddenPost", hiddenPostSchema);

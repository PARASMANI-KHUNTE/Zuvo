const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    action: {
        type: String,
        enum: ["like", "dislike"],
        required: true
    }
}, { timestamps: true });

likeSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.models.Like || mongoose.model("Like", likeSchema);

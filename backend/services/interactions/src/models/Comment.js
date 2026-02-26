const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null
    },
    isEdited: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

commentSchema.index({ post: 1, parentComment: 1 });

module.exports = mongoose.model("Comment", commentSchema);

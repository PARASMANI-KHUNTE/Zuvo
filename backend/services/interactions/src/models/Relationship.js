const mongoose = require("mongoose");

const relationshipSchema = new mongoose.Schema({
    follower: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    following: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ["following", "requested", "blocked"],
        default: "following",
        index: true
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate follows
relationshipSchema.index({ follower: 1, following: 1 }, { unique: true });

module.exports = mongoose.models.Relationship || mongoose.model("Relationship", relationshipSchema);

const mongoose = require("mongoose");
const slugify = require("slugify");

// Soft delete functionality implemented here manually to avoid dependency on shared plugin if possible,
// or we can still use shared plugin but the model itself is local.
// For now, let's keep the shared plugin reference as it's a utility, not a domain capture.
const { softDelete } = require("@zuvo/shared");

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
        maxlength: [100, "Title cannot be more than 100 characters"]
    },
    slug: {
        type: String,
        unique: true,
        index: true
    },
    content: {
        type: String,
        required: [true, "Content is required"]
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    tags: [String],
    image: {
        type: String,
        default: "no-photo.jpg"
    },
    status: {
        type: String,
        enum: ["draft", "published"],
        default: "draft"
    },
    likesCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Create post slug from the title before saving
postSchema.pre("save", function (next) {
    if (!this.isModified("title")) return next();
    this.slug = slugify(this.title, { lower: true, strict: true });
    next();
});

postSchema.plugin(softDelete);

module.exports = mongoose.model("Post", postSchema);

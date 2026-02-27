const mongoose = require("mongoose");
const slugify = require("slugify");
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

postSchema.pre("save", function (next) {
    if (!this.isModified("title")) return next();
    this.slug = slugify(this.title, { lower: true, strict: true });
    next();
});

postSchema.plugin(softDelete);

module.exports = mongoose.models.Post || mongoose.model("Post", postSchema);

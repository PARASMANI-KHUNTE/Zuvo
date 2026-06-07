const mongoose = require("mongoose");
const slugify = require("slugify");
const softDelete = require("../softDelete");

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
    media: [{
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ["image", "video", "audio", "document"],
            required: true
        },
        publicId: {
            type: String,
            required: true
        }
    }],
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
postSchema.pre("validate", async function () {
    if (this.isModified("title")) {
        let baseSlug = slugify(this.title, { lower: true, strict: true });
        if (!baseSlug) {
            baseSlug = `post-${Date.now()}`;
        }
        let slug = baseSlug;
        let counter = 1;
        while (await mongoose.models.Post?.findOne({ slug, _id: { $ne: this._id } }).select('_id').lean()) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        this.slug = slug;
    }
});

postSchema.plugin(softDelete);

postSchema.index({ author: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ likesCount: -1, createdAt: -1 });

module.exports = mongoose.models.Post || mongoose.model("Post", postSchema);



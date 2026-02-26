const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const axios = require("axios");

// Models (Loading from Auth and Blog services)
// Using relative paths from backend root
const User = require("./services/auth/src/models/User");
const Post = require("./services/blog/src/models/Post");

const MONGODB_URI = "mongodb://localhost:27017/Zuvo";

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB for seeding...");

        // 1. Clear existing data (Optional, be careful)
        // await User.deleteMany({});
        // await Post.deleteMany({});

        // 2. Create a Test User
        let user = await User.findOne({ email: "test@zuvo.com" });
        if (!user) {
            const hashedPassword = await bcrypt.hash("password123", 10);
            user = await User.create({
                name: "Zuvo Architect",
                username: "architect",
                email: "test@zuvo.com",
                password: hashedPassword,
                role: "user"
            });
            console.log("Test user created:", user.username);
        }

        // 3. Create initial Posts
        const postsData = [
            {
                title: "Welcome to Zuvo",
                content: "We are thrilled to launch the beta version of Zuvo. A platform built for performance, privacy, and social purity.",
                author: user._id,
                status: "published",
                tags: ["announcement", "beta"],
                likesCount: 124,
                commentsCount: 12
            },
            {
                title: "The Architecture of Scale",
                content: "Zuov's microservices architecture is designed to handle millions of concurrent users with sub-100ms latency.",
                author: user._id,
                status: "published",
                tags: ["tech", "scaling"],
                likesCount: 89,
                commentsCount: 5
            },
            {
                title: "Glassmorphism in Modern Design",
                content: "Using glassmorphism isn't just about aesthetics; it's about creating depth and focus in a digital world.",
                author: user._id,
                status: "published",
                tags: ["design", "ui"],
                likesCount: 230,
                commentsCount: 45
            }
        ];

        for (const postData of postsData) {
            const exists = await Post.findOne({ title: postData.title });
            if (!exists) {
                await Post.create(postData);
                console.log(`Post created: ${postData.title}`);
            }
        }

        console.log("Seeding complete!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
}

seed();

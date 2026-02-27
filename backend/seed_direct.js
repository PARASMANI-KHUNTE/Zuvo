const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");

const url = "mongodb://localhost:27017";
const dbName = "Zuvo";

async function seed() {
    const client = new MongoClient(url);

    try {
        await client.connect();
        console.log("Connected to MongoDB...");
        const db = client.db(dbName);

        const usersCol = db.collection("users");
        const postsCol = db.collection("posts");

        // 1. Create Test User
        let user = await usersCol.findOne({ email: "test@zuvo.com" });
        if (!user) {
            const hashedPassword = await bcrypt.hash("password123", 10);
            const result = await usersCol.insertOne({
                name: "Zuvo Architect",
                username: "architect",
                email: "test@zuvo.com",
                password: hashedPassword,
                role: "user",
                createdAt: new Date(),
                updatedAt: new Date()
            });
            user = { _id: result.insertedId, username: "architect" };
            console.log("User created:", user.username);
        }

        // 2. Create Posts
        const postsData = [
            {
                title: "Welcome to Zuvo",
                slug: "welcome-to-zuvo",
                content: "We are thrilled to launch the beta version of Zuvo. A platform built for performance, privacy, and social purity.",
                author: user._id,
                status: "published",
                tags: ["announcement", "beta"],
                likesCount: 124,
                commentsCount: 12,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                title: "The Architecture of Scale",
                slug: "the-architecture-of-scale",
                content: "Zuvo's microservices architecture is designed to handle millions of concurrent users with sub-100ms latency.",
                author: user._id,
                status: "published",
                tags: ["tech", "scaling"],
                likesCount: 89,
                commentsCount: 5,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                title: "Glassmorphism in Modern Design",
                slug: "glassmorphism-in-modern-design",
                content: "Using glassmorphism isn't just about aesthetics; it's about creating depth and focus in a digital world.",
                author: user._id,
                status: "published",
                tags: ["design", "ui"],
                likesCount: 230,
                commentsCount: 45,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        for (const post of postsData) {
            const exists = await postsCol.findOne({ slug: post.slug });
            if (!exists) {
                await postsCol.insertOne(post);
                console.log(`Created post: ${post.title}`);
            }
        }

        console.log("Seeding successful!");
    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await client.close();
    }
}

seed();

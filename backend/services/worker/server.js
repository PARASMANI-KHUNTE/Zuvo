const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const { trace, context, propagation } = require("@opentelemetry/api");
const { logger, connectRedis, MessageBus, redisClient, connectDB, initTracing, metrics, faultInjection, HealthCheck, internalServices, models } = require("@zuvo/shared");
process.env.SERVICE_NAME = process.env.SERVICE_NAME || "worker-service";

// Initialize Tracing FIRST
initTracing(process.env.SERVICE_NAME);

const tracer = trace.getTracer("worker-service");


const STREAM_NAME = "zuvo_tasks";
const GROUP_NAME = "worker_group";
const CONSUMER_NAME = `worker_${process.pid}`;
const SEARCH_CACHE_VERSION_KEY = "search:cache:version";

/**
 * Worker logic to process messages from the MessageBus.
 */
const startWorker = async () => {
    await connectDB();
    await connectRedis();

    // Expose a health check port
    const app = express();
    app.get("/health", async (req, res) => {
        res.status(200).json(await HealthCheck.getHealth());
    });
    app.get("/ready", async (req, res) => {
        const ready = await HealthCheck.getReady();
        res.status(ready.status === "UP" ? 200 : 503).json(ready);
    });
    const HEALTH_PORT = process.env.HEALTH_PORT || 8008;
    app.listen(HEALTH_PORT, () => {
        logger.info(`Worker health check server running on port ${HEALTH_PORT}`);
    });


    // Ensure consumer group exists
    await MessageBus.createConsumerGroup(STREAM_NAME, GROUP_NAME);

    logger.info(`Worker ${CONSUMER_NAME} started. Listening for tasks...`);

    let retryDelay = 1000;

    while (true) {
        try {
            // Read new messages from the group
            const results = await redisClient.xReadGroup(
                GROUP_NAME,
                CONSUMER_NAME,
                { key: STREAM_NAME, id: ">" },
                { COUNT: 1, BLOCK: 5000 }
            );

            // Reset delay on successful interaction with Redis
            retryDelay = 1000;

            if (results) {
                for (const stream of results) {
                    for (const message of stream.messages) {
                        const { id, message: data } = message;
                        const task = JSON.parse(data.data);
                        const traceparent = data.traceparent;

                        // 1. Idempotency Guard (SETNX with 24h TTL)
                        const lockKey = `zuvo:worker:processed:${id}`;
                        const isNew = await redisClient.set(lockKey, "1", { NX: true, EX: 86400 });

                        if (!isNew) {
                            logger.warn(`Task [${id}] already processed or in progress. Skipping.`);
                            await redisClient.xAck(STREAM_NAME, GROUP_NAME, id);
                            continue;
                        }

                        // Track retries
                        task.retries = (task.retries || 0) + 1;
                        const correlationId = task.correlationId || `req_${id}`;

                        if (task.retries > 5) {
                            logger.error(`Task [${id}] [Correlation: ${correlationId}] max retries reached. Moving to DLQ.`);
                            await handleFailure(id, task, new Error("Max retries exceeded"));
                            await redisClient.xAck(STREAM_NAME, GROUP_NAME, id);
                            continue;
                        }

                        // Extract remote context
                        const parentContext = propagation.extract(context.active(), { traceparent });

                        await context.with(parentContext, async () => {
                            await tracer.startActiveSpan(`worker.process.${task.type}`, async (span) => {
                                logger.info(`Processing task [${id}]: ${task.type}`);
                                span.setAttribute("task.id", id);
                                span.setAttribute("task.type", task.type);

                                try {
                                    const start = process.hrtime();
                                    await handleTask(task);
                                    const duration = process.hrtime(start);
                                    const durationInSeconds = duration[0] + duration[1] / 1e9;

                                    // Acknowledge the message upon success
                                    await redisClient.xAck(STREAM_NAME, GROUP_NAME, id);
                                    span.setStatus({ code: 1 }); // Ok

                                    logger.info(`Task [${id}] completed in ${durationInSeconds.toFixed(3)}s`);
                                } catch (err) {
                                    logger.error(`Task [${id}] failed. Moving to DLQ.`, err);
                                    span.recordException(err);
                                    span.setStatus({ code: 2, message: err.message }); // Error
                                    await handleFailure(id, task, err);
                                } finally {
                                    span.end();
                                }
                            });
                        });
                    }
                }
            }
        } catch (err) {
            logger.error(`Worker loop error. Retrying in ${retryDelay}ms...`, err);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            // Exponential backoff
            retryDelay = Math.min(retryDelay * 2, 30000);
        }
    }
};


const processNotification = async (payload) => {
    const { userId, type, actorId, content, targetId, targetImage } = payload;
    if (!userId) return;

    // Validate type against schema enum: ["like", "follow", "comment", "system", "mention"]
    const validTypes = ["like", "follow", "comment", "system", "mention"];
    const normalizedType = (type || "system").toLowerCase();
    const finalType = validTypes.includes(normalizedType) ? normalizedType : "system";

    // Respect the recipient's in-app notification preference (default: enabled)
    try {
        const User = models.User();
        const recipient = await User.findById(userId).select("notificationPreferences").lean();
        if (recipient?.notificationPreferences?.in_app === false) {
            logger.info(`Skipping ${finalType} notification for ${userId}: in-app notifications disabled`);
            return;
        }
    } catch (prefErr) {
        logger.warn(`Could not load notification preferences for ${userId}: ${prefErr.message}`);
    }

    logger.info(`Processing ${finalType} notification for user ${userId}`);

    try {
        // 1. Enrich Actor Data
        let actorData = { id: actorId, name: "Someone", username: "unknown" };
        if (actorId) {
            try {
                const profile = await internalServices.getUserProfile(actorId);
                if (profile) {
                    actorData = {
                        id: profile.id || profile._id,
                        name: profile.name,
                        username: profile.username,
                        avatar: profile.avatar
                    };
                }
            } catch (enrichErr) {
                logger.warn(`Failed to enrich actor ${actorId}: ${enrichErr.message}`);
            }
        }

        // 2. Persist to MongoDB
        const Notification = models.Notification();
        const notification = await Notification.create({
            userId,
            type: finalType,
            actor: actorData,
            content,
            targetId: targetId || null,
            targetImage: targetImage || null,
            read: false
        });

        // 3. Publish to Redis for Real-time relay
        const socketPayload = {
            _id: notification._id,
            userId,
            type: finalType.toUpperCase(),
            notificationType: finalType.toUpperCase(),
            actor: actorData,
            content,
            targetId,
            targetImage,
            createdAt: new Date().toISOString()
        };

        await redisClient.publish("notifications", JSON.stringify(socketPayload));
        logger.info(`Notification delivered to relay for user ${userId}`);
    } catch (err) {
        logger.error(`Error in processNotification: ${err.message}`, err);
        throw err; // Retry via worker loop
    }
};

// ---------------------------------------------------------------------------
// Personalized feed fan-out
// ---------------------------------------------------------------------------
const FEED_MAX_ITEMS = 200;
const FEED_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const FANOUT_CHUNK_SIZE = 250;
const BACKFILL_POST_LIMIT = 20;

const feedKey = (userId) => `user:${userId}:feed`;

const buildFeedItem = (post, author) => ({
    _id: post._id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    tags: post.tags,
    media: post.media,
    author,
    likesCount: post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
    createdAt: post.createdAt
});

// Items must be provided newest-first. Writes with LPUSH (head = newest),
// trims to FEED_MAX_ITEMS and refreshes the TTL.
const writeFeedItems = async (userIds, items) => {
    if (!userIds.length || !items.length) return;

    const serializedOldestFirst = items.map(item => JSON.stringify(item)).reverse();

    for (let i = 0; i < userIds.length; i += FANOUT_CHUNK_SIZE) {
        const chunk = userIds.slice(i, i + FANOUT_CHUNK_SIZE);
        await Promise.all(chunk.map(async (uid) => {
            const key = feedKey(uid);
            const multi = redisClient.multi();
            for (const payload of serializedOldestFirst) {
                multi.lPush(key, payload);
            }
            multi.lTrim(key, 0, FEED_MAX_ITEMS - 1);
            multi.expire(key, FEED_TTL_SECONDS);
            await multi.exec();
        }));
    }
};

const readFeed = async (userId) => {
    const raw = await redisClient.lRange(feedKey(userId), 0, FEED_MAX_ITEMS - 1);
    if (!raw || !raw.length) return [];
    return raw
        .map(item => {
            try { return JSON.parse(item); } catch { return null; }
        })
        .filter(Boolean);
};

// Rewrites the whole list (head = newest). Used by merge/remove operations
// where LPUSH ordering would scramble chronology.
const rewriteFeed = async (userId, items) => {
    const key = feedKey(userId);
    const multi = redisClient.multi();
    multi.del(key);
    if (items.length) {
        for (const item of items) {
            multi.rPush(key, JSON.stringify(item));
        }
        multi.expire(key, FEED_TTL_SECONDS);
    }
    await multi.exec();
};

const mergeIntoFeed = async (userId, newItems) => {
    const existing = await readFeed(userId);
    const byId = new Map();
    for (const item of [...existing, ...newItems]) {
        const id = String(item._id);
        if (id && !byId.has(id)) byId.set(id, item);
    }
    const merged = [...byId.values()]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, FEED_MAX_ITEMS);
    await rewriteFeed(userId, merged);
};

// Push a single new post into the author's feed and every follower's feed.
const fanOutPost = async (task) => {
    const { postId, authorId } = task;
    if (!postId || !authorId) {
        throw new Error("FEED_FANOUT requires postId and authorId");
    }

    const Post = models.Post();
    const Relationship = models.Relationship();

    const post = await Post.findOne({ _id: postId, isDeleted: { $ne: true } }).lean();
    if (!post) {
        logger.warn(`FEED_FANOUT: post ${postId} missing or deleted. Skipping fan-out.`);
        return;
    }
    if (post.status && post.status !== "published") {
        logger.info(`FEED_FANOUT: post ${postId} is "${post.status}", not fanning out.`);
        return;
    }

    const author = await internalServices.getUserProfile(authorId);
    const item = buildFeedItem(post, author);

    const followers = await Relationship
        .find({ following: authorId, status: "following" })
        .select("follower")
        .lean();

    const recipientIds = [...new Set([
        authorId.toString(),
        ...followers.map(rel => rel.follower.toString())
    ])];

    await writeFeedItems(recipientIds, [item]);
    logger.info(`FEED_FANOUT: post ${postId} delivered to ${recipientIds.length} feed(s)`);
};

// Pull the most recent posts of a newly followed author into the follower's feed.
const backfillFeed = async (followerId, authorId) => {
    const Post = models.Post();
    const posts = await Post.find({ author: authorId, status: "published", isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(BACKFILL_POST_LIMIT)
        .select("title slug author tags content media createdAt likesCount commentsCount status")
        .lean();

    if (!posts.length) return;

    const author = await internalServices.getUserProfile(authorId);
    const items = posts.map(post => buildFeedItem(post, author));
    await mergeIntoFeed(followerId, items);
    logger.info(`FEED_BACKFILL: added ${items.length} post(s) from ${authorId} to ${followerId}`);
};

// Drop an unfollowed author's posts from the follower's cached feed.
const removeAuthorFromFeed = async (followerId, authorId) => {
    const existing = await readFeed(followerId);
    if (!existing.length) return;

    const target = String(authorId);
    const remaining = existing.filter(item => {
        const itemAuthor = item.author?.id || item.author?._id || item.author;
        return String(itemAuthor) !== target;
    });

    if (remaining.length !== existing.length) {
        await rewriteFeed(followerId, remaining);
        logger.info(`FEED_PRUNE: removed ${existing.length - remaining.length} post(s) by ${authorId} from ${followerId}`);
    }
};

// ---------------------------------------------------------------------------
// GDPR scrubbing — runs in-process in the worker (the single background runner)
// ---------------------------------------------------------------------------
const scrubUserData = async (userId) => {
    if (!userId) throw new Error("GDPR scrub requires a userId");

    const User = models.User();
    const Post = models.Post();
    const Message = models.Message();
    const Relationship = models.Relationship();
    const Comment = models.Comment();
    const Notification = models.Notification();

    logger.info(`GDPR: Scrubbing all data for user ${userId}`);

    // Relationships first so we can correct counterparties' counters
    const relationships = await Relationship
        .find({ $or: [{ follower: userId }, { following: userId }] })
        .select("follower following")
        .lean();

    const counterDeltas = new Map();
    const bump = (id, field, delta) => {
        const key = id.toString();
        if (key === String(userId)) return;
        const entry = counterDeltas.get(key) || {};
        entry[field] = (entry[field] || 0) + delta;
        counterDeltas.set(key, entry);
    };
    for (const rel of relationships) {
        if (rel.follower.toString() === String(userId)) {
            bump(rel.following, "followersCount", -1);
        } else {
            bump(rel.follower, "followingCount", -1);
        }
    }

    await Promise.all([
        User.findByIdAndUpdate(userId, {
            name: "[DELETED USER]",
            email: `deleted_${userId}@gdpr.zuvo.com`,
            password: undefined,
            googleId: undefined,
            refreshTokens: [],
            accountStatus: "deleted"
        }),
        Post.updateMany({ author: userId }, { isDeleted: true, title: "[DELETED]", content: "[DELETED BY USER REQUEST]" }),
        Message.updateMany({ sender: userId }, { content: "[DELETED]" }),
        Comment.updateMany({ user: userId }, { isDeleted: true, content: "[DELETED]" }),
        Notification.deleteMany({ userId }),
        Relationship.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
        // Invalidate cached profile + personalized feed
        redisClient.del(`user:profile:${userId}`),
        redisClient.del(feedKey(userId))
    ]);

    if (counterDeltas.size) {
        await Promise.all([...counterDeltas.entries()].map(([id, fields]) =>
            User.findByIdAndUpdate(id, { $inc: fields })
        ));
    }

    logger.info(`GDPR: Scrub complete for user ${userId}`);
};

const handleTask = async (task) => {
    switch (task.type) {
        case "MEDIA_COMPRESSION":
            logger.info(`Compressing media ${task.publicId || ""} in background...`);
            if (!task.publicId) {
                logger.warn("MEDIA_COMPRESSION task has no publicId. Skipping.");
                break;
            }
            await internalServices.compressMedia(task.publicId, task.resourceType, task.userId);
            break;
        case "FEED_FANOUT":
            await fanOutPost(task);
            break;
        case "NOTIFICATION":
            await processNotification({
                userId: task.userId,
                type: task.notificationType || "system",
                actorId: task.actorId,
                content: task.content,
                targetId: task.targetId,
                targetImage: task.targetImage
            });
            break;
        case "SEARCH_INDEX":
            // The search service queries MongoDB directly; its results are cached
            // in Redis under a versioned key. Bumping the version invalidates every
            // cached query so the freshly created/updated post is immediately visible.
            logger.info(`Refreshing search index for post ${task.postId}`);
            await redisClient.incr(SEARCH_CACHE_VERSION_KEY);
            break;
        case "LIKE_TOGGLE":
            logger.info(`Syncing like for post ${task.postId}`);
            try {
                const Post = models.Post();
                const likesDelta = Number(task.likesDelta) || 0;
                if (likesDelta !== 0) {
                    const post = await Post.findByIdAndUpdate(task.postId, {
                        $inc: { likesCount: likesDelta }
                    }, { new: true });

                    if (likesDelta > 0 && post && post.author.toString() !== task.userId) {
                        await processNotification({
                            userId: post.author.toString(),
                            type: "like",
                            actorId: task.userId,
                            content: `liked your post`,
                            targetId: task.postId,
                            targetImage: post.media?.[0]?.url
                        });
                    }
                }
            } catch (err) {
                logger.error("Failed to sync like to DB", err);
                throw err;
            }
            break;
        case "COMMENT_CREATED":
            logger.info(`Syncing comment count for post ${task.postId}`);
            try {
                const Post = models.Post();
                await Post.findByIdAndUpdate(task.postId, {
                    $inc: { commentsCount: 1 }
                });
            } catch (err) {
                logger.error("Failed to sync comment count to DB", err);
                throw err;
            }
            break;
        case "GDPR_DELETE_USER":
        case "GDPR_USER_DELETE":
            await scrubUserData(task.userId);
            break;
        case "SAVE_CHAT_MESSAGE":
            logger.info(`Persisting chat message for conversation ${task.conversationId}`);
            try {
                const Message = models.Message();
                const Conversation = models.Conversation();
                const newMessage = await Message.create({
                    conversationId: task.conversationId,
                    sender: task.sender,
                    content: task.content,
                    attachments: task.attachments
                });
                await Conversation.findByIdAndUpdate(task.conversationId, {
                    lastMessage: newMessage._id
                });
            } catch (err) {
                logger.error("Failed to persist chat message in background", err);
                throw err;
            }
            break;
        case "EMAIL_SEND":
            logger.info(`Sending email of type ${task.emailType} to ${task.to}`);
            if (task.emailType === "VERIFICATION") {
                const { emailService } = require("@zuvo/shared");
                await emailService.sendVerificationEmail(task.to, task.data.token);
            } else if (task.emailType === "OTP") {
                const { emailService } = require("@zuvo/shared");
                await emailService.sendPasswordResetOTP(task.to, task.data.otp);
            }
            break;
        case "FOLLOW":
            logger.info(`Syncing follow counts for ${task.followerId} -> ${task.followingId}`);
            try {
                const User = models.User();
                await Promise.all([
                    User.findByIdAndUpdate(task.followerId, { $inc: { followingCount: 1 } }),
                    User.findByIdAndUpdate(task.followingId, { $inc: { followersCount: 1 } })
                ]);
                await processNotification({
                    userId: task.followingId,
                    type: "follow",
                    actorId: task.followerId,
                    content: `started following you`
                });
            } catch (err) {
                logger.error("Failed to sync follow counts", err);
            }
            // Backfill the new follower's feed with recent posts from this author
            try {
                await backfillFeed(task.followerId, task.followingId);
            } catch (err) {
                logger.error("Failed to backfill feed on follow", err);
            }
            break;
        case "FOLLOW_REQUEST":
            logger.info(`Processing follow request: ${task.followerId} -> ${task.followingId}`);
            try {
                await processNotification({
                    userId: task.followingId,
                    type: "follow",
                    actorId: task.followerId,
                    content: `sent you a follow request`
                });
            } catch (err) {
                logger.error("Failed to send follow request notification", err);
            }
            break;
        case "FOLLOW_ACCEPTED":
            logger.info(`Syncing accepted follow counts for ${task.followerId} -> ${task.followingId}`);
            try {
                const User = models.User();
                await Promise.all([
                    User.findByIdAndUpdate(task.followerId, { $inc: { followingCount: 1 } }),
                    User.findByIdAndUpdate(task.followingId, { $inc: { followersCount: 1 } })
                ]);
                await processNotification({
                    userId: task.followerId,
                    type: "follow",
                    actorId: task.followingId,
                    content: `accepted your follow request`
                });
            } catch (err) {
                logger.error("Failed to sync accepted follow counts", err);
            }
            // Private account: backfill once the follow is accepted
            try {
                await backfillFeed(task.followerId, task.followingId);
            } catch (err) {
                logger.error("Failed to backfill feed on follow accept", err);
            }
            break;
        case "UNFOLLOW":
            logger.info(`Syncing unfollow counts for ${task.followerId} -> ${task.followingId}`);
            try {
                const User = models.User();
                await Promise.all([
                    User.findByIdAndUpdate(task.followerId, { $inc: { followingCount: -1 } }),
                    User.findByIdAndUpdate(task.followingId, { $inc: { followersCount: -1 } })
                ]);
            } catch (err) {
                logger.error("Failed to sync unfollow counts", err);
            }
            try {
                await removeAuthorFromFeed(task.followerId, task.followingId);
            } catch (err) {
                logger.error("Failed to prune feed on unfollow", err);
            }
            break;
        default:
            logger.warn(`Unknown task type: ${task.type}`);
    }
};

const handleFailure = async (id, task, error) => {
    // DLQ implementation: Push to a separate stream/list for manual review or retry
    await redisClient.lPush("zuvo_dlq", JSON.stringify({
        originalId: id,
        task,
        error: error.message,
        timestamp: Date.now()
    }));
};

startWorker().catch(err => logger.error("Fatal Worker Error", err));

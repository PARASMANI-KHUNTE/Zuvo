const mongoose = require("mongoose");
const Relationship = require("../src/models/Relationship");

// This script should be run manually against the production/dev DB
async function enforceUniqueIndex() {
    console.log("🔍 Checking for duplicate relationships...");

    try {
        const duplicates = await Relationship.aggregate([
            {
                $group: {
                    _id: { follower: "$follower", following: "$following" },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        console.log(`Found ${duplicates.length} duplicate pairs.`);

        for (const dup of duplicates) {
            const [keep, ...remove] = dup.ids;
            console.log(`Cleaning up pair: ${dup._id.follower} -> ${dup._id.following}. Removing ${remove.length} duplicates.`);
            await Relationship.deleteMany({ _id: { $in: remove } });
        }

        console.log("🚀 Rebuilding unique index...");
        await Relationship.collection.dropIndex("follower_1_following_1").catch(() => { });
        await Relationship.collection.createIndex({ follower: 1, following: 1 }, { unique: true });

        const indexes = await Relationship.collection.getIndexes();
        console.log("✅ Index enforcement complete. Current indexes:", indexes);

    } catch (err) {
        console.error("❌ Failed to enforce unique index:", err);
    } finally {
        // mongoose.disconnect();
    }
}

// enforceUniqueIndex();
module.exports = enforceUniqueIndex;

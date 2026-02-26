const { redisClient } = require("../infra/redis");

const MigrationSchema = new mongoose.Schema({
    name: { type: String, unique: true },
    executedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" }
});

// Avoid re-compilation errors in hot-reload or test envs
const MigrationModel = mongoose.models.Migration || mongoose.model("Migration", MigrationSchema);

/**
 * Enterprise Schema Migration Runner
 */
class MigrationRunner {
    constructor(migrationsDir) {
        this.migrationsDir = migrationsDir;
        this.lockKey = "zuvo:migrations:lock";
        this.lockTTL = 600000; // 10 minutes
    }

    async acquireLock() {
        // Simple Redis-based distributed lock
        const result = await redisClient.set(this.lockKey, "locked", {
            NX: true,
            PX: this.lockTTL
        });
        return result === "OK";
    }

    async releaseLock() {
        await redisClient.del(this.lockKey);
    }

    async run() {
        if (!(await this.acquireLock())) {
            logger.warn("Another migration is currently in progress. Skipping.");
            return;
        }

        try {
            const files = fs.readdirSync(this.migrationsDir).filter(f => f.endsWith(".js")).sort();

            for (const file of files) {
                const alreadyRun = await MigrationModel.findOne({ name: file, status: "completed" });
                if (alreadyRun) continue;

                logger.info(`Running migration: ${file}`);
                const migration = require(path.join(this.migrationsDir, file));

                // Create record as pending
                const record = await MigrationModel.findOneAndUpdate(
                    { name: file },
                    { status: "pending" },
                    { upsert: true, new: true }
                );

                try {
                    await migration.up(mongoose.connection.db);
                    record.status = "completed";
                    record.executedAt = new Date();
                    await record.save();
                    logger.info(`Migration successful: ${file}`);
                } catch (err) {
                    record.status = "failed";
                    await record.save();
                    logger.error(`Migration failed: ${file}`, err);
                    throw err;
                }
            }
        } finally {
            await this.releaseLock();
        }
    }

    async rollback() {
        if (!(await this.acquireLock())) return;

        try {
            const lastMigration = await MigrationModel.findOne({ status: "completed" }).sort({ executedAt: -1 });
            if (!lastMigration) {
                logger.info("No migrations to rollback.");
                return;
            }

            logger.info(`Rolling back migration: ${lastMigration.name}`);
            const migration = require(path.join(this.migrationsDir, lastMigration.name));

            if (typeof migration.down !== "function") {
                throw new Error(`Migration ${lastMigration.name} does not support rollback (no down() method).`);
            }

            await migration.down(mongoose.connection.db);
            await MigrationModel.deleteOne({ _id: lastMigration._id });
            logger.info(`Rollback successful: ${lastMigration.name}`);
        } finally {
            await this.releaseLock();
        }
    }
}

module.exports = MigrationRunner;


const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

/**
 * Basic Schema Migration Runner
 */
class MigrationRunner {
    constructor(migrationsDir) {
        this.migrationsDir = migrationsDir;
    }

    async run() {
        const MigrationModel = mongoose.model("Migration", new mongoose.Schema({
            name: { type: String, unique: true },
            executedAt: { type: Date, default: Date.now }
        }));

        const files = fs.readdirSync(this.migrationsDir).filter(f => f.endsWith(".js")).sort();

        for (const file of files) {
            const alreadyRun = await MigrationModel.findOne({ name: file });
            if (alreadyRun) continue;

            logger.info(`Running migration: ${file}`);
            const migration = require(path.join(this.migrationsDir, file));

            try {
                await migration.up(mongoose.connection.db);
                await MigrationModel.create({ name: file });
                logger.info(`Migration successful: ${file}`);
            } catch (err) {
                logger.error(`Migration failed: ${file}`, err);
                throw err;
            }
        }
    }
}

module.exports = MigrationRunner;

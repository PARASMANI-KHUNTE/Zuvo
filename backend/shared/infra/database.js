const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
    try {
        const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017").trim();
        const dbName = (process.env.DB_NAME || "zuvo").trim();

        let mongoURI = uri;
        if (!uri.includes(dbName) && !uri.split('/').pop().includes('?')) {
            mongoURI = uri.endsWith('/') ? `${uri}${dbName}` : `${uri}/${dbName}`;
        }

        await mongoose.connect(mongoURI);

        // FIX I1: Use structured logger instead of console.log
        logger.info(`MongoDB connected: ${mongoURI}`);
    } catch (error) {
        // FIX I2: Log before exiting so the error appears in centralized logs
        logger.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;


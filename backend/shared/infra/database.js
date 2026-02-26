const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        const mongoURI = uri
            ? `${uri}/${process.env.DB_NAME || "zuvo"}`
            : "mongodb://localhost:27017/zuvo";

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


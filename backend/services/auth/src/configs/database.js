const mongoose = require("mongoose");
const { logger } = require("@zuvo/shared");

const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`);
        logger.info("MongoDB connected for Auth service");
    } catch (error) {
        logger.error(`MongoDB connection error (Auth): ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const mongoURI = `${process.env.MONGODB_URI}/${process.env.DB_NAME}`;
        await mongoose.connect(mongoURI);
        console.log(`MongoDB connected: ${mongoURI}`);
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

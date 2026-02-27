const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Loading from chat's .env which has DB_NAME and MONGODB_URI
dotenv.config({ path: './.env' });

async function checkDataIntegrity() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        const dbName = process.env.DB_NAME || 'Zuvo';

        console.log(`Connecting to ${uri} / ${dbName}...`);
        await mongoose.connect(uri, { dbName: dbName });
        console.log('Connected.');

        // Simple schemas for reading
        const conversationSchema = new mongoose.Schema({
            participants: [mongoose.Schema.Types.ObjectId]
        });
        const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema, 'conversations');

        const userSchema = new mongoose.Schema({
            name: String,
            username: String
        });
        const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

        const latestConv = await Conversation.findOne().sort({ updatedAt: -1 });
        if (!latestConv) {
            console.log('No conversations found.');
            return;
        }

        console.log('Latest Conversation ID:', latestConv._id);
        console.log('Participants Count:', latestConv.participants.length);

        for (const pId of latestConv.participants) {
            const user = await User.findById(pId);
            if (user) {
                console.log(`User ${pId} FOUND: ${user.name} (@${user.username})`);
            } else {
                console.log(`User ${pId} NOT FOUND in users collection!`);
            }
        }

    } catch (err) {
        console.error('Integrity Check Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDataIntegrity();

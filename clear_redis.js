const { redisClient, connectRedis } = require('./backend/shared/infra/redis');
const dotenv = require('dotenv');
dotenv.config({ path: './backend/services/chat/.env' });

async function clearCache() {
    try {
        await connectRedis();
        console.log('Connected to Redis.');

        const keys = await redisClient.keys('user:profile:*');
        console.log(`Found ${keys.length} cached profiles.`);

        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log('Cleared all profile caches.');
        } else {
            console.log('No profiles to clear.');
        }

    } catch (err) {
        console.error('Redis Error:', err);
    } finally {
        process.exit();
    }
}

clearCache();

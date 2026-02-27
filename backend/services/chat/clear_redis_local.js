const { createClient } = require('redis');
const dotenv = require('dotenv');
dotenv.config();

async function clearCache() {
    const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    try {
        await client.connect();
        console.log('Connected to Redis.');

        const keys = await client.keys('user:profile:*');
        console.log(`Found ${keys.length} cached profiles.`);

        if (keys.length > 0) {
            await client.del(keys);
            console.log('Cleared all profile caches.');
        } else {
            console.log('No profiles to clear.');
        }

    } catch (err) {
        console.error('Redis Error:', err);
    } finally {
        await client.disconnect();
        process.exit();
    }
}

clearCache();

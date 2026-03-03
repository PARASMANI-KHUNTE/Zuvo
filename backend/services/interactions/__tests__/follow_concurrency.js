const axios = require("axios");

// Stress test for social graph race conditions
async function testFollowConcurrency() {
    console.log("🔥 Starting Follow Concurrency Stress Test...");

    const API_BASE = "http://localhost:8000/api/v1";
    const userAToken = "USER_A_TOKEN"; // REFRESH WITH ACTUAL TOKEN
    const targetUserId = "TARGET_USER_ID"; // REFRESH WITH ACTUAL ID

    const api = axios.create({
        baseURL: API_BASE,
        headers: { Authorization: `Bearer ${userAToken}` }
    });

    console.log(`Simulating 10 simultaneous follow requests to user ${targetUserId}...`);

    const requests = Array(10).fill(null).map((_, i) => {
        return api.post("/interactions/follow", { userId: targetUserId })
            .then(res => ({ id: i, status: res.status, data: res.data.status }))
            .catch(err => ({ id: i, status: err.response?.status, error: err.response?.data?.message }));
    });

    const results = await Promise.all(requests);

    console.table(results);

    const successCount = results.filter(r => r.status === 200).length;
    const followStatuses = results.map(r => r.data).filter(Boolean);

    console.log(`Total Successes (200 OK): ${successCount}`);
    console.log(`Unique Statuses Returned: ${[...new Set(followStatuses)]}`);

    if (successCount === 10) {
        console.log("✅ Idempotency handled correctly by application/DB.");
    } else {
        console.log("⚠️ Some requests failed. Check if server handles E11000 gracefully.");
    }
}

// testFollowConcurrency();
module.exports = testFollowConcurrency;

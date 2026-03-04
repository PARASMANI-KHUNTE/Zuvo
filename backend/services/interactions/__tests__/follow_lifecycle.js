const axios = require("axios");
const { MessageBus } = require("@zuvo/shared");

// This is a manual test script to be run in the dev environment
// It assumes the services are running and accessible at localhost

const API_BASE = "http://localhost:8000/api/v1"; // Gateway

async function verifyFollowLifecycle() {
    console.log("🚀 Starting Follow Lifecycle Verification...");

    // Mocking tokens for illustration
    const userAToken = "USER_A_TOKEN";
    const userBToken = "USER_B_TOKEN";
    const userBId = "USER_B_ID";

    const apiA = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${userAToken}` } });
    const apiB = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${userBToken}` } });

    try {
        console.log("1. User A follows User B (User B is Private)...");
        const res1 = await apiA.post("/interactions/follow", { userId: userBId });
        console.log("Result:", res1.data.status); // Should be 'requested'

        console.log("2. User B checks follow requests...");
        const res2 = await apiB.get("/interactions/relationships/requests");
        console.log("Requests count:", res2.data.data.length);

        const requestId = res2.data.data[0].id;
        console.log("3. User B accepts follow request...");
        const res3 = await apiB.put(`/interactions/relationships/requests/${requestId}/accept`);
        console.log("Result success:", res3.data.success);

        console.log("4. User A toggles follow on User B again...");
        const res4 = await apiA.post("/interactions/follow", { userId: userBId });
        console.log("Result status:", res4.data.status); // Should be 'none' (unfollowed)

        console.log("✅ Verification Complete!");
    } catch (err) {
        console.error("❌ Verification Failed:", err.response?.data || err.message);
    }
}

// verifyFollowLifecycle(); // Uncomment to run if tokens are provided
console.log("Verification script prepared. Please run with valid tokens.");

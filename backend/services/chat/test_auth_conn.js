const axios = require('axios');

async function testInternalAuth() {
    const testId = '69a171932dbb81ba86027602';
    const urls = [
        `http://127.0.0.1:8000/api/v1/auth/internal/user/${testId}`,
        `http://localhost:8000/api/v1/auth/internal/user/${testId}`
    ];

    for (const url of urls) {
        console.log(`Testing ${url}...`);
        try {
            const res = await axios.get(url, { timeout: 2000 });
            console.log(`Success! Response:`, JSON.stringify(res.data, null, 2));
            return;
        } catch (err) {
            console.log(`Failed ${url}: ${err.message}`);
            if (err.response) {
                console.log(`Status: ${err.response.status}`);
                console.log(`Data:`, err.response.data);
            }
        }
    }
}

testInternalAuth();

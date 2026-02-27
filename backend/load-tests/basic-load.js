import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 }, // ramp up to 20 users
        { duration: '1m', target: 20 },  // stay at 20 users
        { duration: '30s', target: 0 },  // ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export default function () {
    // 1. Get Feed (Unauthenticated for now, or use a test token)
    let res = http.get(`${BASE_URL}/feed`);
    check(res, {
        'feed status is 200': (r) => r.status === 200,
    });

    // 2. Search
    res = http.get(`${BASE_URL}/search?q=test`);
    check(res, {
        'search status is 200': (r) => r.status === 200,
    });

    sleep(1);
}

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 10,
    duration: '30s',
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export default function () {
    const payload = JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${BASE_URL}/auth/login`, payload, params);

    check(res, {
        'login status is 200 or 401': (r) => [200, 401].includes(r.status),
    });

    sleep(1);
}

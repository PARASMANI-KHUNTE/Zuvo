const axios = require('axios');

const testRegisterAndLogin = async () => {
    const username = 'testuser' + Math.floor(Math.random() * 1000);
    const email = username + '@example.com';
    const password = 'Password123';

    try {
        console.log(`\n1. Testing Registration for ${email}...`);
        const registerResponse = await axios.post('http://localhost:5000/api/v1/auth/register', {
            name: 'Test User',
            username,
            email,
            password,
        });
        console.log('Registration Success (201 expected): Status', registerResponse.status);

        console.log(`\n2. Testing Login for ${email}...`);
        const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
            email,
            password,
        });
        console.log('Login Success (200 expected): Status', loginResponse.status);
        console.log('Received Token:', loginResponse.data.accessToken ? 'Yes' : 'No');

    } catch (error) {
        console.error('Test Failed:', error.response?.data?.message || error.message);
    }
};

testRegisterAndLogin();

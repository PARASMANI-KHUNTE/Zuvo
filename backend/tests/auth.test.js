const { describe, it } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const { authenticate, authorize } = require("../shared/domain/auth");

describe("Auth Middleware & RBAC Tests", () => {
    const testSecret = "test-secret-key-for-unit-tests-32chars";
    process.env.ACCESS_TOKEN_SECRET = testSecret;

    it("should reject requests without authorization header or cookie", () => {
        const req = { headers: {}, cookies: {} };
        let nextCalled = false;
        let responseStatus = null;
        let responseBody = null;

        const res = {
            status: (code) => {
                responseStatus = code;
                return {
                    json: (body) => { responseBody = body; }
                };
            }
        };

        authenticate(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false, "Next should not be called without token");
        assert.strictEqual(responseStatus, 401);
        assert.strictEqual(responseBody.success, false);
    });

    it("should accept valid bearer token and attach user to request", () => {
        const tokenPayload = { id: "user_42", role: "author", email: "author@zuvo.dev" };
        const token = jwt.sign(tokenPayload, testSecret, { expiresIn: "1h" });

        const req = {
            headers: { authorization: `Bearer ${token}` },
            cookies: {}
        };
        let nextCalled = false;
        const res = {};

        authenticate(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true, "Next should be called on valid token");
        assert.strictEqual(req.user.id, "user_42");
        assert.strictEqual(req.user.role, "author");
    });

    it("authorize should allow users with permitted role", () => {
        const req = { user: { id: "admin_1", role: "admin" } };
        let nextCalled = false;
        const res = {};

        const middleware = authorize("admin", "moderator");
        middleware(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true);
    });

    it("authorize should reject users without permitted role", () => {
        const req = { user: { id: "user_1", role: "user" } };
        let nextCalled = false;
        let responseStatus = null;
        let responseBody = null;

        const res = {
            status: (code) => {
                responseStatus = code;
                return {
                    json: (body) => { responseBody = body; }
                };
            }
        };

        const middleware = authorize("admin");
        middleware(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(responseStatus, 403);
        assert.match(responseBody.message, /not authorized/i);
    });
});

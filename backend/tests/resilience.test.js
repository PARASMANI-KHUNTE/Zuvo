const { describe, it } = require("node:test");
const assert = require("node:assert");
const createCircuitBreaker = require("../shared/infra/resilience");
const { InternalServiceClient } = require("../shared/infra/internalServices");

describe("Circuit Breaker & Resilience Tests", () => {
    it("should execute successfully and remain CLOSED when healthy", async () => {
        let callCount = 0;
        const healthyAction = async (val) => {
            callCount++;
            return `success-${val}`;
        };

        const breaker = createCircuitBreaker(healthyAction, {
            errorThresholdPercentage: 50,
            resetTimeout: 200,
            timeout: 500
        }, "TestHealthyService");

        const result = await breaker.fire("payload");
        assert.strictEqual(result, "success-payload");
        assert.strictEqual(callCount, 1);
        assert.strictEqual(breaker.closed, true);
        assert.strictEqual(breaker.opened, false);
    });

    it("should trip and transition to OPEN when failure threshold is breached", async () => {
        const failingAction = async () => {
            throw new Error("Downstream service connection refused");
        };

        const breaker = createCircuitBreaker(failingAction, {
            errorThresholdPercentage: 50,
            resetTimeout: 200,
            timeout: 100,
            rollingCountTimeout: 1000,
            volumeThreshold: 2
        }, "TestFailingService");

        // Generate failures
        for (let i = 0; i < 3; i++) {
            try {
                await breaker.fire();
            } catch (err) {
                // Expected failure
            }
        }

        assert.strictEqual(breaker.opened, true, "Circuit breaker should be OPEN after repeated failures");

        // Subsequent call fails fast without calling action
        let fastFailed = false;
        try {
            await breaker.fire();
        } catch (err) {
            fastFailed = true;
            assert.match(err.message, /open/i);
        }
        assert.strictEqual(fastFailed, true, "Should fail fast when circuit is OPEN");
    });

    it("should execute fallback logic gracefully when service fails", async () => {
        const failingAction = async () => {
            throw new Error("Network timeout");
        };

        const breaker = createCircuitBreaker(failingAction, {
            errorThresholdPercentage: 50,
            resetTimeout: 200,
            timeout: 50
        }, "TestFallbackService");

        breaker.fallback(() => ({ fallback: true, data: "cached-default" }));

        const result = await breaker.fire();
        assert.deepStrictEqual(result, { fallback: true, data: "cached-default" });
    });

    it("InternalServiceClient should provide safe fallback for getUserProfile when downstream Auth is down", async () => {
        const client = new InternalServiceClient();
        
        // Point to an invalid unreachable port to simulate Auth service downtime
        process.env.AUTH_INTERNAL_URL = "http://127.0.0.1:59999";

        const profile = await client.getUserProfile("user-test-123");
        assert.strictEqual(profile.id, "user-test-123");
        assert.strictEqual(profile.name, "Unknown User");
        assert.strictEqual(profile.username, "unknown");
        assert.strictEqual(profile.isFallback, true);
    });

    it("InternalServiceClient should expose real-time circuit status", () => {
        const client = new InternalServiceClient();
        const status = client.getCircuitStatus();

        assert.ok(status.getBreaker, "Must have getBreaker status");
        assert.ok(status.postBreaker, "Must have postBreaker status");
        assert.strictEqual(typeof status.getBreaker.opened, "boolean");
        assert.strictEqual(typeof status.getBreaker.closed, "boolean");
    });
});

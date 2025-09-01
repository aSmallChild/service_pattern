import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'crypto';
import registerUser from './registerUser.js';
import { deleteUser, getUser } from '../dal/user.js';
import { clearMessages, listMessages } from '../test/mail.js';
import { closeDbPool } from '../util/getUserDbConnection.js';
import { deleteEmailToken } from '../dal/userEmailValidation.js';

describe('service registerUser()', () => {
    let createdUsers = [];
    let emailValidationIds = [];

    beforeEach(async () => {
        await clearMessages();
        createdUsers = [];
        emailValidationIds = [];
    });

    after(async () => {
        await deleteUser({ userId: createdUsers });
        await deleteEmailToken({ userEmailValidationId: emailValidationIds });
        await closeDbPool();
    });

    test('successfully registers new user and sends verification email', async () => {
        const userDetails = {
            username: `testuser_${randomUUID()}`,
            email: `newuser${randomUUID()}@example.com`,
            password: 'password123'
        };

        const result = await registerUser(userDetails);
        if (result.user?.userId) {
            createdUsers.push(result.user.userId);
        }

        assert.ok(result.status);
        assert.ok(result.user);
        assert.strictEqual(result.user.username, userDetails.username);
        assert.strictEqual(result.user.email, userDetails.email);

        let msgs = await listMessages();
        assert.ok(msgs.total > 1);
    });

    test('returns conflict when username already exists', async () => {
        const existingUserDetails = {
            username: `existing_${randomUUID()}`,
            email: `existing${randomUUID()}@example.com`,
            password: 'password123'
        };

        const firstResult = await registerUser(existingUserDetails);
        createdUsers.push(existingUserDetails.userId);
        if (firstResult.user?.userId) {
            createdUsers.push(firstResult.user.userId);
        }

        const duplicateUserDetails = {
            username: existingUserDetails.username,
            email: 'different@example.com',
            password: 'different123'
        };

        const result = await registerUser(duplicateUserDetails);

        assert.strictEqual(result.status, 'CONFLICT');
        assert.ok(result.conflictingUser);
        assert.strictEqual(result.conflictingUser.username, existingUserDetails.username);
        assert.ok(!result.user);
    });

    test('handles user creation failure gracefully', async () => {
        const invalidUserDetails = {
            username: `testuser_${randomUUID()}`,
            email: 'invalid-email-format',
            password: null
        };

        const result = await registerUser(invalidUserDetails);

        assert.ok(result.status);
        assert.ok(result.status !== 'SUCCESS');
        assert.ok(!result.user);

        const msgs = await listMessages();
        assert.strictEqual(msgs.total, 0);
    });

    test('returns user data with correct structure on success', async () => {
        const userDetails = {
            username: `testuser_${randomUUID()}`,
            email: `structure${randomUUID()}@example.com`,
            password: 'password123',
        };

        const result = await registerUser(userDetails);
        if (result.user?.userId) {
            createdUsers.push(result.user.userId);
        }

        assert.ok(result.status);
        assert.ok(result.user);
        assert.strictEqual(typeof result.user.userId, 'string');
        assert.strictEqual(result.user.username, userDetails.username);
        assert.strictEqual(result.user.email, userDetails.email);
        assert.ok(!result.user.password);
        assert.ok(!result.conflictingUser);
        assert.ok(!result.message);
    });

    test('handles empty or missing userDetails gracefully', async () => {
        const result = await registerUser({});

        assert.ok(result.status);
        assert.ok(result.status !== 'SUCCESS');
        assert.ok(!result.user);
    });

    test('verifies user is actually stored in database after registration', async () => {
        const userDetails = {
            username: `verify_${randomUUID()}`,
            email: `verify${randomUUID()}@example.com`,
            password: 'password123'
        };

        const result = await registerUser(userDetails);

        if (result.user?.userId) {
            createdUsers.push(result.user.userId);
        }

        const storedUser = await getUser({ username: userDetails.username });
        assert.strictEqual(storedUser.users.length, 1);
        assert.strictEqual(storedUser.users[0].username, userDetails.username);
        assert.strictEqual(storedUser.users[0].email, userDetails.email);
    });
});

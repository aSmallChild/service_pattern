import { after, before, describe, test } from 'node:test';
import assert from 'node:assert';
import { createUser, deleteUser, getUser, putUser, updateUser } from './user.js';
import getUserDbConnection, { closeDbPool } from '../util/getUserDbConnection.js';

// Test data
const testUser = {
    username: 'john_doe',
    email: 'john@example.com',
    passwordHash: '$2b$12$hashedpassword...'
};

const testUser2 = {
    username: 'jane_doe',
    email: 'jane@example.com',
    passwordHash: '$2b$12$anotherhashedpassword...'
};

describe('User DAL Tests', () => {
    let createdUserId;
    let createdUserId2;

    before(async () => {
        const sql = await getUserDbConnection();
        await sql`DELETE
                  FROM "user"
                  WHERE username IN ('john_doe', 'john_doe2', 'jane_doe')`;
    });

    after(async () => {
        const sql = await getUserDbConnection();
        await sql`DELETE
                  FROM "user"
                  WHERE username IN ('john_doe', 'john_doe2', 'jane_doe')`;
        await closeDbPool();
    });

    describe('createUser', () => {
        test('should create a new user successfully', async () => {
            const result = await createUser(testUser);

            assert.ok(result.users, 'Result should have users array');
            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');

            const [user] = result.users;
            assert.ok(user.userId, 'User should have userId');
            assert.strictEqual(user.username, testUser.username, 'Username should match');
            assert.strictEqual(user.email, testUser.email, 'Email should match');
            assert.strictEqual(user.passwordHash, testUser.passwordHash, 'Password hash should match');
            assert.strictEqual(user.emailValidated, false, 'Email should not be validated by default');
            assert.ok(user.created, 'Should have created timestamp');
            assert.ok(user.updated, 'Should have updated timestamp');

            createdUserId = user.userId;

        });

        test('should throw error when required fields are missing', async () => {
            await assert.rejects(
                async () => await createUser({ username: 'test' }),
                /username, email, and passwordHash are required/,
                'Should throw error for missing fields'
            );
        });

        test('should throw error for duplicate username', async () => {
            await assert.rejects(
                async () => await createUser(testUser),
                /duplicate key value/,
                'Should throw error for duplicate username'
            );
        });

        test('should throw error for duplicate email', async () => {
            await assert.rejects(
                async () => await createUser({
                    username: 'different_user',
                    email: testUser.email,
                    passwordHash: '$2b$12$different...'
                }),
                /duplicate key value/,
                'Should throw error for duplicate email'
            );
        });
    });

    describe('updateUser', () => {
        test('should update user successfully', async () => {
            const result = await updateUser({
                userId: createdUserId,
                username: 'john_doe2',
                emailValidated: true
            });

            assert.ok(result.users, 'Result should have users array');
            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');

            const [user] = result.users;
            assert.strictEqual(user.userId, createdUserId, 'UserId should remain the same');
            assert.strictEqual(user.username, 'john_doe2', 'Username should be updated');
            assert.strictEqual(user.email, testUser.email, 'Email should remain the same');
            assert.strictEqual(user.emailValidated, true, 'Email validated should be updated');
            assert.notStrictEqual(user.created, user.updated, 'Updated timestamp should be different from created');

        });

        test('should throw error when userId is missing', async () => {
            await assert.rejects(
                async () => await updateUser({ username: 'test' }),
                /userId is required/,
                'Should throw error when userId is missing'
            );
        });

        test('should throw error when no fields to update', async () => {
            await assert.rejects(
                async () => await updateUser({ userId: createdUserId }),
                /No fields to update/,
                'Should throw error when no fields to update'
            );
        });

        test('should return empty array for non-existent user', async () => {
            const result = await updateUser({
                userId: '00000000-0000-0000-0000-000000000000',
                username: 'nonexistent'
            });

            assert.strictEqual(result.users.length, 0, 'Should return empty array for non-existent user');
        });
    });

    describe('getUser', () => {
        test('should retrieve user by username', async () => {
            const result = await getUser({ username: 'john_doe2' });

            assert.ok(result.users, 'Result should have users array');
            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');

            const [user] = result.users;
            assert.strictEqual(user.userId, createdUserId, 'Should return correct user');
            assert.strictEqual(user.username, 'john_doe2', 'Username should match');
            assert.strictEqual(user.emailValidated, true, 'Should reflect previous update');

        });

        test('should retrieve user by userId', async () => {
            const result = await getUser({ userId: createdUserId });

            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');
            assert.strictEqual(result.users[0].userId, createdUserId, 'Should return correct user');
        });

        test('should retrieve user by email', async () => {
            const result = await getUser({ email: testUser.email });

            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');
            assert.strictEqual(result.users[0].email, testUser.email, 'Should return correct user');
        });

        test('should handle multiple matching criteria', async () => {
            const result = await getUser({
                userId: createdUserId,
                username: 'john_doe2'
            });

            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');
            assert.strictEqual(result.users[0].userId, createdUserId, 'Should return correct user');
        });

        test('should return empty array for non-existent user', async () => {
            const result = await getUser({ username: 'nonexistent' });

            assert.strictEqual(result.users.length, 0, 'Should return empty array for non-existent user');
        });

        test('should throw error when no parameters provided', async () => {
            await assert.rejects(
                async () => await getUser({}),
                /No valid parameters provided/,
                'Should throw error when no parameters provided'
            );
        });
    });

    describe('deleteUser', () => {
        test('setup: create second user for deletion', async () => {
            const result = await createUser(testUser2);
            createdUserId2 = result.users[0].userId;
            assert.ok(createdUserId2, 'Should create second test user');
        });

        test('should delete user and return deleted user data', async () => {
            const result = await deleteUser({ username: 'jane_doe' });

            assert.ok(result.users, 'Result should have users array');
            assert.strictEqual(result.users.length, 1, 'Should return exactly one deleted user');

            const [deletedUser] = result.users;
            assert.strictEqual(deletedUser.userId, createdUserId2, 'Should return correct deleted user');
            assert.strictEqual(deletedUser.username, 'jane_doe', 'Username should match');
            assert.strictEqual(deletedUser.email, testUser2.email, 'Email should match');

            const verifyResult = await getUser({ userId: createdUserId2 });
            assert.strictEqual(verifyResult.users.length, 0, 'User should no longer exist in database');
        });

        test('should return empty array for non-existent user', async () => {
            const result = await deleteUser({ username: 'nonexistent' });

            assert.strictEqual(result.users.length, 0, 'Should return empty array for non-existent user');
        });

        test('should throw error when no parameters provided', async () => {
            await assert.rejects(
                async () => await deleteUser({}),
                /No valid parameters provided/,
                'Should throw error when no parameters provided'
            );
        });

        test('cleanup: delete remaining test user', async () => {
            const result = await deleteUser({ username: 'john_doe2' });
            assert.strictEqual(result.users.length, 1, 'Should delete the remaining test user');
        });
    });

    describe('Integration Test - Full User Lifecycle', () => {
        test('should handle complete user lifecycle', async () => {
            const newUser = await putUser({
                username: 'lifecycle_user',
                email: 'lifecycle@example.com',
                passwordHash: '$2b$12$lifecycle...'
            });

            assert.strictEqual(newUser.users.length, 1, 'Should create user');
            let [user] = newUser.users;

            const updatedUser = await putUser({
                userId: user.userId,
                username: 'lifecycle_user_updated',
                emailValidated: true
            });

            assert.strictEqual(updatedUser.users.length, 1, 'Should update user');
            [user] = updatedUser.users;
            assert.strictEqual(user.username, 'lifecycle_user_updated', 'Username should be updated');
            assert.strictEqual(user.emailValidated, true, 'Email should be validated');

            const retrievedUser = await getUser({ username: 'lifecycle_user_updated' });

            assert.strictEqual(retrievedUser.users.length, 1, 'Should retrieve user');
            assert.strictEqual(retrievedUser.users[0].userId, user.userId, 'Should retrieve correct user');

            const deletedUser = await deleteUser({ username: 'lifecycle_user_updated' });

            assert.strictEqual(deletedUser.users.length, 1, 'Should delete user');
            assert.strictEqual(deletedUser.users[0].userId, user.userId, 'Should delete correct user');

            const verifyDeletion = await getUser({ userId: user.userId });
            assert.strictEqual(verifyDeletion.users.length, 0, 'User should no longer exist');
        });
    });
});
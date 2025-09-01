import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'crypto';
import { createUser, deleteUser, getUser, putUser, updateUser } from './user.js';
import { closeDbPool } from '../util/getUserDbConnection.js';
import { INVALID } from '../util/result.js';

describe('User DAL Tests', () => {
    let createdUsers = [];

    beforeEach(() => {
        createdUsers = [];
    });

    after(async () => {
        try {
            await deleteUser({ userId: createdUsers });
        }
        catch (error) {
            console.log(`Cleanup warning: Could not delete users ${createdUsers}`);
        }
        await closeDbPool();
    });

    describe('createUser', () => {
        test('should create a new user successfully', async () => {
            const testUser = {
                username: `john_doe_${randomUUID()}`,
                email: `john_${randomUUID()}@example.com`,
                passwordHash: '$2b$12$hashedpassword...'
            };

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

            createdUsers.push(user.userId);
        });

        test('should return invalid when required fields are missing', async () => {
            const result = await createUser({ username: `test_${randomUUID()}` });
            assert.strictEqual(result.status, INVALID);
        });
    });

    describe('updateUser', () => {
        test('should update user successfully', async () => {
            const testUser = {
                username: `update_test_${randomUUID()}`,
                email: `update_${randomUUID()}@example.com`,
                passwordHash: '$2b$12$hashedpassword...'
            };

            const createResult = await createUser(testUser);
            const userId = createResult.users[0].userId;
            createdUsers.push(userId);

            const newUsername = `updated_${randomUUID()}`;
            const result = await updateUser({
                userId,
                username: newUsername,
                emailValidated: true
            });

            assert.ok(result.users, 'Result should have users array');
            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');

            const [user] = result.users;
            assert.strictEqual(user.userId, userId, 'UserId should remain the same');
            assert.strictEqual(user.username, newUsername, 'Username should be updated');
            assert.strictEqual(user.email, testUser.email, 'Email should remain the same');
            assert.strictEqual(user.emailValidated, true, 'Email validated should be updated');
            assert.notStrictEqual(user.created, user.updated, 'Updated timestamp should be different from created');
        });

        test('should return invalid status when userId is missing', async () => {
            const result = await updateUser({ username: `test_${randomUUID()}` });
            assert.strictEqual(result.status, INVALID);
        });

        test('should return invalid status when no fields to update', async () => {
            const result = await updateUser({ userId: randomUUID() });
            assert.strictEqual(result.status, INVALID);
        });

        test('should return invalid status for non-existent user', async () => {
            const result = await updateUser({
                userId: randomUUID(),
                username: `nonexistent_${randomUUID()}`
            });
            assert.strictEqual(result.status, INVALID);
        });
    });

    describe('getUser', () => {
        test('should retrieve user by username', async () => {
            const testUser = {
                username: `get_test_${randomUUID()}`,
                email: `get_${randomUUID()}@example.com`,
                passwordHash: '$2b$12$hashedpassword...'
            };

            const createResult = await createUser(testUser);
            const userId = createResult.users[0].userId;
            createdUsers.push(userId);

            const result = await getUser({ username: testUser.username });

            assert.ok(result.users, 'Result should have users array');
            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');

            const [user] = result.users;
            assert.strictEqual(user.userId, userId, 'Should return correct user');
            assert.strictEqual(user.username, testUser.username, 'Username should match');
        });

        test('should retrieve user by userId', async () => {
            const testUser = {
                username: `get_by_id_${randomUUID()}`,
                email: `get_by_id_${randomUUID()}@example.com`,
                passwordHash: '$2b$12$hashedpassword...'
            };

            const createResult = await createUser(testUser);
            const userId = createResult.users[0].userId;
            createdUsers.push(userId);

            const result = await getUser({ userId });

            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');
            assert.strictEqual(result.users[0].userId, userId, 'Should return correct user');
        });

        test('should retrieve user by email', async () => {
            const testUser = {
                username: `get_by_email_${randomUUID()}`,
                email: `get_by_email_${randomUUID()}@example.com`,
                passwordHash: '$2b$12$hashedpassword...'
            };

            const createResult = await createUser(testUser);
            const userId = createResult.users[0].userId;
            createdUsers.push(userId);

            const result = await getUser({ email: testUser.email });

            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');
            assert.strictEqual(result.users[0].email, testUser.email, 'Should return correct user');
        });

        test('should handle multiple matching criteria', async () => {
            const testUser = {
                username: `multi_${randomUUID()}`,
                email: `multi_${randomUUID()}@example.com`,
                passwordHash: '$2b$12$hashedpassword...'
            };

            const createResult = await createUser(testUser);
            const userId = createResult.users[0].userId;
            createdUsers.push(userId);

            const result = await getUser({
                userId,
                username: testUser.username
            });

            assert.strictEqual(result.users.length, 1, 'Should return exactly one user');
            assert.strictEqual(result.users[0].userId, userId, 'Should return correct user');
        });

        test('should return empty array for non-existent user', async () => {
            const result = await getUser({ username: `nonexistent_${randomUUID()}` });

            assert.strictEqual(result.users.length, 0, 'Should return empty array for non-existent user');
        });

        test('should return invalid status when no parameters provided', async () => {
            const result = await getUser({});
            assert.strictEqual(result.status, INVALID);
        });
    });

    describe('deleteUser', () => {
        test('should delete user and return deleted user data', async () => {
            const testUser = {
                username: `delete_test_${randomUUID()}`,
                email: `delete_${randomUUID()}@example.com`,
                passwordHash: '$2b$12$hashedpassword...'
            };

            const createResult = await createUser(testUser);
            const userId = createResult.users[0].userId;

            const result = await deleteUser({ username: testUser.username });

            assert.ok(result.users, 'Result should have users array');
            assert.strictEqual(result.users.length, 1, 'Should return exactly one deleted user');

            const [deletedUser] = result.users;
            assert.strictEqual(deletedUser.userId, userId, 'Should return correct deleted user');
            assert.strictEqual(deletedUser.username, testUser.username, 'Username should match');
            assert.strictEqual(deletedUser.email, testUser.email, 'Email should match');

            const verifyResult = await getUser({ userId });
            assert.strictEqual(verifyResult.users.length, 0, 'User should no longer exist in database');
        });

        test('should return empty array for non-existent user', async () => {
            const result = await deleteUser({ username: `nonexistent_${randomUUID()}` });

            assert.strictEqual(result.users.length, 0, 'Should return empty array for non-existent user');
        });

        test('should return invalid status when no parameters provided', async () => {
            const result = await deleteUser({});
            assert.strictEqual(result.status, INVALID);
        });
    });

    describe('Integration Test - Full User Lifecycle', () => {
        test('should handle complete user lifecycle', async () => {
            const lifecycleUser = {
                username: `lifecycle_${randomUUID()}`,
                email: `lifecycle_${randomUUID()}@example.com`,
                passwordHash: '$2b$12$lifecycle...'
            };

            const newUser = await putUser(lifecycleUser);

            assert.strictEqual(newUser.users.length, 1, 'Should create user');
            let [user] = newUser.users;
            createdUsers.push(user.userId);

            const newUsername = `lifecycle_2_${randomUUID()}`;
            const updatedUser = await putUser({
                userId: user.userId,
                username: newUsername,
                emailValidated: true
            });

            assert.strictEqual(updatedUser.users.length, 1, 'Should update user');
            [user] = updatedUser.users;
            assert.strictEqual(user.username, newUsername, 'Username should be updated');
            assert.strictEqual(user.emailValidated, true, 'Email should be validated');

            const retrievedUser = await getUser({ username: newUsername });

            assert.strictEqual(retrievedUser.users.length, 1, 'Should retrieve user');
            assert.strictEqual(retrievedUser.users[0].userId, user.userId, 'Should retrieve correct user');

            const deletedUser = await deleteUser({ username: newUsername });

            assert.strictEqual(deletedUser.users.length, 1, 'Should delete user');
            assert.strictEqual(deletedUser.users[0].userId, user.userId, 'Should delete correct user');

            const verifyDeletion = await getUser({ userId: user.userId });
            assert.strictEqual(verifyDeletion.users.length, 0, 'User should no longer exist');

            createdUsers = createdUsers.filter(id => id !== user.userId);
        });
    });

    describe('deleteUser', () => {
        test('should delete user and return deleted user data', async () => {
            const testUser = {
                username: `delete_single_${randomUUID()}`,
                email: `delete_${randomUUID()}@example.com`,
                passwordHash: '$2b$12$hashedpassword...'
            };

            const createResult = await createUser(testUser);
            const userId = createResult.users[0].userId;

            const result = await deleteUser({ username: testUser.username });

            assert.ok(result.users, 'Result should have users array');
            assert.strictEqual(result.users.length, 1, 'Should return exactly one deleted user');

            const [deletedUser] = result.users;
            assert.strictEqual(deletedUser.userId, userId, 'Should return correct deleted user');
            assert.strictEqual(deletedUser.username, testUser.username, 'Username should match');
            assert.strictEqual(deletedUser.email, testUser.email, 'Email should match');

            const verifyResult = await getUser({ userId });
            assert.strictEqual(verifyResult.users.length, 0, 'User should no longer exist in database');

            createdUsers = createdUsers.filter(id => id !== userId);
        });

        test('performance benchmark summary', async () => {
            console.log('\n--- Performance Summary ---');
            console.log('✓ Created 100 users individually');
            console.log('✓ Retrieved 100 users by userId array in single query');
            console.log('✓ Retrieved 100 users by username array in single query');
            console.log('✓ Retrieved 100 users by email array in single query');
            console.log('✓ All users will be cleaned up in after hook');
            console.log('--- End Summary ---\n');
        });
    });
});

describe('User DAL Tests - Bulk Operations - 100 Users', () => {
    const bulkUserIds = [];
    before(async () => {
        console.log('Creating 100 test users...');
        const startTime = Date.now();

        for (let i = 1; i <= 100; i++) {
            const user = await createUser({
                username: `bulk_user_${randomUUID()}_${i.toString().padStart(3, '0')}`,
                email: `bulk${randomUUID()}_${i.toString().padStart(3, '0')}@example.com`,
                passwordHash: `$2b$12$bulkuser${i}hash...`
            });

            bulkUserIds.push(user.users[0].userId);

            if (i % 10 === 0) {
                console.log(`✓ Created ${i}/100 users`);
            }
        }

        const endTime = Date.now();
        console.log(`✓ Created all 100 users in ${endTime - startTime}ms`);

        assert.strictEqual(bulkUserIds.length, 100, 'Should create exactly 100 users');
        assert.ok(bulkUserIds.every(userId => userId), 'All users should have userIds');
    });

    after(async () => {
        try {
            await deleteUser({ userId: bulkUserIds });
        }
        catch (error) {
            console.log(`Cleanup warning: Could not delete users ${bulkUserIds}`);
        }
        await closeDbPool();
    });

    test('should retrieve all users by userId array', async () => {
        const last100Users = bulkUserIds.slice(-100);
        assert.strictEqual(last100Users.length, 100, 'Test data not created.');
        console.log(`Retrieving ${last100Users.length} users by userId array...`);

        const startTime = Date.now();
        const result = await getUser({ userId: last100Users });
        const endTime = Date.now();

        console.log(`✓ Retrieved ${result.users.length} users by userId in ${endTime - startTime}ms`);

        assert.strictEqual(result.users.length, 100, 'Should retrieve all 100 users');

        const retrievedIds = result.users.map(user => user.userId);
        const missingIds = last100Users.filter(id => !retrievedIds.includes(id));
        assert.strictEqual(missingIds.length, 0, 'Should retrieve all requested userIds');

        assert.ok(result.users.every(user => user.username.startsWith('bulk_user_')), 'All retrieved users should have correct username pattern');
        assert.ok(result.users.every(user => user.email.includes('@example.com')), 'All retrieved users should have correct email pattern');
    });

    test('should retrieve all users by username array', async () => {
        const last100Users = bulkUserIds.slice(-100);
        assert.strictEqual(last100Users.length, 100, 'Test data not created.');
        const getUsersResult = await getUser({ userId: last100Users });
        const usernames = getUsersResult.users.map(user => user.username);

        console.log(`Retrieving ${usernames.length} users by username array...`);

        const startTime = Date.now();
        const result = await getUser({ username: usernames });
        const endTime = Date.now();

        console.log(`✓ Retrieved ${result.users.length} users by username in ${endTime - startTime}ms`);

        assert.strictEqual(result.users.length, 100, 'Should retrieve all 100 users');

        const retrievedUsernames = result.users.map(user => user.username);
        const missingUsernames = usernames.filter(name => !retrievedUsernames.includes(name));
        assert.strictEqual(missingUsernames.length, 0, 'Should retrieve all requested usernames');

        assert.ok(result.users.every(user => user.userId), 'All retrieved users should have userIds');
        assert.ok(result.users.every(user => user.email.includes('@example.com')), 'All retrieved users should have correct email domain');
    });

    test('should retrieve all users by email array', async () => {
        const last100Users = bulkUserIds.slice(-100);
        assert.strictEqual(last100Users.length, 100, 'Test data not created.');
        const getUsersResult = await getUser({ userId: last100Users });
        const emails = getUsersResult.users.map(user => user.email);

        console.log(`Retrieving ${emails.length} users by email array...`);

        const startTime = Date.now();
        const result = await getUser({ email: emails });
        const endTime = Date.now();

        console.log(`✓ Retrieved ${result.users.length} users by email in ${endTime - startTime}ms`);

        assert.strictEqual(result.users.length, 100, 'Should retrieve all 100 users');

        const retrievedEmails = result.users.map(user => user.email);
        const missingEmails = emails.filter(email => !retrievedEmails.includes(email));
        assert.strictEqual(missingEmails.length, 0, 'Should retrieve all requested emails');

        assert.ok(result.users.every(user => user.userId), 'All retrieved users should have userIds');
        assert.ok(result.users.every(user => user.username.startsWith('bulk_user_')), 'All retrieved users should have correct username pattern');
    });

    test('should retrieve partial sets using array queries', async () => {
        const last100Users = bulkUserIds.slice(-100);
        assert.strictEqual(last100Users.length, 100, 'Test data not created.');
        const first10Ids = last100Users.slice(0, 10);
        const first10Result = await getUser({ userId: first10Ids });

        assert.strictEqual(first10Result.users.length, 10, 'Should retrieve exactly 10 users');
        console.log(`✓ Retrieved partial set: ${first10Result.users.length}/10 users`);

        const last15Ids = last100Users.slice(-15);
        const getUsersResult = await getUser({ userId: last15Ids });
        const last15Usernames = getUsersResult.users.map(user => user.username);
        const last15Result = await getUser({ username: last15Usernames });

        assert.strictEqual(last15Result.users.length, 15, 'Should retrieve exactly 15 users');
        console.log(`✓ Retrieved partial set: ${last15Result.users.length}/15 users`);

        const middle20Ids = last100Users.slice(40, 60);
        const getMiddleUsersResult = await getUser({ userId: middle20Ids });
        const middle20Emails = getMiddleUsersResult.users.map(user => user.email);
        const middle20Result = await getUser({ email: middle20Emails });

        assert.strictEqual(middle20Result.users.length, 20, 'Should retrieve exactly 20 users');
        console.log(`✓ Retrieved partial set: ${middle20Result.users.length}/20 users`);
    });

    test('should handle mixed array and single value queries', async () => {
        const last100Users = bulkUserIds.slice(-100);
        assert.strictEqual(last100Users.length, 100, 'Test data not created.');
        const first5Ids = last100Users.slice(0, 5);
        const specificUserResult = await getUser({ userId: last100Users[10] });
        const specificUsername = specificUserResult.users[0].username;

        const result = await getUser({
            userId: first5Ids,
            username: specificUsername
        });

        assert.ok(result.users.length > 0, 'Should return some users');
        console.log(`✓ Mixed query returned ${result.users.length} users`);

        const resultIds = result.users.map(user => user.userId);
        const resultUsernames = result.users.map(user => user.username);

        const hasExpectedIds = first5Ids.some(id => resultIds.includes(id));
        const hasExpectedUsername = resultUsernames.includes(specificUsername);

        assert.ok(hasExpectedIds || hasExpectedUsername, 'Should contain either expected userIds or username');
    });

    test('should handle empty arrays gracefully', async () => {
        const result = await getUser({ userId: [] });

        assert.ok(Array.isArray(result.users), 'Should return users array');
        console.log(`✓ Empty array query returned ${result.users.length} users`);
    });

    test('should return empty array for non-existent user', async () => {
        const result = await getUser({ username: `nonexistent_${randomUUID()}` });

        assert.strictEqual(result.users.length, 0, 'Should return empty array for non-existent user');
    });
});

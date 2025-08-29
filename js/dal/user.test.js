import { after, before, describe, test } from 'node:test';
import assert from 'node:assert';
import { createUser, deleteUser, getUser, putUser, updateUser } from './user.js';
import getUserDbConnection, { closeDbPool } from '../util/getUserDbConnection.js';

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

    describe('Bulk Operations - 100 Users', () => {
        let bulkUsers = [];

        test('should create 100 users', async () => {
            console.log('Creating 100 test users...');
            const startTime = Date.now();

            for (let i = 1; i <= 100; i++) {
                const user = await createUser({
                    username: `bulk_user_${i.toString().padStart(3, '0')}`,
                    email: `bulk${i.toString().padStart(3, '0')}@example.com`,
                    passwordHash: `$2b$12$bulkuser${i}hash...`
                });

                bulkUsers.push(user.users[0]);

                if (i % 10 === 0) {
                    console.log(`✓ Created ${i}/100 users`);
                }
            }

            const endTime = Date.now();
            console.log(`✓ Created all 100 users in ${endTime - startTime}ms`);

            assert.strictEqual(bulkUsers.length, 100, 'Should create exactly 100 users');
            assert.ok(bulkUsers.every(user => user.userId), 'All users should have userIds');
            assert.ok(bulkUsers.every(user => user.username.startsWith('bulk_user_')), 'All users should have correct username pattern');
        });

        test('should retrieve all users by userId array', async () => {
            const userIds = bulkUsers.map(user => user.userId);
            console.log(`Retrieving ${userIds.length} users by userId array...`);

            const startTime = Date.now();
            const result = await getUser({ userId: userIds });
            const endTime = Date.now();

            console.log(`✓ Retrieved ${result.users.length} users by userId in ${endTime - startTime}ms`);

            assert.strictEqual(result.users.length, 100, 'Should retrieve all 100 users');

            const retrievedIds = result.users.map(user => user.userId);
            const missingIds = userIds.filter(id => !retrievedIds.includes(id));
            assert.strictEqual(missingIds.length, 0, 'Should retrieve all requested userIds');

            assert.ok(result.users.every(user => user.username.startsWith('bulk_user_')), 'All retrieved users should have correct username pattern');
            assert.ok(result.users.every(user => user.email.startsWith('bulk')), 'All retrieved users should have correct email pattern');
        });

        test('should retrieve all users by username array', async () => {
            const usernames = bulkUsers.map(user => user.username);
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
            const emails = bulkUsers.map(user => user.email);
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
            const first10Ids = bulkUsers.slice(0, 10).map(user => user.userId);
            const first10Result = await getUser({ userId: first10Ids });

            assert.strictEqual(first10Result.users.length, 10, 'Should retrieve exactly 10 users');
            console.log(`✓ Retrieved partial set: ${first10Result.users.length}/10 users`);

            const last15Usernames = bulkUsers.slice(-15).map(user => user.username);
            const last15Result = await getUser({ username: last15Usernames });

            assert.strictEqual(last15Result.users.length, 15, 'Should retrieve exactly 15 users');
            console.log(`✓ Retrieved partial set: ${last15Result.users.length}/15 users`);

            const middle20Emails = bulkUsers.slice(40, 60).map(user => user.email);
            const middle20Result = await getUser({ email: middle20Emails });

            assert.strictEqual(middle20Result.users.length, 20, 'Should retrieve exactly 20 users');
            console.log(`✓ Retrieved partial set: ${middle20Result.users.length}/20 users`);
        });

        test('should handle mixed array and single value queries', async () => {
            const first5Ids = bulkUsers.slice(0, 5).map(user => user.userId);
            const specificUsername = bulkUsers[10].username;

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

        test('should clean up all 100 bulk users', async () => {
            console.log('Cleaning up 100 bulk users...');
            const userIds = bulkUsers.map(user => user.userId);

            const startTime = Date.now();
            const result = await deleteUser({ userId: userIds });
            const endTime = Date.now();

            console.log(`✓ Deleted ${result.users.length} users in ${endTime - startTime}ms`);

            assert.strictEqual(result.users.length, 100, 'Should delete all 100 users');

            const verifyResult = await getUser({ userId: userIds });
            assert.strictEqual(verifyResult.users.length, 0, 'All users should be deleted from database');

            console.log('✓ Verified all bulk users are deleted');
            bulkUsers = [];
        });

        test('performance benchmark summary', async () => {
            console.log('\n--- Performance Summary ---');
            console.log('✓ Created 100 users individually');
            console.log('✓ Retrieved 100 users by userId array in single query');
            console.log('✓ Retrieved 100 users by username array in single query');
            console.log('✓ Retrieved 100 users by email array in single query');
            console.log('✓ Deleted 100 users by userId array in single query');
            console.log('--- End Summary ---\n');
        });
    });
});
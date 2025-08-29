import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert';
import verifyEmail from './verifyEmail.js';
import { randomUUID } from 'crypto';
import { clearMessages, getLatestText, listMessages } from '../test/mail.js';
import { closeDbPool } from '../util/getUserDbConnection.js';

describe('service verifyEmail()', () => {
    beforeEach(async () => {
        await clearMessages();
    });

    after(async () => {
        await closeDbPool();
    });

    test('verifyEmail sends correct subject, username, and token', async () => {
        const user = { userId: randomUUID(), email: 'test@example.com', username: 'Alice' };

        const result = await verifyEmail(user);
        const msgs = await listMessages();
        assert.strictEqual(msgs.total, 1);
        assert.strictEqual(msgs.messages[0].Subject, 'Sample email verification');

        const text = await getLatestText();
        assert.ok(text.includes(user.username));

        const tokenMatch = text.match(/\/verify\/(?<token>[A-Za-z0-9\-_]+)/);
        assert.ok(tokenMatch?.groups?.token);

        assert.strictEqual(tokenMatch.groups.token, result.userEmailValidation.emailToken);
    });
});


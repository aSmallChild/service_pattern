import { describe, beforeEach, test } from 'node:test';
import assert from 'node:assert';
import sendMail from './mail.js';

const MAILPIT_API = 'http://localhost:8025';

async function listMessages() {
    const res = await fetch(`${MAILPIT_API}/api/v1/messages`);
    return res.json();
}

async function getLatestText() {
    const res = await fetch(`${MAILPIT_API}/view/latest.txt`);
    if (!res.ok) {
        throw new Error('Failed to get latest text');
    }
    return res.text();
}

describe('dal/mail', () => {
    beforeEach(async () => {
        await fetch(`${MAILPIT_API}/api/v1/messages`, {
            method: 'DELETE'
        });
    });

    test('sendMail delivers an email to Mailpit', async () => {
        const payload = {
            to: 'test@example.com',
            subject: 'Test Subject',
            text: 'Hello, world!',
            html: '<p>Hello, <strong>world</strong>!</p>'
        };

        const result = await sendMail(payload);
        assert.strictEqual(result.status, 'SUCCESS');

        const msgs = await listMessages();
        assert.ok(msgs.total > 0);

        const latestText = await getLatestText();
        assert.ok(latestText.includes('Hello, world!'));
    });
});
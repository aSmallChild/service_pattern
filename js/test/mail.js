const MAILPIT_API = 'http://localhost:8025';

export async function listMessages() {
    const res = await fetch(`${MAILPIT_API}/api/v1/messages`);
    return res.json();
}

export async function getLatestText() {
    const res = await fetch(`${MAILPIT_API}/view/latest.txt`);
    if (!res.ok) {
        throw new Error('Failed to get latest text');
    }
    return res.text();
}

export async function clearMessages() {
    await fetch(`${MAILPIT_API}/api/v1/messages`, { method: 'DELETE' });
}

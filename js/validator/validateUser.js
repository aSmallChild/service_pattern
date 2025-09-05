import { INVALID, SUCCESS } from '../util/result.js';

export default function validateUser(payload) {
    const { username, password, email } = payload;
    const validationErrors = [];
    if (!username || typeof username !== 'string') {
        validationErrors.push({ field: 'username', message: 'username is required' });
    }

    if (!password || typeof password !== 'string') {
        validationErrors.push({ field: 'password', message: 'password is required' });
    }
    else if (password.length < 2) {
        validationErrors.push({ field: 'password', message: 'password too short' });
    }

    const atIndex = `${email}`.indexOf('@');
    if (!email || typeof email !== 'string') {
        validationErrors.push({ field: 'email', message: 'email is required' });
    }
    else if (atIndex < 1 || email.length - 1 <= atIndex) {
        validationErrors.push({ field: 'email', message: 'email needs an @ in the middle' });
    }

    if (validationErrors.length > 0) {
        return {
            status: INVALID,
            message: 'Validation failed!',
            validationErrors,
        };
    }

    return { status: SUCCESS, user: { username, password, email } };
}

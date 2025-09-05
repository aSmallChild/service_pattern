import { INVALID, SUCCESS } from '../util/result.js';

export default async function validateUser(payload) {
    const { username, password, email } = payload;
    const validationErrors = [];
    if (!username) {
        validationErrors.push({ field: 'username', message: 'username is required' });
    }

    if (!password) {
        validationErrors.push({ field: 'password', message: 'password is required' });
    }
    else if (password.length <= 1) {
        validationErrors.push({ field: 'password', message: 'password must be more than 1 character long' });
    }

    if (!email) {
        validationErrors.push({ field: 'email', message: 'email is required' });
    }
    else if (!email.includes('@') || email.indexOf('@') === 0 || email.indexOf('@') === email.length - 1) {
        validationErrors.push({ field: 'email', message: 'email must contain @ in the middle' });
    }

    if (validationErrors.length > 0) {
        return {
            status: INVALID,
            message: 'Validation failed',
            validationErrors,
        };
    }

    return { status: SUCCESS, user: { username, password, email } };
}

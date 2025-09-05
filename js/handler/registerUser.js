import registerUser from '../service/registerUser.js';
import { INVALID } from '../util/result.js';
import httpHandler from '../util/httpHandler.js';
import validateUser from '../service/validateUser.js';

export const handler = httpHandler(async (event) => {
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    }
    catch (parseError) {
        return {
            status: INVALID,
            message: 'Invalid JSON in request body',
            validationErrors: [parseError.message],
        };
    }
    const result = validateUser(body);
    if (result.status === INVALID) {
        return result;
    }
    return registerUser(result.user);
});

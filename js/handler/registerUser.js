import validateUser from '../validator/validateUser.js';
import registerUser from '../service/registerUser.js';
import { INVALID, isSuccessful } from '../util/result.js';
import httpHandler from '../util/httpHandler.js';

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
    if (!isSuccessful(result)) {
        return result;
    }
    return registerUser(result.user);
});

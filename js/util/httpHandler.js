import { FAILED, toHttpStatus } from './result.js';

export default function httpHandler(handler) {
    return async function (event, context) {
        try {
            const result = await handler(event, context);
            return {
                statusCode: toHttpStatus(result),
                body: JSON.stringify(result),
            }
        }
        catch (error) {
            console.error(new Error('Unhandled exception:', { cause: error }));
            return {
                statusCode: 500,
                body: JSON.stringify({
                    status: FAILED,
                    message: 'Internal server error'
                })
            };
        }
    };
}

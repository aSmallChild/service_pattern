import { getUser, putUser } from '../dal/user.js';
import verifyEmail from './verifyEmail.js';
import { CONFLICT, isSuccessful } from '../util/result.js';

export default async function registerUser(userDetails) {
    const existingUser = await getUser({ username: userDetails.username });
    if (existingUser.users.length) {
        return { status: CONFLICT, conflictingUser: existingUser.users[0] };
    }

    let result = await putUser(userDetails);
    if (!isSuccessful(result.status)) {
        return result;
    }
    const { status, users: [user] } = result;

    result = await verifyEmail(userDetails);
    if (!isSuccessful(result.status)) {
        result.message = 'Failed to send verification email.';
        result.user = user;
        return result;
    }

    return { status, user };
}

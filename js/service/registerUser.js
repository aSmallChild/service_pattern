import { getUser, putUser } from '../dal/user.js';
import sendEmailValidation from './sendEmailValidation.js';
import { CONFLICT, INVALID, isSuccessful } from '../util/result.js';
import { hashPassword } from '../util/hashPassword.js';

export default async function registerUser(userDetails) {
    const existingUser = await getUser({ username: userDetails.username, email: userDetails.email });
    if (existingUser.users?.length) {
        return { status: CONFLICT, conflictingUser: existingUser.users[0] };
    }

    if (!userDetails.password) {
        return { status: INVALID };
    }
    userDetails.passwordHash = hashPassword(userDetails.password);
    delete userDetails.password;

    let result = await putUser(userDetails);
    if (!isSuccessful(result.status)) {
        return result;
    }
    const { status, users: [user] } = result;

    result = await sendEmailValidation(user);
    if (!isSuccessful(result.status)) {
        result.message = 'Failed to send verification email.';
        result.user = user;
        return result;
    }

    return { status, user };
}

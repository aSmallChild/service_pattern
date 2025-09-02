import { getUser, putUser } from '../dal/user.js';
import sendEmailValidation from './sendEmailValidation.js';
import { CONFLICT, INVALID, isSuccessful } from '../util/result.js';
import { hashPassword } from '../util/hashPassword.js';

export default async function registerUser(newUser) {
    let result = await getUser(newUser);
    if (result.users?.length) {
        return {
            status: CONFLICT,
            conflictingUser: result.users[0]
        };
    }

    if (!newUser.password) {
        return { status: INVALID };
    }
    newUser.passwordHash = hashPassword(newUser.password);
    delete newUser.password;

    result = await putUser(newUser);
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

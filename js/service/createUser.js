import { putUser } from '../dal/user.js';
import * as Result from '../util/result.js';
import getUser from '../getUser.js';
import verifyUserEmail from '../verifyUserEmail.js';

export default async function createUser(user) {
    const existingUser = getUser({ username: user.username });
    if (existingUser) {
        return { status: Result.CONFLICT };
    }
    await verifyUserEmail(user);
    return putUser(user);
}

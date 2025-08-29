import { putUser } from '../dal/user.js';
import * as Result from '../util/result.js';

export class UserService {
    constructor() {

    }

    async createUser(user) {
        const existingUser = this.getUser({ username: user.username });
        if (existingUser) {
            return { status: Result.CONFLICT };
        }
        await this.verifyUserEmail(user);
        return putUser(user);
    }

    async getUser(user) {
        // ...
    }

    async verifyUserEmail(user) {
        // ...
    }
}
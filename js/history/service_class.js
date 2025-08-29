import { putUser } from '../dal/user.js';
import * as Result from '../util/result.js';
import GetUser from './GetUser.js';
import VerifyUserEmail from './VerifyUserEmail.js';

export class CreateUser {
    static instance;

    constructor() {
        this.getUser = GetUser.getInstance();
        this.verifyUserEmail = VerifyUserEmail.getInstance();
    }

    async run(user) {
        const existingUser = this.getUser.run({ username: user.username });
        if (existingUser) {
            return { status: Result.CONFLICT };
        }
        this.verifyUserEmail.run(user);
        const result = await putUser(user);
        return { status: Result.CREATED, user: result.users[0] };
    }

    static getInstance() {
        if (!CreateUser.instance) {
            CreateUser.instance = new CreateUser();
        }
        return CreateUser.instance;
    }
}
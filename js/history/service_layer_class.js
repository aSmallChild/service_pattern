import { getUser, putUser } from '../dal/user.js';
import * as Result from '../util/result.js';
import { getEmailToken } from '../dal/userEmailValidation.js';

export class UserService {
    constructor() {
        // !?
    }

    async createUser(newUser) {
        const existingUser = getUser({ username: newUser.username });
        if (existingUser) {
            return { status: Result.CONFLICT };
        }
        await this.sendEmailVerification(newUser);
        return putUser(newUser);
    }

    async sendEmailVerification(user) {
        const token = generateTokenBase64();
        await createEmailToken({ userId: user.userId, emailToken: token });
        return sendMail({ to: user.email, subject: 'Sample email verification',
            text: `Dearest ${user.username},
                Please click this link
                https://jombo.com/verify/${token}`.replaceAll('  ', '')
        })
    }

    async validateEmail(emailToken) {
        const token = await getEmailToken({ emailToken });
        const user = await getUser(token);
        user.emailValidated = true;
        return putUser(user);
    }
}
import sendMail from '../dal/mail.js';
import { createEmailToken } from '../dal/userEmailValidation.js';
import { randomBytes } from 'crypto';
import { isSuccessful } from '../util/result.js';

export default async function verifyEmail(user) {
    const token = generateTokenBase64();
    const tokenResult = await createEmailToken({ userId: user.userId, emailToken: token });
    if (!isSuccessful(tokenResult)) {
        return tokenResult;
    }
    const userEmailValidation = tokenResult.emailTokens[0];
    const emailResult = await sendMail({
        to: user.email,
        subject: 'Sample email verification',
        text: `Dearest ${user.username},
        
        We are overjoyed to have you register. Please follow the link to verify your email address.
        
        https://sample.com/verify/${token}
        
        Have a great day.
        The Sample App team.`.replaceAll('  ', '')
    });
    if (!isSuccessful(emailResult)) {
        return emailResult;
    }

    return {
        status: tokenResult.status,
        userEmailValidation
    };
}

function generateTokenBase64(len = 48) {
    return randomBytes(len).toString('base64url');
}

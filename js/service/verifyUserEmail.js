import sendMail from '../dal/mail.js';

export default async function verifyUserEmail(user) {
    let result = sendMail({
        to: user.email,
        subject: 'Sample email verification',
        text: `
        Dearest ${user.username},
        
        The Sample App team is overjoyed to have you register. Please follow the link to verify your email address.
        
        
        `
    });
}
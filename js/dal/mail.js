import { createTransport } from 'nodemailer';
import { FAILED, SUCCESS } from '../util/result.js';

let client;
export default async function sendMail({ to, subject, text, html }) {
    if (!client) {
        client = createTransport({
            host: '127.0.0.1',
            port: 1025,
            secure: false,
        });
    }

    try {
        const result = await client.sendMail({
            from: 'service@pattern.com',
            to,
            subject,
            text,
            html,
        });

        if (!result.accepted.length) {
            return { status: FAILED };
        }
    }
    catch (error) {
        console.error('sendMail() failed: ', error);
        return { status: FAILED };
    }

    return { status: SUCCESS };
}

// const result = await sendMail({
//     to: 'woot@asd.com',
//     subject: 'Woot',
//     text: 'Hello World!',
// });
//
// console.log(result);

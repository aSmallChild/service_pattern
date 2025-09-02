import { randomBytes, pbkdf2Sync } from 'crypto';

export function hashPassword(password) {
    const salt = randomBytes(32);
    const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return salt.toString('hex') + ':' + hash.toString('hex');
}

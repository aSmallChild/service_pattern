import getUserDbConnection, { dbResultToArray, addCondition } from '../util/getUserDbConnection.js';
import { SUCCESS, CREATED, DELETED, INVALID } from '../util/result.js';
import User from '../model/User.js';

function userFields(alias = '') {
    alias = alias ? alias + '.' : '';
    return `
        ${alias}user_id AS "userId",
        ${alias}username,
        ${alias}password_hash AS "passwordHash",
        ${alias}email,
        ${alias}email_validated AS "emailValidated",
        ${alias}created,
        ${alias}updated
    `;
}

function buildWhereConditions(sql, { userId, username, email }) {
    const conditions = [];
    addCondition(sql, conditions, 'user_id', userId);
    addCondition(sql, conditions, 'username', username);
    addCondition(sql, conditions, 'email', email);
    return conditions;
}

/**
 * @returns {Promise<{status: string, users: (User[])}>}
 */
export async function putUser(user) {
    try {
        if (user.userId) {
            return updateUser(user);
        }

        return createUser(user);
    }
    catch (error) {
        throw new Error('Error in putUser:', { cause: error });
    }
}

/**
 * @returns {Promise<{status: string, users?: (User[])}>}
 */
export async function createUser({ username, email, passwordHash }) {
    if (!username || !email || !passwordHash) {
        return { status: INVALID };
    }
    const sql = await getUserDbConnection();
    try {
        const result = await sql`
            INSERT INTO "user" (username, email, password_hash, email_validated)
            VALUES (${username}, ${email}, ${passwordHash}, false)
            RETURNING ${sql.unsafe(userFields())}
        `;
        return { status: CREATED, users: dbResultToArray(result, User) };
    }
    catch (error) {
        throw new Error('Error in createUser:', { cause: error });
    }
}

/**
 * @returns {Promise<{status: string, users?: (User[])}>}
 */
export async function updateUser({ userId, username, email, passwordHash, emailValidated }) {
    if (!userId) {
        return { status: INVALID };
    }

    const sql = await getUserDbConnection();
    const updates = [];
    const comma = () => sql.unsafe(updates.length ? ', ' : '');

    if (username !== undefined) {
        updates.push(sql`${comma()}username = ${username}`);
    }
    if (email !== undefined) {
        updates.push(sql`${comma()}email = ${email}`);
    }
    if (passwordHash !== undefined) {
        updates.push(sql`${comma()}password_hash = ${passwordHash}`);
    }
    if (emailValidated !== undefined) {
        updates.push(sql`${comma()}email_validated = ${emailValidated}`);
    }

    if (!updates.length) {
        return { status: INVALID };
    }

    try {
        const result = await sql`
            UPDATE "user"
            SET ${updates},
                updated = CURRENT_TIMESTAMP
            WHERE user_id = ${userId}
            RETURNING ${sql.unsafe(userFields())}
        `;
        if (!result.length) {
            return { status: INVALID };
        }
        return { status: SUCCESS, users: dbResultToArray(result, User) };
    }
    catch (error) {
        throw new Error('Error in updateUser:', { cause: error });
    }
}

/**
 * @returns {Promise<{status: string, users?: (User[])}>}
 */
export async function getUser({ userId, username, email }) {
    const sql = await getUserDbConnection();
    const conditions = buildWhereConditions(sql, {
        userId,
        username,
        email
    });
    if (!conditions.length) {
        return { status: INVALID };
    }
    try {
        const result = await sql`
            SELECT ${sql.unsafe(userFields())}
            FROM "user" u
            WHERE ${conditions}
        `;
        return {
            status: SUCCESS,
            users: dbResultToArray(result, User)
        };
    }
    catch (error) {
        throw new Error('Error in getUser:', { cause: error });
    }
}

/**
 * @returns {Promise<{status: string, users?: (User[])}>}
 */
export async function deleteUser({ userId, username, email }) {
    const sql = await getUserDbConnection();
    const conditions = buildWhereConditions(sql, { userId, username, email });
    if (!conditions.length) {
        return { status: INVALID };
    }
    try {
        const result = await sql`
            DELETE
            FROM "user"
            WHERE ${conditions}
            RETURNING ${sql.unsafe(userFields())}
        `;
        return { status: DELETED, users: dbResultToArray(result, User) };
    }
    catch (error) {
        throw new Error('Error in deleteUser:', { cause: error });
    }
}

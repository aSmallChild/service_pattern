import getUserDbConnection, { dbResultToArray, addCondition } from '../util/getUserDbConnection.js';
import { SUCCESS, CREATED, DELETED } from '../util/result.js';

function emailTokenFields(alias = 'et') {
    return `
        ${alias}.user_email_validation_id AS "userEmailValidationId",
        ${alias}.user_id AS "userId",
        ${alias}.email_token AS "emailToken",
        ${alias}.verification_code_hash AS "verificationCodeHash",
        ${alias}.created
    `.trim();
}

function buildWhereConditions(sql, { userEmailValidationId, userId, emailToken }) {
    const conditions = [];
    addCondition(sql, conditions, 'user_email_validation_id', userEmailValidationId);
    addCondition(sql, conditions, 'user_id', userId);
    addCondition(sql, conditions, 'email_token', emailToken);
    return conditions;
}

export async function createEmailToken({ userId, emailToken, verificationCodeHash }) {
    if (!userId || !emailToken || !verificationCodeHash) {
        throw new Error('userId, emailToken, and verificationCodeHash are required');
    }

    const sql = await getUserDbConnection();

    try {
        const result = await sql`
            INSERT INTO user_email_validation (user_id, email_token, verification_code_hash)
            VALUES (${userId}, ${emailToken}, ${verificationCodeHash})
            RETURNING ${sql.unsafe(emailTokenFields())}
        `;
        return { status: CREATED, emailTokens: dbResultToArray(result) };
    } catch (error) {
        throw new Error('Error in createEmailToken', { cause: error });
    }
}

export async function updateEmailToken({ userEmailValidationId, userId, emailToken, verificationCodeHash }) {
    if (!userEmailValidationId) {
        throw new Error('userEmailValidationId is required for update');
    }

    const sql = await getUserDbConnection();
    const updates = [];

    if (userId !== undefined) {
        updates.push(sql`user_id = ${userId}`);
    }
    if (emailToken !== undefined) {
        updates.push(sql`email_token = ${emailToken}`);
    }
    if (verificationCodeHash !== undefined) {
        updates.push(sql`verification_code_hash = ${verificationCodeHash}`);
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    try {
        const setClause = updates.join(', ');

        const result = await sql`
            UPDATE user_email_validation
            SET ${sql.unsafe(setClause)}
            WHERE user_email_validation_id = ${userEmailValidationId}
            RETURNING ${sql.unsafe(emailTokenFields())}
        `;

        return { status: SUCCESS, emailTokens: dbResultToArray(result) };
    } catch (error) {
        throw new Error('Error in updateEmailToken', { cause: error });
    }
}

export async function getEmailToken({ userEmailValidationId, userId, emailToken }) {
    const sql = await getUserDbConnection();
    const conditions = buildWhereConditions(sql, { userEmailValidationId, userId, emailToken });

    if (conditions.length === 0) {
        throw new Error('At least one parameter (userEmailValidationId, userId, or emailToken) is required');
    }

    try {
        const result = await sql`
            SELECT ${sql.unsafe(emailTokenFields())}
            FROM user_email_validation et
            WHERE ${conditions}
            ORDER BY created DESC
        `;

        return { status: SUCCESS, emailTokens: dbResultToArray(result) };
    } catch (error) {
        throw new Error('Error in getEmailToken', { cause: error });
    }
}

export async function deleteEmailToken({ userEmailValidationId, userId, emailToken }) {
    const sql = await getUserDbConnection();
    const conditions = buildWhereConditions(sql, { userEmailValidationId, userId, emailToken });

    if (conditions.length === 0) {
        throw new Error('At least one parameter (userEmailValidationId, userId, or emailToken) is required');
    }

    try {
        const result = await sql`
            DELETE FROM user_email_validation
            WHERE ${conditions}
            RETURNING ${sql.unsafe(emailTokenFields())}
        `;

        return { status: DELETED, emailTokens: dbResultToArray(result) };
    } catch (error) {
        throw new Error('Error in deleteEmailToken', { cause: error });
    }
}

export async function getEmailTokenWithUser({ userEmailValidationId, userId, emailToken }) {
    const sql = await getUserDbConnection();
    const conditions = buildWhereConditions(sql, { userEmailValidationId, userId, emailToken });

    if (conditions.length === 0) {
        throw new Error('At least one parameter (userEmailValidationId, userId, or emailToken) is required');
    }

    try {
        const result = await sql`
            SELECT 
                ${sql.unsafe(emailTokenFields('et'))},
                u.username,
                u.email,
                u.email_validated AS "emailValidated"
            FROM user_email_validation et
            JOIN "user" u ON et.user_id = u.user_id
            WHERE ${conditions}
            ORDER BY et.created DESC
        `;

        return { status: SUCCESS, emailTokens: dbResultToArray(result) };
    } catch (error) {
        throw new Error('Error in getEmailTokenWithUser', { cause: error });
    }
}

export async function deleteExpiredEmailTokens(maxAgeHours = 24) {
    const sql = await getUserDbConnection();

    try {
        const result = await sql`
            DELETE FROM user_email_validation
            WHERE created < NOW() - INTERVAL '${maxAgeHours} hours'
            RETURNING ${sql.unsafe(emailTokenFields())}
        `;

        return { status: DELETED, emailTokens: dbResultToArray(result) };
    } catch (error) {
        throw new Error('Error in deleteExpiredEmailTokens', { cause: error });
    }
}

export async function getAllEmailTokensForUser(userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    const sql = await getUserDbConnection();

    try {
        const result = await sql`
            SELECT ${sql.unsafe(emailTokenFields())}
            FROM user_email_validation et
            WHERE user_id = ${userId}
            ORDER BY created DESC
        `;

        return { status: SUCCESS, emailTokens: dbResultToArray(result) };
    } catch (error) {
        throw new Error('Error in getAllEmailTokensForUser', { cause: error });
    }
}
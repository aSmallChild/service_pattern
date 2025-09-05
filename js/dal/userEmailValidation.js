import getUserDbConnection, { dbResultToArray, addCondition } from '../util/getUserDbConnection.js';
import { SUCCESS, CREATED, DELETED, INVALID } from '../util/result.js';
import UserEmailValidation from '../model/UserEmailValidation.js';

function emailTokenFields(alias = '') {
    alias = alias ? alias + '.' : '';
    return `
        ${alias}user_email_validation_id AS "userEmailValidationId",
        ${alias}user_id AS "userId",
        ${alias}email_token AS "emailToken",
        ${alias}created
    `.trim();
}

function buildWhereConditions(sql, { userEmailValidationId, userId, emailToken }) {
    const conditions = [];
    addCondition(sql, conditions, 'user_email_validation_id', userEmailValidationId);
    addCondition(sql, conditions, 'user_id', userId);
    addCondition(sql, conditions, 'email_token', emailToken);
    return conditions;
}

/**
 * @returns {Promise<{status: string, emailTokens?: (UserEmailValidation[])}>}
 */
export async function createEmailToken({ userId, emailToken }) {
    if (!userId || !emailToken) {
        return { status: INVALID };
    }

    const sql = await getUserDbConnection();

    try {
        const result = await sql`
            INSERT INTO user_email_validation (user_id, email_token)
            VALUES (${userId}, ${emailToken})
            RETURNING ${sql.unsafe(emailTokenFields())}
        `;
        return { status: CREATED, emailTokens: dbResultToArray(result, UserEmailValidation) };
    } catch (error) {
        throw new Error('Error in createEmailToken', { cause: error });
    }
}

/**
 * @returns {Promise<{status: string, emailTokens?: (UserEmailValidation[])}>}
 */
export async function getEmailToken({ userEmailValidationId, userId, emailToken }) {
    const sql = await getUserDbConnection();
    const conditions = buildWhereConditions(sql, { userEmailValidationId, userId, emailToken });

    if (!conditions.length) {
        return { status: INVALID };
    }

    try {
        const result = await sql`
            SELECT ${sql.unsafe(emailTokenFields())}
            FROM user_email_validation
            WHERE ${conditions}
            ORDER BY created DESC
        `;

        return { status: SUCCESS, emailTokens: dbResultToArray(result, UserEmailValidation) };
    } catch (error) {
        throw new Error('Error in getEmailToken', { cause: error });
    }
}

/**
 * @returns {Promise<{status: string, emailTokens?: (UserEmailValidation[])}>}
 */
export async function deleteEmailToken({ userEmailValidationId, userId, emailToken }) {
    const sql = await getUserDbConnection();
    const conditions = buildWhereConditions(sql, { userEmailValidationId, userId, emailToken });

    if (!conditions.length) {
        return { status: INVALID };
    }

    try {
        const result = await sql`
            DELETE FROM user_email_validation
            WHERE ${conditions}
            RETURNING ${sql.unsafe(emailTokenFields())}
        `;

        return { status: DELETED, emailTokens: dbResultToArray(result, UserEmailValidation) };
    } catch (error) {
        throw new Error('Error in deleteEmailToken', { cause: error });
    }
}

/**
 * @returns {Promise<{status: string, emailTokens: (UserEmailValidation[])}>}
 */
export async function deleteExpiredEmailTokens(maxAgeHours = 24) {
    const sql = await getUserDbConnection();

    try {
        const result = await sql`
            DELETE FROM user_email_validation
            WHERE created < NOW() - INTERVAL '${maxAgeHours} hours'
            RETURNING ${sql.unsafe(emailTokenFields())}
        `;

        return { status: DELETED, emailTokens: dbResultToArray(result, UserEmailValidation) };
    } catch (error) {
        throw new Error('Error in deleteExpiredEmailTokens', { cause: error });
    }
}

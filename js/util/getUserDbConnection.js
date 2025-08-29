import postgres from 'postgres';

let connectionPool;

const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'postgres',
    password: 'sample_password',
    max: 2,
    idle_timeout: 300,
    connect_timeout: 5,
};

export default function getUserDbConnection() {
    try {
        if (!connectionPool) {
            connectionPool = postgres(dbConfig);
        }
        return connectionPool;
    }
    catch (error) {
        console.error('Error getting database connection:', error);
        throw error;
    }
}

export async function closeDbPool() {
    if (connectionPool) {
        await connectionPool.end();
        connectionPool = null;
        console.info('Database connection pool closed');
    }
}


export function dbResultToArray(result) {
    return Array.from(result);
}
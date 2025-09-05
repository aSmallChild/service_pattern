import http from 'http';
import { URL } from 'url';
import { handler as registerUserHandler } from '../handler/registerUser.js';

const routes = new Map([
    ['POST /register', registerUserHandler],
]);

const server = http.createServer(async (req, res) => {
    const startTime = Date.now();
    const url = new URL(req.url, `http://${req.headers.host}`);

    console.info(`${req.method} ${url.pathname} - ${new Date().toISOString()}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    try {
        const handler = findMatchingRoute(req.method, url.pathname);

        if (!handler) {
            res.statusCode = 404;
            res.end(JSON.stringify({
                error: 'Route not found',
                method: req.method,
                path: url.pathname
            }));
            return;
        }

        const body = await getRequestBody(req);
        const event = createLambdaEvent(req, body);
        const context = createLambdaContext();

        console.info(`Calling handler for ${req.method} ${url.pathname}`);
        const result = await handler(event, context);

        res.statusCode = result.statusCode || 200;

        if (result.headers) {
            Object.entries(result.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
        }

        res.end(result.body || '');

        const duration = Date.now() - startTime;
        console.info(`${req.method} ${url.pathname} - ${result.statusCode} - ${duration}ms`);

    }
    catch (error) {
        console.error('Server error:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }));
    }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
    console.info(`Local webserver: http://${HOST}:${PORT}`);
    console.info('Registered routes:');
    routes.forEach((handler, route) => {
        console.info(`  ${route}`);
    });
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.error(`Try setting a different port: PORT=3001 node server.js`);
    }
    else {
        console.error('❌ Server error:', error);
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.info('Shutting down server...');
    server.close(() => {
        console.info('Server closed');
        process.exit(0);
    });
});

export default server;

function createLambdaEvent(req, body) {
    const url = new URL(req.url, `http://${req.headers.host}`);

    return {
        httpMethod: req.method,
        path: url.pathname,
        queryStringParameters: Object.fromEntries(url.searchParams) || null,
        headers: req.headers,
        body: body,
        requestContext: {
            requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            stage: 'local',
            httpMethod: req.method,
            path: url.pathname
        },
        isBase64Encoded: false
    };
}

function createLambdaContext() {
    return {
        callbackWaitsForEmptyEventLoop: true,
        functionName: 'local-dev',
        functionVersion: '$LATEST',
        invokedFunctionArn: 'arn:aws:lambda:local:123456789012:function:local-dev',
        memoryLimitInMB: 128,
        awsRequestId: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        logGroupName: '/aws/lambda/local-dev',
        logStreamName: `local-dev-${new Date().toISOString().split('T')[0]}`,
        getRemainingTimeInMillis: () => 30000,
        done: () => {
        },
        fail: () => {
        },
        succeed: () => {
        }
    };
}

function getRouteKey(method, pathname) {
    return `${method} ${pathname}`;
}

function findMatchingRoute(method, pathname) {
    const exactMatch = routes.get(getRouteKey(method, pathname));
    if (exactMatch) {
        return exactMatch;
    }

    for (const [routeKey, handler] of routes) {
        const [routeMethod, routePath] = routeKey.split(' ');
        if (routeMethod === method && routePath.includes(':')) {
            const routeParts = routePath.split('/');
            const pathParts = pathname.split('/');

            if (routeParts.length === pathParts.length) {
                const matches = routeParts.every((part, i) =>
                    part.startsWith(':') || part === pathParts[i]
                );
                if (matches) {
                    return handler;
                }
            }
        }
    }

    return null;
}

function getRequestBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            resolve(body || null);
        });
    });
}

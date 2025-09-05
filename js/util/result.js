export const INVALID = 'INVALID';
export const CONFLICT = 'CONFLICT';
export const CREATED = 'CREATED';
export const DELETED = 'DELETED';
export const SUCCESS = 'SUCCESS';
export const FAILED = 'FAILED';

export function toHttpStatus(result) {
    switch (result?.status ?? result) {
        case SUCCESS:
        case DELETED:
            return 200;
        case CREATED:
            return 201;
        case INVALID:
            return 400;
        case CONFLICT:
            return 409
        case FAILED:
            return 500
    }
    return null;
}

export function isSuccessful(result) {
    switch (result?.status ?? result) {
        case FAILED:
        case INVALID:
        case CONFLICT:
            return false;
    }
    return true;
}

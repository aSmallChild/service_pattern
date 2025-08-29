export const INVALID = 'INVALID';
export const CONFLICT = 'CONFLICT';
export const CREATED = 'CREATED';
export const DELETED = 'DELETED';
export const SUCCESS = 'SUCCESS';

export function toHttpStatus(result) {
    switch (result) {
        case INVALID:
            return 400;
        case CONFLICT:
            return 409
        case SUCCESS:
        case DELETED:
            return 200;
        case CREATED:
            return 201;
    }
    return null;
}

export function isSuccessful(result) {
    switch (result) {
        case INVALID:
        case CONFLICT:
            return false;
    }
    return true;
}

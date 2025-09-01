export default class UserEmailValidation {
    userEmailValidationId;
    userId;
    emailToken;
    created;

    constructor(data = {}) {
        Object.assign(this, data);
    }

    toString() {
        return `${this.constructor.name}(${this.userEmailValidationId}, ${this.userId}) `;
    }
}

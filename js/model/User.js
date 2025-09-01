export default class User {
    userId;
    username;
    email;
    passwordHash;

    constructor(data = {}) {
        Object.assign(this, data);
    }

    toString() {
        return `${this.constructor.name}(${this.userId}, ${this.username}, ${this.email})`;
    }

    toJSON() {
        const {
            passwordHash,
            ...rest
        } = this;

        return rest;
    }
}

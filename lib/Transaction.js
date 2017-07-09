const WithKnex = require('./WithKnex');

class Transaction extends WithKnex {
    constructor(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Transaction requires a callback');
        }

        super();

        this.callback = callback;
        this.knex = this.constructor.knex;
    }

    async execute() {
        return this.knex.transaction(async transaction => {
            return Promise.resolve(this.callback(transaction))
                .then(transaction.commit)
                .catch(transaction.rollback);
        });
    }

    async then(callback) {
        return this.execute().then(callback);
    }

    async catch(callback) {
        return this.execute().catch(callback);
    }
}

module.exports = Transaction;

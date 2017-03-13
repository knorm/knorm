const WithKnex = require('./lib/WithKnex');

class Transaction extends WithKnex {
    constructor(callback) {
        super();
        this.callback = callback;
    }

    async execute() {
        return this.constructor.knex.transaction(async transaction => {
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

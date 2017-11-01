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

  async then() {
    const promise = this.execute();
    return promise.then.apply(promise, arguments);
  }

  async catch() {
    const promise = this.execute();
    return promise.catch.apply(promise, arguments);
  }
}

module.exports = Transaction;

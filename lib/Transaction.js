const KnormError = require('./KnormError');

class Transaction {
  constructor(transaction) {
    if (typeof transaction !== 'function') {
      throw new KnormError('Transaction: no `transaction` function provided');
    }

    this.transaction = transaction;
  }

  async execute() {
    throw new KnormError(
      'Transaction: `Transaction.prototype.execute` is not implemented'
    );
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

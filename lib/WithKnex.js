const KnormError = require('./KnormError');
const KnexClient = require('knex/lib/client');

class WithKnex {
  static set knex(knex) {
    if (!knex) {
      throw new KnormError(`${this.name}: no knex instance provided`);
    }

    if (!knex || !knex.client || !(knex.client instanceof KnexClient)) {
      throw new KnormError(`${this.name}: invalid knex instance provided`);
    }

    this._knex = knex;
  }

  static get knex() {
    if (!this._knex) {
      throw new Error(`${this.name}.knex is not configured`);
    }
    return this._knex;
  }
}

module.exports = WithKnex;

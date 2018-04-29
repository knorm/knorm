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

    // TODO: strict mode: throw if a wrapIdentifier is already configured

    knex.client.config.wrapIdentifier = function(value, wrap, context) {
      // TODO: ideally, this would be `context instanceof Query` but that causes
      // a circular reference and anyway Query extends WithKnex
      if (context instanceof WithKnex) {
        return context.formatField(value, wrap);
      }
      return wrap(value);
    };

    this._knex = knex;
  }

  static get knex() {
    if (!this._knex) {
      throw new KnormError(`${this.name}.knex is not configured`);
    }
    return this._knex;
  }
}

module.exports = WithKnex;

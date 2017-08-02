class WithKnex {
  static set knex(knex) {
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

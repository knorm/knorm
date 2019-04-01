class Raw {
  constructor(sql) {
    if (typeof sql === 'string') {
      sql = { sql };
    }

    this.sql = sql.sql;
    this.values = sql.values || [];
  }
}

module.exports = Raw;

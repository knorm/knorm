const { Knorm } = require('@knorm/knorm');

class KnormPaginate {
  constructor({ name = 'paginate' } = {}) {
    this.name = name;
  }

  updateModel(knorm) {
    const { Model } = knorm;

    class PaginateModel extends Model {
      static async count(options) {
        return this.query.count(options);
      }
    }

    knorm.Model = PaginateModel;
  }

  updateQuery(knorm) {
    const { Query } = knorm;

    class PaginateQuery extends Query {
      async prepareCount(options) {
        this.setOptions(options);

        let fields = [];

        if (this.options.fields) {
          fields = fields.concat(Object.values(this.options.fields));
        }

        fields = fields.length
          ? fields.map(this.getColumn, this).join(', ')
          : '*';

        if (this.options.distinct) {
          fields = `DISTINCT ${fields}`;
        }

        const sql = this.sql
          .select(this.sql(`COUNT(${fields}) as ${this.quote('count')}`))
          .from(this.getTable());

        // disables checks for primary or unique fields when doing joins via
        // via @knorm/relations
        this.options.ensureUniqueField = false;

        return this.prepareSql(sql, { forCount: true });
      }

      // TODO: fetch via Query.prototype.fetch?
      async count(options) {
        const stack = this.options.debug ? new Error().stack : undefined;
        const sql = await this.prepareCount(options);
        const rows = await this.query(sql).catch(error => {
          throw this.formatError(
            new this.constructor.CountError({ error, query: this }),
            { stack, sql }
          );
        });

        const count = parseInt(rows[0].count);

        if (!count && this.options.require) {
          throw new this.constructor.NoRowsCountedError({ query: this });
        }

        return count;
      }
    }

    PaginateQuery.CountError = class CountError extends Query.QueryError {};
    PaginateQuery.NoRowsCountedError = class NoRowsCountedError extends Query.NoRowsError {};

    knorm.Query = knorm.Model.Query = PaginateQuery;
  }

  init(knorm) {
    if (!knorm) {
      throw new this.constructor.KnormPaginateError(
        'no Knorm instance provided'
      );
    }

    if (!(knorm instanceof Knorm)) {
      throw new this.constructor.KnormPaginateError(
        'invalid Knorm instance provided'
      );
    }

    this.updateModel(knorm);
    this.updateQuery(knorm);
  }
}

KnormPaginate.KnormPaginateError = class KnormPaginateError extends Knorm.KnormError {};

module.exports = KnormPaginate;

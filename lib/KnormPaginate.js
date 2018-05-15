const { Knorm, KnormError } = require('@knorm/knorm');

class KnormPaginateError extends KnormError {}

class KnormPaginate {
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

        if (this.options.distinct) {
          fields = fields.concat(Object.values(this.options.distinct));
        }

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

        return this.prepareSql(sql, { forCount: true });
      }

      async count(options) {
        const query = await this.prepareCount(options);

        let rows;
        try {
          rows = await this.query(query);
        } catch (error) {
          throw new this.constructor.CountError({ error, query: this });
        }

        const count = parseInt(rows[0].count);

        if (!count && this.options.require) {
          throw new this.constructor.NoRowsCountedError({ query: this });
        }

        return count;
      }
    }

    PaginateQuery.CountError = class CountError extends Query.QueryError {};
    PaginateQuery.NoRowsCountedError = class NoRowsCountedError extends Query.QueryError {};

    knorm.Query = knorm.Model.Query = PaginateQuery;
  }

  init(knorm) {
    if (!knorm) {
      throw new KnormPaginateError('no Knorm instance provided');
    }

    if (!(knorm instanceof Knorm)) {
      throw new KnormPaginateError('invalid Knorm instance provided');
    }

    this.updateModel(knorm);
    this.updateQuery(knorm);
  }
}

KnormPaginate.KnormPaginateError = KnormPaginateError;

module.exports = KnormPaginate;

const { Knorm, KnormError } = require('knorm');

class KnormSoftDelete {
  constructor(config = {}) {
    const { deleted = {}, deletedAt } = config;

    this.fields = {};
    this.deletedFieldName = deleted.name || 'deleted';
    this.fields[this.deletedFieldName] = {
      type: 'boolean',
      column: deleted.column || 'deleted',
      default: false
    };

    if (deletedAt) {
      this.deletedAtFieldName = deletedAt.name || 'deletedAt';
      this.fields[this.deletedAtFieldName] = {
        type: 'dateTime',
        column: deletedAt.column || 'deleted_at'
      };
    }
  }

  updateModel(knorm) {
    const { Model } = knorm;

    class ModelWithSoftDelete extends Model {
      async restore(options) {
        const row = await this.getQuery(options).restore();
        return row ? this.setData(row) : row;
      }

      async hardDelete(options) {
        const row = await this.getQuery(options).hardDelete();
        return row ? this.setData(row) : row;
      }

      static async restore(options) {
        return this.query.restore(options);
      }

      static async hardDelete(options) {
        return this.query.hardDelete(options);
      }
    }

    ModelWithSoftDelete.fields = this.fields;

    knorm.Model = ModelWithSoftDelete;
  }

  updateQuery(knorm) {
    const { Query, QueryError } = knorm;
    const deletedFieldName = this.deletedFieldName;
    const deletedAtFieldName = this.deletedAtFieldName;

    class NoRowsRestoredError extends QueryError {}
    class QueryWithSoftDelete extends Query {
      _prepareBuilder(...args) {
        const hasDeleted = ({ field }) => field.name === deletedFieldName;

        if (
          !this._withDeleted &&
          !this._onlyDeleted &&
          !this._where.some(hasDeleted) &&
          !this._whereNot.some(hasDeleted) &&
          !this._orWhere.some(hasDeleted) &&
          !this._orWhereNot.some(hasDeleted)
        ) {
          this._where.push({
            field: this.model.fields[deletedFieldName],
            value: false
          });
        }

        return super._prepareBuilder(...args);
      }

      withDeleted() {
        this._withDeleted = true;
        return this;
      }

      onlyDeleted() {
        this._onlyDeleted = true;
        return this.where({ [deletedFieldName]: true });
      }

      async delete(options) {
        const data = { [deletedFieldName]: true };

        if (deletedAtFieldName) {
          data[deletedAtFieldName] = new Date();
        }

        let deleted;
        try {
          deleted = await this.update(data, options);
        } catch (e) {
          if (e instanceof Query.errors.NoRowsUpdatedError) {
            throw new Query.errors.NoRowsDeletedError({ query: this });
          } else {
            throw e;
          }
        }

        return deleted;
      }

      async restore(options) {
        const data = { [deletedFieldName]: false };

        if (deletedAtFieldName) {
          data[deletedAtFieldName] = null;
        }

        this.onlyDeleted();

        let restored;
        try {
          restored = await this.update(data, options);
        } catch (e) {
          if (e instanceof Query.errors.NoRowsUpdatedError) {
            throw new NoRowsRestoredError({ query: this });
          } else {
            throw e;
          }
        }

        return restored;
      }

      async hardDelete(options) {
        this.withDeleted();
        return super.delete(options);
      }
    }

    QueryWithSoftDelete.errors = Object.assign(
      { NoRowsRestoredError },
      Query.errors
    );

    knorm.Model.Query = knorm.Query = QueryWithSoftDelete;
  }

  init(knorm) {
    if (!(knorm instanceof Knorm)) {
      throw new KnormError('KnormSoftDelete: invalid Knorm instance provided');
    }

    this.updateModel(knorm);
    this.updateQuery(knorm);
  }
}

module.exports = KnormSoftDelete;

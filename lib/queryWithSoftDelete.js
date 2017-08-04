const { Query: KnormQuery, QueryError: KnormQueryError } = require('knorm');

class NoRowsRestoredError extends KnormQueryError {}

module.exports = Base => {
  if (!(Base.prototype instanceof KnormQuery) && Base !== KnormQuery) {
    throw new Error('base class is not a knorm query class');
  }

  class QueryWithSoftDelete extends Base {
    _prepareBuilder(...args) {
      const deleted = this.model.fieldNames.deleted;
      const hasDeleted = ({ field }) => field.name === deleted;

      if (
        !this._where.some(hasDeleted) &&
        !this._whereNot.some(hasDeleted) &&
        !this._orWhere.some(hasDeleted) &&
        !this._orWhereNot.some(hasDeleted)
      ) {
        this._where.push({
          field: this.model.fields[deleted],
          value: false
        });
      }

      return super._prepareBuilder(...args);
    }

    withDeleted() {
      return this.where({ [this.model.fieldNames.deleted]: [true, false] });
    }

    onlyDeleted() {
      return this.where({ [this.model.fieldNames.deleted]: true });
    }

    async delete() {
      const data = {
        [this.model.fieldNames.deleted]: true
      };

      if (this.model.fieldNames.deletedAt) {
        data[this.model.fieldNames.deletedAt] = new Date();
      }

      let deleted;
      try {
        deleted = await this.update(data);
      } catch (e) {
        if (e instanceof KnormQuery.errors.NoRowsUpdatedError) {
          throw new KnormQuery.errors.NoRowsDeletedError(
            'no rows deleted',
            this
          );
        } else {
          throw e;
        }
      }

      return deleted;
    }

    async restore() {
      const data = {
        [this.model.fieldNames.deleted]: false
      };

      if (this.model.fieldNames.deletedAt) {
        data[this.model.fieldNames.deletedAt] = null;
      }

      let restored;
      try {
        restored = await this.where({ deleted: true }).update(data);
      } catch (e) {
        if (e instanceof KnormQuery.errors.NoRowsUpdatedError) {
          throw new NoRowsRestoredError('no rows restored', this);
        } else {
          throw e;
        }
      }

      return restored;
    }
  }

  QueryWithSoftDelete.errors = Object.assign(
    {
      NoRowsRestoredError
    },
    KnormQuery.errors
  );

  return QueryWithSoftDelete;
};

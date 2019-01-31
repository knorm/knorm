const { Knorm } = require('@knorm/knorm');

class KnormSoftDelete {
  constructor({ deleted = {}, deletedAt, name = 'soft-delete' } = {}) {
    this.name = name;

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

    class SoftDeleteModel extends Model {
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

    SoftDeleteModel.fields = this.fields;

    knorm.Model = SoftDeleteModel;
  }

  updateQuery(knorm) {
    const { Query } = knorm;
    const deletedFieldName = this.deletedFieldName;
    const deletedAtFieldName = this.deletedAtFieldName;

    class SoftDeleteQuery extends Query {
      constructor(model) {
        super(model);
        this.options.withDeleted = false;
        this.options.onlyDeleted = false;
      }

      isDeletedField(field) {
        return this.isField(field) && field === deletedFieldName;
      }

      hasWhereDeleted(where) {
        const [field] = where;

        if (this.isDeletedField(field)) {
          return true;
        }

        return where.some(field => {
          if (field instanceof this.sql) {
            return false;
          }

          if (typeof field === 'object') {
            return Object.entries(field).some(([field, value]) => {
              if (this.isWhere(field)) {
                return this.hasWhereDeleted(value);
              }

              return this.isDeletedField(field);
            });
          }

          return false;
        });
      }

      addWhereDeleted() {
        if (this.config.forInsert) {
          return;
        }

        if (this.options.withDeleted) {
          return;
        }

        if (this.options.onlyDeleted) {
          return this.where({ [deletedFieldName]: true });
        }

        const where = this.options.where;

        if (!where) {
          return this.where({ [deletedFieldName]: false });
        }

        if (!where.some(this.hasWhereDeleted, this)) {
          return this.where({ [deletedFieldName]: false });
        }
      }

      prepareSql(sql) {
        this.addWhereDeleted();
        return super.prepareSql(sql);
      }

      // TODO: support withDeleted: false
      withDeleted() {
        this.options.withDeleted = true;
        return this;
      }

      // TODO: support onlyDeleted: false
      onlyDeleted() {
        this.options.onlyDeleted = true;
        return this.where({ [deletedFieldName]: true });
      }

      async update(data, options) {
        if (data && deletedAtFieldName) {
          const deleted = data[deletedFieldName];
          if (deleted === false) {
            data[deletedAtFieldName] = null;
          } else if (deleted === true && !data[deletedAtFieldName]) {
            data[deletedAtFieldName] = new Date();
          }
        }
        return super.update(data, options);
      }

      async delete(options) {
        const data = { [deletedFieldName]: true };

        let deleted;
        try {
          deleted = await this.update(data, options);
        } catch (e) {
          if (e instanceof this.constructor.NoRowsUpdatedError) {
            throw new this.constructor.NoRowsDeletedError({ query: this });
          } else {
            throw e;
          }
        }

        return deleted;
      }

      async restore(options) {
        const data = { [deletedFieldName]: false };

        this.onlyDeleted();

        let restored;
        try {
          restored = await this.update(data, options);
        } catch (e) {
          if (e instanceof this.constructor.NoRowsUpdatedError) {
            throw new this.constructor.NoRowsRestoredError({ query: this });
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

    Query.NoRowsRestoredError = class NoRowsRestoredError extends Query.NoRowsError {};

    knorm.Model.Query = knorm.Query = SoftDeleteQuery;
  }

  init(knorm) {
    if (!knorm) {
      throw new this.constructor.KnormSoftDeleteError(
        'no Knorm instance provided'
      );
    }

    if (!(knorm instanceof Knorm)) {
      throw new this.constructor.KnormSoftDeleteError(
        'invalid Knorm instance provided'
      );
    }

    this.updateModel(knorm);
    this.updateQuery(knorm);
  }
}

KnormSoftDelete.KnormSoftDeleteError = class KnormSoftDeleteError extends Knorm.KnormError {};

module.exports = KnormSoftDelete;

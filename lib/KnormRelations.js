const { Knorm, KnormError } = require('@knorm/knorm');
// TODO: remove
const { camelCase } = require('lodash');

class KnormRelationsError extends KnormError {}

class KnormRelations {
  updateField(knorm) {
    const { Field } = knorm;

    class RelationsField extends Field {
      constructor(config = {}) {
        super(config);
        if (config.references) {
          this.references = config.references;
        }
      }

      static async count(options) {
        return this.query.count(options);
      }
    }

    knorm.Field = knorm.Model.Field = RelationsField;
  }

  updateModel(knorm) {
    const { Model } = knorm;

    class RelationsModel extends Model {
      static createConfig() {
        const config = super.createConfig();
        config.references = {};
        return config;
      }

      static addField(field) {
        super.addField(field);

        if (field.references) {
          const toField = field.references;
          const toModel = toField.model;
          const references = this._config.references;

          references[toModel.name] = references[toModel.name] || {};
          references[toModel.name][field.name] = field;
        }
      }

      static removeField(field) {
        super.removeField(field);

        const { name, references } = field;

        if (references) {
          const model = references.model.name;
          delete this._config.references[model][name];
          if (!Object.keys(this._config.references[model]).length) {
            delete this._config.references[model];
          }
        }
      }
    }

    knorm.Model = RelationsModel;
  }

  updateQuery(knorm) {
    const { Query } = knorm;

    class RelationsQuery extends Query {
      constructor(model) {
        super(model);
        this.parsedRows = {};
        this.config.references = model.config.references;
      }

      addJoin(type, joins, options) {
        if (!Array.isArray(joins)) {
          joins = [joins];
        }

        this.options.joins = this.options.joins || [];

        joins.forEach(join => {
          if (join.prototype instanceof this.constructor.Model) {
            join = join.query;
          }

          // TODO: strict mode: throw if join is not a `Query` instance

          const forwardReferences = join.config.references[this.model.name];
          const reverseReferences = this.config.references[join.model.name];

          if (!forwardReferences && !reverseReferences) {
            throw new Error(
              `'${this.model.name}' has no references to '${join.model.name}'`
            );
          }

          join.config.joinType = type;
          join.config.forwardReferences = forwardReferences;
          join.config.reverseReferences = reverseReferences;

          join.setOptions(options);

          this.options.joins.push(join);
        });

        return this;
      }

      leftJoin(queries, options) {
        return this.addJoin('leftJoin', queries, options);
      }

      innerJoin(queries, options) {
        return this.addJoin('innerJoin', queries, options);
      }

      // TODO: require setting `as` when configuring references
      as(as) {
        this.options.as = as;
        return this;
      }

      on(...fields) {
        this.options.on = this.options.on || [];
        this.options.on.push(...fields);
        return this;
      }

      async prepareJoin(query, options) {
        let references = [];
        const isForwardReference = !!this.config.forwardReferences;

        if (this.options.on) {
          if (isForwardReference) {
            this.options.on.forEach(field =>
              references.push(this.config.forwardReferences[field])
            );
          } else {
            const referencesByTo = Object.values(
              this.config.reverseReferences
            ).reduce((references, from) => {
              const to = from.references.name;
              references[to] = references[to] || [];
              references[to].push(from);
              return references;
            }, {});
            this.options.on.forEach(field =>
              references.push(...referencesByTo[field])
            );
          }
        } else {
          references = Object.values(
            this.config.forwardReferences || this.config.reverseReferences
          );
        }

        const on = references.reduce((columns, field) => {
          const fromColumn = field.column;
          const toColumn = field.references.column;
          let from;
          let to;

          if (isForwardReference) {
            from = `${this.quote(this.config.alias)}.${this.quote(fromColumn)}`;
            to = `${this.quote(this.parent.config.alias)}.${this.quote(
              toColumn
            )}`;
          } else {
            from = `${this.quote(this.config.alias)}.${this.quote(toColumn)}`;
            to = `${this.quote(this.parent.config.alias)}.${this.quote(
              fromColumn
            )}`;
          }

          columns[from] = to;

          return columns;
        }, {});

        const method = this.config.joinType || 'leftJoin';
        query[method](this.getTable(), on);

        this.ensureFields();

        return this.prepareQuery(query, options);
      }

      ensureUniqueField(to) {
        const aliases = Object.keys(this.options.fields);
        const fields = Object.values(this.options.fields);
        let unique;

        [this.config.primary].concat(this.config.unique).some(field => {
          const index = fields.indexOf(field);
          if (index > -1) {
            unique = aliases[index];
            return true;
          }
          return false;
        });

        if (!unique) {
          // TODO: throw a QueryError instead of a KnormRelationsError
          throw new KnormRelationsError(
            `${this.model.name}: cannot join ${
              to.model.name
            } with no primary or unique fields selected`
          );
        }

        this.options.unique = unique;
      }

      async prepareJoins(query, options) {
        return Promise.all(
          this.options.joins.map(async join => {
            this.ensureUniqueField(join);

            join.parent = this;
            join.config.index = ++this.config.index;
            join.config.alias = `${join.config.alias}_${join.config.index}`;

            // TODO: remove
            if (!join.options.as) {
              join.options.as = camelCase(join.model.name);
            }

            return join.prepareJoin(query, options);
          })
        );
      }

      async prepareQuery(query, options) {
        query = await super.prepareQuery(query, options);

        if (this.options.joins) {
          await this.prepareJoins(query, options);
        }

        return query;
      }

      throwFetchRequireError() {
        super.throwFetchRequireError();

        if (this.options.joins) {
          this.options.joins.forEach(query => query.throwFetchRequireError());
        }
      }

      // TODO: strict mode: throw if the value for the unique field is null or undefined
      getParsedRow(row) {
        let parsedRow = super.getParsedRow(row);

        if (!this.options.joins) {
          return parsedRow;
        }

        const unique = row[this.formatAlias(this.options.unique)];

        if (unique) {
          if (this.parsedRows[unique]) {
            parsedRow = this.parsedRows[unique];
          } else {
            this.parsedRows[unique] = parsedRow;
          }
        }

        return parsedRow;
      }

      parseJoin(row, parsedRow, options) {
        const as = this.options.as;

        if (this.options.first && parsedRow[as] !== undefined) {
          return;
        }

        const data = this.parseRow(
          row,
          Object.assign({ isNested: true }, options)
        );

        if (this.options.first) {
          parsedRow[as] = data;
        } else {
          if (data) {
            parsedRow[as] = parsedRow[as] || [];
            parsedRow[as].push(data);
          } else if (!parsedRow[as]) {
            parsedRow[as] = data;
          }
        }
      }

      parseRow(row, options) {
        let allFieldsNull = true;
        const handleRowValue = ({ value }) => {
          if (value !== null && allFieldsNull) {
            allFieldsNull = false;
          }
        };

        const superOptions = options.isNested
          ? Object.assign({ handleRowValue }, options)
          : options;

        const parsedRow = super.parseRow(row, superOptions);

        if (this.options.joins) {
          this.options.joins.forEach(join => {
            join.parseJoin(row, parsedRow, options);
          });
        }

        if (options.isNested && allFieldsNull) {
          return null;
        }

        return parsedRow;
      }

      parseRows(rows, options) {
        const parsedRows = super.parseRows(rows, options);

        if (this.options.joins) {
          return Object.values(this.parsedRows);
        }

        return parsedRows;
      }
    }

    RelationsQuery.prototype.join = RelationsQuery.prototype.innerJoin;

    RelationsQuery.CountError = class CountError extends Query.QueryError {};
    RelationsQuery.NoRowsCountedError = class NoRowsCountedError extends Query.QueryError {};

    knorm.Query = knorm.Model.Query = RelationsQuery;
  }

  init(knorm) {
    if (!knorm) {
      throw new KnormRelationsError('no Knorm instance provided');
    }

    if (!(knorm instanceof Knorm)) {
      throw new KnormRelationsError('invalid Knorm instance provided');
    }

    this.updateField(knorm);
    this.updateModel(knorm);
    this.updateQuery(knorm);
  }
}

KnormRelations.KnormRelationsError = KnormRelationsError;

module.exports = KnormRelations;

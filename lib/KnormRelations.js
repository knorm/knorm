const { Knorm } = require('@knorm/knorm');
const { camelCase } = require('lodash');

const addReference = (references, field, reference) => {
  const toModel = reference.model;
  references[toModel.name] = references[toModel.name] || {};
  references[toModel.name][field.name] = field;
};

const addReferenceByFunction = (references, func, { name, column }) => {
  const reference = func();
  // add a pseudo-field to avoid having to overwrite field.references
  const field = { name, column, references: reference };
  addReference(references, field, reference);
};

const mapReferencesByTo = references =>
  Object.values(references).reduce((referencesByTo, from) => {
    const to = from.references.name;
    referencesByTo[to] = referencesByTo[to] || [];
    referencesByTo[to].push(from);
    return referencesByTo;
  }, {});

class KnormRelations {
  constructor({ name = 'relations' } = {}) {
    this.name = name;
  }

  updateField(knorm) {
    const { Field } = knorm;

    class RelationsField extends Field {
      constructor(config = {}) {
        super(config);
        if (config.references) {
          this.references = config.references;
        }
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
        config.referenceFunctions = {};
        return config;
      }

      static addField(field) {
        super.addField(field);

        if (field.references) {
          const toField = field.references;

          if (typeof toField === 'function') {
            this._config.referenceFunctions[field.name] = toField;
          } else {
            addReference(this._config.references, field, toField);
          }
        }
      }

      static removeField(field) {
        super.removeField(field);

        const { name, references } = field;

        if (references) {
          if (typeof references === 'function') {
            delete this._config.referenceFunctions[name];
          } else {
            const model = references.model.name;
            delete this._config.references[model][name];
            if (!Object.keys(this._config.references[model]).length) {
              delete this._config.references[model];
            }
          }
        }
      }
    }

    knorm.Model = RelationsModel;
  }

  updateQuery(knorm) {
    const { Query, Model, Field } = knorm;

    class RelationsQuery extends Query {
      constructor(model) {
        super(model);
        this.parsedRows = {};
        this.options.ensureUniqueField = true;
        this.config.references = model.config.references;
        this.config.referenceFunctions = model.config.referenceFunctions;
      }

      addJoin(type, joins, options) {
        if (!Array.isArray(joins)) {
          joins = [joins];
        }

        this.options.joins = this.options.joins || [];

        joins.forEach(join => {
          if (join.prototype instanceof Model) {
            join = join.query;
          }

          const joinReferences = Object.assign({}, join.config.references);
          const thisReferences = Object.assign({}, this.config.references);

          Object.entries(join.config.referenceFunctions).forEach(
            ([fieldName, referenceFunction]) => {
              const field = join.config.fields[fieldName];
              addReferenceByFunction(joinReferences, referenceFunction, field);
            }
          );

          Object.entries(this.config.referenceFunctions).forEach(
            ([fieldName, referenceFunction]) => {
              const field = this.config.fields[fieldName];
              addReferenceByFunction(thisReferences, referenceFunction, field);
            }
          );

          const forwardReferences = joinReferences[this.model.name];
          const reverseReferences = thisReferences[join.model.name];

          if (forwardReferences) {
            join.config.isForwardReference = true;
            join.config.forwardReferences = forwardReferences;
            join.config.forwardReferencesByTo = mapReferencesByTo(
              forwardReferences
            );
          } else if (reverseReferences) {
            join.config.reverseReferences = reverseReferences;
            join.config.reverseReferencesByTo = mapReferencesByTo(
              reverseReferences
            );
          } else {
            throw new Query.QueryError(
              `${this.model.name}: there are no references to \`${
                join.model.name
              }\``
            );
          }

          join.options.join = type;
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
        return this.setOption('as', as);
      }

      // TODO: support multiple fields for `on`
      on(field) {
        return this.addOption('on', field);
      }

      // TODO: strict mode: throw an error if the field is from a model that is
      // not used in the join
      prepareOn() {
        let references = [];

        if (this.options.on) {
          if (this.config.isForwardReference) {
            this.options.on.forEach(field => {
              if (field instanceof Field) {
                if (field.model === this.parent.model) {
                  // treated as a reverse reference
                  return references.push(
                    ...this.config.forwardReferencesByTo[field.name]
                  );
                }
                field = field.name;
              }
              references.push(this.config.forwardReferences[field]);
            });
          } else {
            this.options.on.forEach(field => {
              if (field instanceof Field) {
                if (field.model === this.parent.model) {
                  // treated as a forward reference
                  return references.push(
                    this.config.reverseReferences[field.name]
                  );
                }
                field = field.name;
              }
              references.push(...this.config.reverseReferencesByTo[field]);
            });
          }
        } else {
          references = Object.values(
            this.config.forwardReferences || this.config.reverseReferences
          );
        }

        return references.reduce((columns, field) => {
          const fromColumn = field.column;
          const toColumn = field.references.column;
          let from;
          let to;

          if (this.config.isForwardReference) {
            // TODO: Query.prototype.formatColumn
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
      }

      async prepareJoin(sql, options) {
        const method = this.options.join || 'leftJoin';
        sql[method](this.getTable(), this.prepareOn());

        this.ensureFields();
        return this.prepareSql(sql, options);
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
          throw new Query.QueryError(
            `${this.model.name}: cannot join \`${
              to.model.name
            }\` with no primary or unique fields selected`
          );
        }

        this.options.unique = unique;
      }

      async prepareJoins(query, options) {
        return Promise.all(
          this.options.joins.map(async join => {
            // depended on by @knorm/paginate
            if (this.options.ensureUniqueField) {
              this.ensureUniqueField(join);
            }

            join.parent = this;
            // depended on by @knorm/postgres
            join.config.joined = true;
            join.config.index = ++this.config.index;
            // TODO: support custom aliases
            join.config.alias = `${join.config.alias}_${join.config.index}`;

            // TODO: remove
            if (!join.options.as) {
              join.options.as = camelCase(join.model.name);
            }

            return join.prepareJoin(query, options);
          })
        );
      }

      async prepareSql(sql, options) {
        sql = await super.prepareSql(sql, options);

        if (this.options.joins) {
          await this.prepareJoins(sql, options);
        }

        return sql;
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

      parseRow(row) {
        const parsedRow = super.parseRow(row);

        if (this.options.joins) {
          this.options.joins.forEach(join => {
            const as = join.options.as;
            const first = join.options.first;

            if (first && parsedRow[as] !== undefined) {
              return;
            }

            const data = join.parseRow(row);
            // the performance of this check could be improved by checking row
            // values while parsing the row but at a cost of code complexity
            const isEmpty = Object.values(data).every(value => value === null);

            if (isEmpty) {
              // TODO: test this next `if`
              if (!parsedRow[as]) {
                parsedRow[as] = null;
              }
            } else if (first) {
              parsedRow[as] = data;
            } else {
              parsedRow[as] = parsedRow[as] || [];
              parsedRow[as].push(data);
            }
          });
        }

        return parsedRow;
      }

      parseRows(rows) {
        const parsedRows = super.parseRows(rows);

        if (this.options.joins) {
          return Object.values(this.parsedRows);
        }

        return parsedRows;
      }
    }

    RelationsQuery.prototype.join = RelationsQuery.prototype.innerJoin;

    knorm.Query = knorm.Model.Query = RelationsQuery;
  }

  init(knorm) {
    if (!knorm) {
      throw new this.constructor.KnormRelationsError(
        'no Knorm instance provided'
      );
    }

    if (!(knorm instanceof Knorm)) {
      throw new this.constructor.KnormRelationsError(
        'invalid Knorm instance provided'
      );
    }

    this.updateModel(knorm);
    this.updateField(knorm);
    this.updateQuery(knorm);
  }
}

KnormRelations.KnormRelationsError = class KnormRelationsError extends Knorm.KnormError {};

module.exports = KnormRelations;

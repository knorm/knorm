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

const mapReferencesByReferencedField = references =>
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
        // TODO: only initialize parsedRows when needed
        this.parsedRows = new Map();
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

          if (
            !thisReferences[join.model.name] &&
            !joinReferences[this.model.name]
          ) {
            throw new Query.QueryError(
              `${this.model.name}: there are no references to \`${
                join.model.name
              }\``
            );
          }

          const mergedReferences = Object.assign(
            {},
            thisReferences[join.model.name],
            joinReferences[this.model.name]
          );
          const mergedReferencesReversed = mapReferencesByReferencedField(
            mergedReferences
          );

          join.config.isReverseJoin = !!thisReferences[join.model.name];
          join.config.mergedReferences = mergedReferences;
          join.config.mergedReferencesReversed = mergedReferencesReversed;

          join.options.joinType = type;
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

      prepareOn() {
        let references = [];

        if (this.options.on) {
          this.options.on.forEach(field => {
            if (field instanceof Field) {
              if (field.model === this.parent.model) {
                if (this.config.mergedReferences[field.name]) {
                  references.push(this.config.mergedReferences[field.name]);
                } else {
                  references.push(
                    ...this.config.mergedReferencesReversed[field.name]
                  );
                }
                return;
              }
              // TODO: strict mode: throw an error if the field is from a model
              // that is not used in the join
              field = field.name;
            }

            if (this.config.mergedReferencesReversed[field]) {
              references.push(...this.config.mergedReferencesReversed[field]);
            } else {
              references.push(this.config.mergedReferences[field]);
            }
          });
        } else {
          references = Object.values(this.config.mergedReferences);
        }

        return references.reduce((columns, field) => {
          const fromColumn = field.column;
          const toColumn = field.references.column;
          let from;
          let to;

          if (this.config.isReverseJoin) {
            from = this.formatColumn(toColumn);
            to = this.parent.formatColumn(fromColumn);
          } else {
            from = this.formatColumn(fromColumn);
            to = this.parent.formatColumn(toColumn);
          }

          columns[from] = to;

          return columns;
        }, {});
      }

      // TODO: do not rely on `getTable` auto-aliasing (@knorm/knorm v2)
      async prepareJoin(sql, options) {
        const method = this.options.joinType || 'leftJoin';
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

        const unique =
          row[this.formatFieldAlias(this.options.unique, { quote: false })];

        if (unique) {
          const uniqueRow = this.parsedRows.get(unique);
          if (uniqueRow) {
            parsedRow = uniqueRow;
          } else {
            this.parsedRows.set(unique, parsedRow);
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

            const data = join.parseRow(row);
            // the performance of this check could be improved by checking row
            // values while parsing the row but at a cost to code complexity
            const isEmpty = Object.values(data).every(value => value === null);

            // TODO: strict mode: warn if joined data replaces already existing
            // fields on the row
            if (isEmpty) {
              parsedRow[as] = null;
            } else if (first) {
              parsedRow[as] = data;
            } else {
              if (!Array.isArray(parsedRow[as])) {
                parsedRow[as] = [];
              }
              parsedRow[as].push(data);
            }
          });
        }

        return parsedRow;
      }

      parseRows(rows) {
        const parsedRows = super.parseRows(rows);

        if (this.options.joins) {
          return Array.from(this.parsedRows.values());
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

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
      static getConfig() {
        const config = super.getConfig();
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

      addJoin(type, queries, options) {
        if (!Array.isArray(queries)) {
          queries = [queries];
        }

        this.options.joins = this.options.joins || [];

        queries.forEach(query => {
          if (query.prototype instanceof this.constructor.Model) {
            query = query.query;
          }

          const forwardReferences = query.config.references[this.model.name];
          const reverseReferences = this.config.references[query.model.name];

          if (!forwardReferences && !reverseReferences) {
            throw new Error(
              `'${this.model.name}' has no references to '${query.model.name}'`
            );
          }

          query.parent = this;
          query.config.joinType = type;
          query.config.forwardReferences = forwardReferences;
          query.config.reverseReferences = reverseReferences;

          query.setOptions(options);

          this.options.joins.push(query);
        });

        return this;
      }

      leftJoin(queries, options) {
        return this.addJoin('leftJoin', queries, options);
      }

      innerJoin(queries, options) {
        return this.addJoin('innerJoin', queries, options);
      }

      join(...args) {
        return this.innerJoin(...args);
      }

      // TODO: require setting `as` when configuring references
      as(as) {
        this.options.as = as;
        return this;
      }

      // TODO: this doesn't support a formatted field nor does it support columns
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

      async prepareJoins(query, options) {
        return Promise.all(
          this.options.joins.map(async join => {
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

      parseRow(row, options) {
        const { isNested } = options;
        let allFieldsNull = true;

        const parsedRow = super.parseRow(
          row,
          Object.assign(
            {
              parseRowValue: ({ parsedRow, field, value }) => {
                if (
                  this.options.joins &&
                  field === this.config.primary &&
                  value
                ) {
                  if (this.parsedRows[value]) {
                    parsedRow = this.parsedRows[value];
                  } else {
                    this.parsedRows[value] = parsedRow;
                  }
                }

                if (isNested && value !== null && allFieldsNull) {
                  allFieldsNull = false;
                }

                return parsedRow;
              }
            },
            options
          )
        );

        if (this.options.joins) {
          this.options.joins.forEach(join => {
            const as = join.options.as;

            if (join.options.first && parsedRow[as] !== undefined) {
              return;
            }

            const data = join.parseRow(
              row,
              Object.assign({ isNested: true }, options)
            );

            if (join.options.first) {
              parsedRow[as] = data;
            } else {
              if (data) {
                parsedRow[as] = parsedRow[as] || [];
                parsedRow[as].push(data);
              } else if (!parsedRow[as]) {
                parsedRow[as] = data;
              }
            }
          });
        }

        if (isNested && allFieldsNull) {
          return null;
        }

        return parsedRow;
      }

      parseRows(rows, options) {
        rows = super.parseRows(rows, options);

        if (this.options.joins) {
          const parsedRows = Object.values(this.parsedRows);
          // this is needed for `distinct` without an `id` column
          if (parsedRows.length) {
            rows = parsedRows;
          }
        }

        return rows;
      }
    }

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

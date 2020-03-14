const Model = require('../../lib/Model');
const Query = require('../../lib/Query');
const QueryOptions = require('../../lib/QueryOptions');
const Sql = require('../../lib/Sql');

module.exports = {
  name: 'unexpected-knorm',
  installInto: expect => {
    expect.addType({
      name: 'ModelClass',
      base: 'object',
      identify: value => value && value.prototype instanceof Model,
      inspect: (value, depth, output) => {
        output.jsFunctionName(value.name);
      }
    });

    expect.addType({
      name: 'Model',
      base: 'object',
      identify: value => value instanceof Model,
      inspect: (value, depth, output, inspect) => {
        output
          .jsFunctionName(value.constructor.name)
          .append(inspect(value.getValues()));
      }
    });

    expect.addType({
      name: 'Query',
      base: 'object',
      identify: value => value instanceof Query,
      inspect: (value, depth, output, inspect) => {
        output
          .jsFunctionName(value.constructor.name)
          .text('(')
          .jsFunctionName(value.Model.name)
          .text(') ')
          .append(inspect(value.getOptions()));
      },
      equal: (a, b, equal) => {
        return equal(a.Model, b.Model) && equal(a.getOptions(), b.getOptions());
      }
    });

    expect.addType({
      name: 'QueryOptions',
      base: 'object',
      identify: value => value instanceof QueryOptions,
      inspect: (value, depth, output, inspect) => {
        output
          .jsFunctionName(value.constructor.name)
          .text('(')
          .jsFunctionName(value.Model.name)
          .text(') ')
          .append(inspect(value.getOptions()));
      }
    });

    expect.addType({
      name: 'Sql',
      base: 'object',
      identify: value => value instanceof Sql,
      inspect: (value, depth, output, inspect) => {
        output
          .jsFunctionName(value.constructor.name)
          .text('(')
          .jsFunctionName(value.Model.name)
          .text(') ')
          .append(inspect(value.getValue()));
      }
    });

    expect.addAssertion(
      '<QueryOptions> to [exhaustively] satisfy <object>',
      (expect, queryOptions, value) => {
        return expect(
          queryOptions.getValues(),
          'to [exhaustively] satisfy',
          value
        );
      }
    );

    expect.addAssertion(
      '<QueryOptions> to equal <QueryOptions>',
      (expect, subject, value) => {
        return expect(subject.getValues(), 'to equal', value.getValues());
      }
    );

    const formatQueryOptions = queryOptions => {
      const sql = queryOptions.Model.sql;
      const parts = sql.createParts(queryOptions);
      const select = sql.select(parts);
      return select.format();
    };

    const trimExtraWhitespace = string =>
      string
        .replace(/\s+/g, ' ')
        .replace(/\( /g, '(')
        .replace(/ \)/g, ')')
        .trim();

    expect.addAssertion(
      '<QueryOptions> to be formatted as <string>',
      (expect, queryOptions, sqlText) => {
        return expect(
          formatQueryOptions(queryOptions).text,
          'to be',
          trimExtraWhitespace(sqlText)
        );
      }
    );

    expect.addAssertion(
      '<QueryOptions> to be formatted as <object>',
      (expect, queryOptions, sql) => {
        sql = { ...sql, text: trimExtraWhitespace(sql.text) };
        expect.argsOutput = output => output.appendInspected(sql);
        return expect(formatQueryOptions(queryOptions), 'to equal', sql);
      }
    );

    expect.addAssertion(
      '<Sql> to be formatted as <string>',
      (expect, sql, text) => {
        text = trimExtraWhitespace(text);
        expect.argsOutput = output => output.appendInspected(text);
        return expect(sql.getText(), 'to be', text);
      }
    );

    expect.addAssertion(
      '<Sql> to be formatted as <object>',
      (expect, sql, formatted) => {
        formatted = { ...formatted, text: trimExtraWhitespace(formatted.text) };
        expect.argsOutput = output => output.appendInspected(formatted);
        return expect(sql.format(), 'to equal', formatted);
      }
    );
  }
};

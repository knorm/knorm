const { resolve } = require('path');
const { readdirSync } = require('fs');

const loadParts = ({ except = [] } = {}) => {
  const partsDir = resolve(__dirname, '../../../lib/Sql');

  except.push('SqlError.js');

  return readdirSync(partsDir)
    .filter(filename => !except.includes(filename))
    .map(filename => require(resolve(partsDir, filename)));
};

module.exports = loadParts;

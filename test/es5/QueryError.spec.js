const proxyquire = require('proxyquire');

proxyquire('../QueryError.spec', {
    '../lib/QueryError': require('../../es5/QueryError')
});

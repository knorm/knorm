const proxyquire = require('proxyquire');

proxyquire('../createError.spec', {
    '../lib/createError': require('../../es5/createError')
});

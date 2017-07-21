const proxyquire = require('proxyquire');

proxyquire('../KnormError.spec', {
    '../lib/KnormError': require('../../es5/KnormError')
});

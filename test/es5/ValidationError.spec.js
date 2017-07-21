const proxyquire = require('proxyquire');

proxyquire('../ValidationError.spec', {
    '../lib/ValidationError': require('../../es5/ValidationError')
});

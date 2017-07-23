const proxyquire = require('proxyquire');

proxyquire('../Virtual.spec', {
    '../lib/Virtual': require('../../es5/Virtual'),
    '../lib/Model': require('../../es5/Model')
});

const proxyquire = require('proxyquire');

proxyquire('../Transaction.spec', {
    '../lib/Transaction': require('../../es5/Transaction')
});

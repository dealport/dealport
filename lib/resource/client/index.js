'use strict';

module.exports = function(primus)
{
        return {
                Company: new (require('./Company'))(primus),
                CompanySubmit: new (require('./CompanySubmit'))(primus)
        };
};

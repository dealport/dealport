'use strict';

module.exports = function(primus, model)
{
        // primus argument is null if the Resource is constructed for use in server side controllers

        if (!model)
        {
                throw Error('Missing argument model');
        }

        return {
                Company: new (require('./Company'))(primus, model),
                CompanySubmit: new (require('./CompanySubmit'))(primus, model)
        };
};

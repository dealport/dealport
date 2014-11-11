'use strict';

module.exports = function(primus, model, config, user)
{
        // primus argument is null if the Resource is constructed for use in server side controllers

        if (!model)
        {
                throw Error('Missing argument model');
        }

        return {
                Company: new (require('./Company'))(primus, model, config, user),
                CompanySubmit: new (require('./CompanySubmit'))(primus, model, config, user),
                User: new (require('./User'))(primus, model, config, user),
        };
};

'use strict';

module.exports = function(primus, model)
{
        // primus argument is null if the Resource is constructed for use in server side controllers

        if (!model)
        {
                throw Error('Missing argument model');
        }

        return {
                // Something: new (require('./Something.js'))(primus, model)
        };
};

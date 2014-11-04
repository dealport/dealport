'use strict';
var P = require('bluebird');
var Resource = require('../Resource');

function Company(primus, model)
{
        Resource.call(this, primus, 'Company');
        this.model = model;

        this.listen(['all']);
}

require('inherits')(Company, Resource);
module.exports = Company;

Company.prototype.all = function()
{
        var model = this.model;
        return model.acquire()
                .then(function(client)
                {
                        var company = client.collection('company');

                        return P.promisifyAll(company.find({}))
                                .toArrayAsync()
                                .finally(model.releaseHandler(client));
                });
};

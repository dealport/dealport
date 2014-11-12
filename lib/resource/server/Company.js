'use strict';
var P = require('bluebird');
var Resource = require('../Resource');

function Company(primus, model, config, user)
{
        Resource.call(this, primus, 'Company');
        this.model = model;
        this.user = user;

        this.listen(['all']);
}

require('inherits')(Company, Resource);
module.exports = Company;

Company.prototype.all = function()
{
        var model = this.model;
        var user = this.user;

        return P.join(
                model.acquire().then(function(client)
                {
                        var company = client.collection('company');

                        return P.promisifyAll(company.find({}))
                                .toArrayAsync()
                                .finally(model.releaseHandler(client));
                }),
                model.acquire().then(function(client)
                {
                        var company = client.collection('companyLocal');

                        return P.promisifyAll(company.find({}))
                                .toArrayAsync()
                                .finally(model.releaseHandler(client));
                })
        ).then(function(results)
        {
                var companies = results[0];
                var companyLocalsArray = results[1];
                var companyLocals = {};

                companyLocalsArray.forEach(function(companyLocal)
                {
                        companyLocals[companyLocal._id] = companyLocal;
                });

                companies.forEach(function(company)
                {
                        company.local = companyLocals[company._id];

                        if (user &&
                            company.local.private &&
                            company.local.private.editableByUser)
                        {
                                company.local.editableByCurrentUser = false;

                                company.local.private.editableByUser.forEach(function(userId)
                                {
                                        if (user._id.equals(userId))
                                        {
                                                company.local.editableByCurrentUser = true;
                                        }
                                });
                        }

                        // server side use only
                        delete company.local.private;
                });

                return companies;
        });
};

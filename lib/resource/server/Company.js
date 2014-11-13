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
                        var company = client.collection('companyImport');

                        return P.promisifyAll(company.find({}))
                                .toArrayAsync()
                                .finally(model.releaseHandler(client));
                })
        ).then(function(results)
        {
                var companies = results[0];
                var companyImports = results[1];
                var companyImportsByID = {};

                companyImports.forEach(function(companyImport)
                {
                        companyImportsByID[companyImport._id] = companyImport;
                });

                companies.forEach(function(company)
                {
                        var companyImport = companyImportsByID[company.companyImportID] || {};
                        var companyImportKeys = Object.keys(companyImport);

                        companyImportKeys.forEach(function(key)
                        {
                                // never copy over these keys
                                if (key === '_id' ||
                                    key === 'private')
                                {
                                        return;
                                }

                                // Use the value from "companyImport" unless
                                // it has been overriden in our "company"
                                if (company[key] === undefined)
                                {
                                        company[key] = companyImport[key];
                                }
                        });

                        if (user &&
                            company.private &&
                            company.private.editableByUser)
                        {
                                company.editableByCurrentUser = false;

                                company.private.editableByUser.forEach(function(userId)
                                {
                                        if (user._id.equals(userId))
                                        {
                                                company.editableByCurrentUser = true;
                                        }
                                });
                        }

                        // This value is only for server side use
                        // Do not expose it to the client
                        delete company.private;
                });

                return companies;
        });
};

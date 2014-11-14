'use strict';
var P = require('bluebird');
var Resource = require('../Resource');

function Company(primus, model, config, user)
{
        Resource.call(this, primus, 'Company');
        this.model = model;
        this.user = user;

        this.listen(['all', 'updateCompany']);
}

require('inherits')(Company, Resource);
module.exports = Company;

Company.prototype._isCompanyEditableByCurrentUser = function(company)
{
        var ret = false;

        if (this.user &&
            company.private &&
            company.private.editableByUser)
        {
                company.private.editableByUser.forEach(function(userId)
                {
                        if (this.user._id.equals(userId))
                        {
                                ret = true;
                        }
                }, this);
        }

        return ret;
};

Company.prototype.all = function()
{
        var model = this.model;

        return P.join(
                model.acquire().bind(this).then(function(client)
                {
                        var company = client.collection('company');

                        return P.promisifyAll(company.find({}))
                                .toArrayAsync()
                                .finally(model.releaseHandler(client));
                }),
                model.acquire().bind(this).then(function(client)
                {
                        var company = client.collection('companyImport');

                        return P.promisifyAll(company.find({}))
                                .toArrayAsync()
                                .finally(model.releaseHandler(client));
                })
        ).bind(this).then(function(results)
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

                        company.editableByCurrentUser = this._isCompanyEditableByCurrentUser(company);

                        // This value is only for server side use
                        // Do not expose it to the client
                        company.private = null;
                }, this);

                companies.sort(function(a, b)
                {
                        a = a.name;
                        b = b.name;

                        a = a ? a.toString() : '';
                        b = b ? b.toString() : '';

                        // Intl is not yet supported by node.js
                        a = a.toLocaleLowerCase();
                        b = b.toLocaleLowerCase();

                        return a.localeCompare(b);
                });

                return companies;
        });
};

Company.prototype.updateCompany = function(id, values)
{
        var model = this.model;

        return model.acquire().bind(this).then(function(client)
        {
                var company = P.promisifyAll(client.collection('company'));

                return company.findOneAsync({_id: id}).bind(this).then(function(company)
                {
                        if (!company)
                        {
                                throw Error('Invalid company id');
                        }

                        if (!this._isCompanyEditableByCurrentUser(company))
                        {
                                throw Error('You are not allowed to edit this company');
                        }

                        // todo update attributes that a client is allowed to change
                })
                .finally(model.releaseHandler(client));
        });
};
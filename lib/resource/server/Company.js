'use strict';
var P = require('bluebird');
var Resource = require('../Resource');
var ObjectID = require('mongodb').ObjectID;

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
            this.user.private &&
            this.user.private.allPermissions)
        {
                return true;
        }

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
                P.using(model.acquire(), function(client)
                {
                        var company = client.collection('company');

                        return P.promisifyAll(company.find({}))
                                .toArrayAsync();
                }),
                P.using(model.acquire(), function(client)
                {
                        var company = client.collection('companyImport');

                        return P.promisifyAll(company.find({}))
                                .toArrayAsync();
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

                companies = companies.filter(function(company)
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

                        company._id = company._id.toString();
                        company.editableByCurrentUser = this._isCompanyEditableByCurrentUser(company);
                        if (company.visible === undefined) { company.visible = true; }

                        // This value is only for server side use
                        // Do not expose it to the client
                        company.private = null;

                        return company.visible || company.editableByCurrentUser;
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

Company.prototype.updateCompany = function(idArg, values)
{
        var model = this.model;

        return P.using(model.acquire(), function(client)
        {
                var companyCollection = P.promisifyAll(client.collection('company'));
                var id = new ObjectID(idArg);

                return companyCollection.findOneAsync({_id: id}).bind(this).then(function(company)
                {
                        if (!company)
                        {
                                throw Error('Invalid company id');
                        }

                        if (!this._isCompanyEditableByCurrentUser(company))
                        {
                                throw Error('You are not allowed to edit this company');
                        }

                        var update = {};
                        var $set = update.$set = {};

                        if ('name' in values)
                        {
                                $set.name = values.name.toString();
                        }

                        if ('payoff' in values)
                        {
                                $set.payoff = values.payoff.toString();
                        }

                        if ('revenueModel' in values)
                        {
                                $set.revenueModel = values.revenueModel.toString();
                        }

                        if ('sectors' in values && Array.isArray(values.sectors))
                        {
                                $set.sectors = values.sectors.map(function(s){ return s.toString(); });
                        }

                        if ('hiring' in values)
                        {
                                $set.hiring = !! values.hiring;
                        }

                        if ('openForInvestment' in values)
                        {
                                $set.openForInvestment = !! values.openForInvestment;
                        }

                        if ('visible' in values)
                        {
                                $set.visible = !! values.visible;
                        }

                        return companyCollection.updateAsync({_id: id}, update, {w : 1});
                });
        }.bind(this));
};
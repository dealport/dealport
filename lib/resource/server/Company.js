/*
 * DealPort
 * Copyright (c) 2014  DealPort B.V.
 *
 * This file is part of DealPort
 *
 * DealPort is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * DealPort is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with DealPort.  If not, see <http://www.gnu.org/licenses/>.
 *
 * In addition, the following supplemental terms apply, based on section 7 of
 * the GNU Affero General Public License (version 3):
 * a) Preservation of all legal notices and author attributions
 */

'use strict';
var P = require('bluebird');
var Resource = require('../Resource');
var ObjectID = require('mongodb').ObjectID;

function Company(primus, model, config, user)
{
        Resource.call(this, primus, 'Company');
        this.model = model;
        this.user = user;

        this.listen(['all', 'updateCompany', 'newEmptyCompany']);
}

require('inherits')(Company, Resource);
module.exports = Company;

Company.isCompanyEditableByUser = function(company, user)
{
        var ret = false;

        if (user &&
            user.private &&
            user.private.allPermissions)
        {
                return true;
        }

        if (user &&
            company.private &&
            company.private.editableByUser)
        {
                company.private.editableByUser.forEach(function(userId)
                {
                        if (user._id.equals(userId))
                        {
                                ret = true;
                        }
                });
        }

        return ret;
};

Company.prototype._isCompanyEditableByCurrentUser = function(company)
{
        return Company.isCompanyEditableByUser(company, this.user);
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

                        if (company.logoUploadedImage)
                        {
                                company.logoUploadedImage = company.logoUploadedImage.toString();
                                company.logoURL = '/company-logo/' + company._id;
                        }

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
        var now = new Date();

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
                                $set.name = values.name + '';
                        }

                        if ('homepage' in values)
                        {
                                var url = values.homepage + '';
                                url = url.trim();
                                if (!/^https?:\/\//.test(url))
                                {
                                        url = 'http://' + url;
                                }

                                $set.homepage = url;
                        }

                        if ('payoff' in values)
                        {
                                $set.payoff = values.payoff + '';
                        }

                        if ('revenueModel' in values)
                        {
                                $set.revenueModel = values.revenueModel + '';
                        }

                        if ('sectors' in values && Array.isArray(values.sectors))
                        {
                                $set.sectors = values.sectors.map(function(s){ return s + ''; });
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

                        var $setKeys = Object.keys($set);
                        if (!$setKeys.length)
                        {
                                return P.resolve();
                        }

                        $set['timestamp.!any!'] = now;

                        $setKeys.forEach(function(key)
                        {
                                $set['timestamp.'+key] = now;
                        }, this);

                        return companyCollection.updateAsync({_id: id}, update, {w : 1});
                });
        }.bind(this));
};

Company.prototype.newEmptyCompany = function()
{
        var user = this.user;

        if (!user ||
            !user._id)
        {
                return P.reject(Error('You must be logged in'));
        }

        return P.using(this.model.acquire(), function(client)
        {
                var companyCollection = P.promisifyAll(client.collection('company'));

                var company = {
                        _id: new ObjectID(),
                        name: '{ New company! }',
                        logoURL: 'https://angel.co/images/shared/nopic_startup.png',
                        openForInvestment: false,
                        hiring: false,
                        sectors: ['please', 'fill in the', 'sectors'],
                        revenueModel : 'Unknown',
                        payoff: 'payoff goes here',
                        hidden: true,
                        visible: false,
                        private: {
                                editableByUser: [user._id],
                                createdByUser: user._id
                        }
                };

                return companyCollection.insertAsync(company, {w: 1}).then(function()
                {
                        company._id = company._id.toString();
                        company.private = undefined;
                        company.editableByCurrentUser = true;
                        return company;
                });
        }).bind(this);
};
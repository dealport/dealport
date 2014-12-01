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

//var P = require('bluebird');
var Resource = require('../Resource');

function Company(primus)
{
        Resource.call(this, primus, 'Company');

        this._cache = { // contains Promises
                all: null
        };
}

require('inherits')(Company, Resource);
module.exports = Company;

Company.prototype.all = function()
{
        this._cache.all = this._cache.all || this.rpc('all');
        return this._cache.all;
};


Company.prototype.updateCompany = function(id, values)
{
        var p = this.rpc('updateCompany', id, values);

        // The caller of updateCompany does not have to wait for this stuff:
        p.then(function(rpcReturn)
        {
                if (!this._cache.all ||
                    !this._cache.all.isFulfilled())
                {
                        return;
                }

                var keys = Object.keys(values);

                this._cache.all.value().forEach(function(item)
                {
                        if (item._id !== id)
                        {
                                return;
                        }

                        keys.forEach(function(key)
                        {
                                item[key] = values[key];
                        });
                });

        });

        return p;
};

Company.prototype._updateLogoUrlInCache = function(id, logoURL)
{
        if (!this._cache.all ||
            !this._cache.all.isFulfilled())
        {
                return;
        }

        this._cache.all.value().forEach(function(item)
        {
                if (item._id !== id)
                {
                        return;
                }

                item.logoURL = logoURL;
        });
};

Company.prototype.newEmptyCompany = function()
{
        return this.rpc('newEmptyCompany');
};
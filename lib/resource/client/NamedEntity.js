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

function NamedEntity(primus, sharejsConn)
{
        Resource.call(this, primus, 'NamedEntity');

        this._cache = { // contains Promises
                byName: Object.create(null),
                byCompany: Object.create(null),
                byUser: Object.create(null),
        };
}

require('inherits')(NamedEntity, Resource);
module.exports = NamedEntity;

NamedEntity.prototype.byName = function(name)
{
        var cache = this._cache.byName;
        if (!cache[name])
        {
                cache[name] = this.rpc('byName', name);
        }

        return cache[name];
};

NamedEntity.prototype.byCompany = function(name)
{
        var cache = this._cache.byCompany;
        if (!cache[name])
        {
                cache[name] = this.rpc('byCompany', name);
        }

        return cache[name];
};


NamedEntity.prototype.byUser = function(name)
{
        var cache = this._cache.byUser;
        if (!cache[name])
        {
                cache[name] = this.rpc('byUser', name);
        }

        return cache[name];
};


NamedEntity.prototype.setCompanyName = function(companyId, name)
{
        return this.rpc('setCompanyName', companyId, name);
};

NamedEntity.prototype.setMyUserName = function(name)
{
        return this.rpc('setMyUserName', name);
};

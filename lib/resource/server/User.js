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

function User(primus, model, config, user)
{
        Resource.call(this, primus, 'User');
        this.model = model;
        this.user = user;

        this.listen(['_ids']);
}

require('inherits')(User, Resource);
module.exports = User;

User.prototype._ids = function(ids)
{
        var model = this.model;
        var livedb = this.model.livedb;
        var sessionUser = this.user;

        if (!Array.isArray(ids))
        {
                return P.reject(Error('Invalid argument'));
        }

        return livedb.bulkFetchAsync({user: ids})
        .bind(this)
        .then(function(result)
        {
                var entitiesById = result.user;
                return ids.map(function(id)
                {
                        var entity = entitiesById[id];
                        if (!entity.data)
                        {
                                return null;
                        }

                        model.user.addVirtualFields(id, entity.data, sessionUser);
                        return entity;
                });
        });
};

User.prototype.ids = function(ids)
{
        return this._ids(ids).map(function(entity){ return entity && entity.data; });
};
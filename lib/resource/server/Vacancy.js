/*
 * DealPort
 * Copyright (c) 2015  DealPort B.V.
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

function Vacancy(primus, model, config, user)
{
        Resource.call(this, primus, 'Vacancy');
        this.model = model;
        this.user = user;

        this.listen(['_ids', '_byName']);
}

require('inherits')(Vacancy, Resource);
module.exports = Vacancy;

Vacancy.prototype._ids = function(ids)
{
        var model = this.model;
        var livedb = this.model.livedb;
        var user = this.user;

        if (!Array.isArray(ids))
        {
                return P.reject(Error('Invalid argument'));
        }

        return livedb.bulkFetchAsync({vacancy: ids})
        .bind(this)
        .then(function(result)
        {
                var entitiesById = result.vacancy;
                return ids.map(function(id)
                {
                        var entity = entitiesById[id];
                        if (!entity.data)
                        {
                                return null;
                        }

                        model.vacancy.addVirtualFields(id, entity.data, user);
                        return entity;
                });
        });
};

Vacancy.prototype.ids = function(ids)
{
        return this._ids(ids).map(function(entity){ return entity && entity.data; });
};

Vacancy.prototype._byName = function(companyId, name)
{
        var model = this.model;

        return P.using(model.acquire(), function(db)
        {
                return db.vacancy.findOneAsync({company: companyId, name: name}, {_id: 1})
                .then(function(entity)
                {
                        if (!entity)
                        {
                                return null;
                        }

                        return entity._id.toString();
                });
        }).bind(this);
};

Vacancy.prototype.byName = function(companyId, name)
{
        var model = this.model;
        var user = this.user;

        return P.using(model.acquire(), function(db)
        {
                return db.vacancy.findOneAsync({company: companyId, name: name})
                .then(function(entity)
                {
                        if (!entity)
                        {
                                return null;
                        }

                        model.vacancy.addVirtualFields(entity._id, entity, user);
                        return entity;
                });
        }).bind(this);
};

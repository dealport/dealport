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

        this.listen(['_ids', '_byName', '_allCompany', 'newEmptyVacancy', 'removeVacancy']);
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


Vacancy.prototype._allCompany = function(companyId)
{
        var model = this.model;

        return P.using(model.acquire(), function(db)
        {
                return db.vacancy.find({company: companyId}, {_id: 1}).toArrayAsync()
                .then(function(entities)
                {
                        return entities.map(function(entity)
                        {
                                return entity._id.toString();
                        });
                });
        }).bind(this);
};

Vacancy.prototype.allCompany = function(companyId)
{
        var model = this.model;
        var user = this.user;

        return P.using(model.acquire(), function(db)
        {
                return db.vacancy.find({company: companyId}).toArrayAsync()
                .then(function(entities)
                {
                        entities.forEach(function(entity)
                        {
                                model.vacancy.addVirtualFields(entity._id, entity, user);
                        });

                        return entities;
                });
        }).bind(this);
};

Vacancy.prototype.newEmptyVacancy = function(companyId)
{
        var user = this.user;

        if (!user ||
            !user._id)
        {
                return P.reject(Error('You must be logged in'));
        }

        return this.model.livedb.fetchAsync('company', companyId)
        .bind(this)
        .then(function(snapshot)
        {
                var company = snapshot.data;
                if (!company)
                {
                        return P.reject(Error('Specified company does not exist'));
                }

                if (!this.model.company.isEditableByUser(company, user))
                {
                        return P.reject(Error('You are not allowed to edit this company'));
                }

                return this.model.vacancy.newVacancy({
                        company: companyId,
                        private: {
                                editableByUser: [user._id],
                                createdByUser: user._id
                        }
                })
                .get('_id');
        });
};

Vacancy.prototype.removeVacancy = function(id)
{
        var user = this.user;

        if (!user ||
            !user._id)
        {
                return P.reject(Error('You must be logged in'));
        }

        return this.model.livedb.fetchAsync('vacancy', id)
        .bind(this)
        .then(function(snapshot)
        {
                var vacancy = snapshot.data;
                if (!vacancy)
                {
                        return P.reject(Error('Specified vacancy does not exist'));
                }

                if (!this.model.vacancy.isEditableByUser(vacancy, user))
                {
                        return P.reject(Error('You are not allowed to edit this vacancy'));
                }

                return this.model.vacancy.removeVacancy(id);
        });
};
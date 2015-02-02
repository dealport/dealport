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

function Company(primus, model, config, user)
{
        Resource.call(this, primus, 'Company');
        this.model = model;
        this.user = user;

        this.listen(['_ids', '_all', 'newEmptyCompany', 'removeCompany']);
}

require('inherits')(Company, Resource);
module.exports = Company;

Company.prototype._ids = function(ids)
{
        var model = this.model;
        var livedb = this.model.livedb;
        var user = this.user;

        if (!Array.isArray(ids))
        {
                return P.reject(Error('Invalid argument'));
        }

        return livedb.bulkFetchAsync({company: ids})
        .bind(this)
        .then(function(result)
        {
                var entitiesById = result.company;
                return ids.map(function(id)
                {
                        var entity = entitiesById[id];
                        if (!entity.data)
                        {
                                return null;
                        }

                        model.company.addVirtualFields(id, entity.data, user);
                        return entity;
                });
        });
};

Company.prototype.ids = function(ids)
{
        return this._ids(ids).map(function(entity){ return entity && entity.data; });
};

Company.prototype._all = function()
{
        var model = this.model;
        var user = this.user;

        return P.using(model.acquire(), function(db)
        {
                // livedb sets _type to null on removal
                return db.company.find({_type: {$ne:null}}, {_id: 1, visible: 1, private: 1}).toArrayAsync()
                .then(function(entities)
                {
                        return entities
                        .filter(function(entity)
                        {
                                return model.company.isVisibleToUser(entity, user);
                        })
                        .map(function(entity)
                        {
                                return entity._id.toString();
                        });
                });
        }).bind(this);
};

Company.prototype.all = function()
{
        return this._all().then(function(ids)
        {
                return this.ids(ids);
        });
};

Company.prototype.newEmptyCompany = function()
{
        var user = this.user;

        if (!user ||
            !user._id)
        {
                return P.reject(Error('You must be logged in'));
        }

        return this.model.company.newCompany({
                private: {
                        editableByUser: [user._id],
                        createdByUser: user._id
                }
        })
        .get('_id');
};

Company.prototype.removeCompany = function(companyId)
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

                return this.model.company.removeCompany(companyId);
        });
};
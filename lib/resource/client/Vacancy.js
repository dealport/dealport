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

function Vacancy(primus, sharejsConn)
{
        Resource.call(this, primus, 'Vacancy');
        this.sharejs = sharejsConn;
}

require('inherits')(Vacancy, Resource);
module.exports = Vacancy;

Vacancy.prototype._ids = function(ids)
{
        var ret = [];

        ids.forEach(function(id)
        {
                var doc = this.sharejs.get('vacancy', id);
                doc.fetch();

                ret.push(doc.whenReadyAsync().then(function()
                {
                        return doc;
                }));
        }, this);

        return P.all(ret);
};

/**
 * Retrieve snapshots of all the vacancies by the given ID
 * @param {String[]} ids
 * @param {?SharejsContextManager} contextManager If given, subscribe (sharejs) the found documents
 *        and register them at the given context manager (so that you can clean them up).
 * @returns {Promise<Object>} snapshots
 */
Vacancy.prototype.ids = function(ids, contextManager)
{
        // (snapshots should not be modified)

        if (contextManager)
        {
                return contextManager.getSnapshot('vacancy', ids);
        }

        return this._ids(ids).map(function(doc){ return doc.getSnapshot(); });
};

Vacancy.prototype.byName = function(companyId, name, contextManager)
{
        return this.rpc('_byName', companyId, name)
        .then(function(id)
        {
                if (!id)
                {
                        return null;
                }

                return this.ids([id], contextManager).get(0);
        });
};

Vacancy.prototype.allCompany = function(companyId, contextManager)
{
        // todo cache
        return this.rpc('_allCompany', companyId)
        .then(function(ids)
        {
                return this.ids(ids, contextManager);
        });
};

Vacancy.prototype.newEmptyVacancy = function(companyId, contextManager)
{
        return this.rpc('newEmptyVacancy', companyId)
        .then(function(id)
        {
                return this.ids([id], contextManager).get('0');
        });
};


Vacancy.prototype.removeVacancy = function(id)
{
        return this.rpc('removeVacancy', id)
        .bind(this)
        .then(function(result)
        {
                // (invalidate cache here)
                return result;
        });
};
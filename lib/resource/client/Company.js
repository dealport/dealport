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
var hrtime = require('../../swissarmyknife/hrtime');

function Company(primus, sharejsConn)
{
        Resource.call(this, primus, 'Company');
        this.sharejs = sharejsConn;

        this._cache = { // contains Promises
                _allTime: null,
                _all: null
        };
}

require('inherits')(Company, Resource);
module.exports = Company;

Company.prototype._ids = function(ids)
{
        var ret = [];

        ids.forEach(function(id)
        {
                var doc = this.sharejs.get('company', id);
                doc.fetch();

                ret.push(doc.whenReadyAsync().then(function()
                {
                        return doc;
                }));
        }, this);

        return P.all(ret);
};

/**
 * Retrieve snapshots of all the companies by the given ID
 * @param {String[]} ids
 * @param {?SharejsContextFactory} contextFactory If given, subscribe (sharejs) the found documents
 *        and register them at the given context factory (so that you can clean them up).
 * @returns {Promise<Object>} snapshots
 */
Company.prototype.ids = function(ids, contextFactory)
{
        // (snapshots should not be modified)

        if (contextFactory)
        {
                return contextFactory.getSnapshot('company', ids);
        }

        return this._ids(ids).map(function(doc){ return doc.getSnapshot(); });
};

Company.prototype._all = function()
{
        // todo solve this caching stuff using sharejs or something

        if (!this._cache._all ||
            (this._cache._allTime && hrtime(this._cache._allTime) > 5 * 60 * 1000))
        {
                this._cache._all = this.rpc('_all');
                this._cache._allTime = hrtime();
        }

        return this._cache._all;
};

/**
 * Retrieve snapshots of all companies.
 * @param {?SharejsContextFactory} contextFactory If given, subscribe (sharejs) the found documents
 *        and register them at the given context factory (so that you can clean them up).
 * @returns {Promise<Object>} snapshots
 */
Company.prototype.all = function(contextFactory)
{
        return this._all()
        .then(function(ids)
        {
                if (contextFactory)
                {
                        return contextFactory.getSnapshot('company', ids);
                }

                return this.ids(ids);
        });
};

/**
 * Create a new empty document and retrieve the snapshot.
 * @param {?SharejsContextFactory} contextFactory If given, subscribe (sharejs) the found documents
 *        and register them at the given context factory (so that you can clean them up).
 * @returns {Promise<Object>} snapshots
 */
Company.prototype.newEmptyCompany = function(contextFactory)
{
        return this.rpc('newEmptyCompany')
        .then(function(id)
        {
                if (this._cache._all.isFulfilled())
                {
                        this._cache._all.value().push(id);
                }
                else
                {
                        // _all() is probably in progress, instead of keeping a queue,
                        // just invalidate the cache here
                        this._cache._all = null;
                }

                return this.ids([id], contextFactory).get('0');
        });
};

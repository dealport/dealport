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

var AcquireContextsResult = require('../AcquireContextsResult');

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

Company.prototype.acquireContexts = function(ids)
{
        // call .destroyAll() on the return value when done

        // true = subscribe
        return this._ids(ids, true).then(function(docs)
        {
                // true = unsubscribe when all contexts for a document are destroyed
                return AcquireContextsResult.acquireContexts(docs, true);
        });
};

Company.prototype._ids = function(ids, doSubscribe)
{
        var ret = [];

        ids.forEach(function(id)
        {
                var doc = this.sharejs.get('company', id);

                if (doSubscribe)
                {
                        doc.subscribe();
                }
                else
                {
                        doc.fetch();
                }

                ret.push(doc.whenReadyAsync().then(function()
                {
                        return doc;
                }));
        }, this);

        return P.all(ret);
};

Company.prototype.ids = function(ids)
{
        // (snapshot should not be modified)
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

Company.prototype.all = function()
{
        return this._all()
        .then(function(ids)
        {
                return this.ids(ids);
        });
};

Company.prototype.acquireAllContexts = function()
{
        return this._all()
        .then(function(ids)
        {
                return this.acquireContexts(ids);
        });
};

Company.prototype.newEmptyCompany = function(companyContexts)
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

                return this._ids([id]).then(function(docs)
                {
                        var doc = docs[0];
                        if (doc && companyContexts)
                        {
                                doc.subscribe();
                                companyContexts.add(doc);
                        }

                        return doc.getSnapshot();
                });
        });
};

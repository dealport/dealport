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

function User(primus, sharejsConn)
{
        Resource.call(this, primus, 'User');
        this.sharejs = sharejsConn;

        this._cache = { // contains Promises
        };
}

require('inherits')(User, Resource);
module.exports = User;

User.prototype._ids = function(ids)
{
        var ret = [];

        ids.forEach(function(id)
        {
                var doc = this.sharejs.get('user', id);

                doc.fetch();

                ret.push(doc.whenReadyAsync().then(function()
                {
                        return doc;
                }));
        }, this);

        return P.all(ret);
};

User.prototype.ids = function(ids, contextFactory)
{
        if (contextFactory)
        {
                return contextFactory.getSnapshot('user', ids);
        }

        // (snapshot should not be modified)
        return this._ids(ids).map(function(doc){ return doc.getSnapshot(); });
};
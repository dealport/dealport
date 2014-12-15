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
var ExpressStore = require('express-session').Store;

function MongoSessionStore(model)
{
        ExpressStore.call(this);
        this.model = model;
}
require('inherits')(MongoSessionStore, ExpressStore);

module.exports = MongoSessionStore;


MongoSessionStore.prototype.get = function(sid, callback)
{
        var model = this.model;

        if (!sid)
        {
                process.nextTick(function()
                {
                        callback(null);
                });
                return;
        }

        P.using(model.acquire(), function(db)
        {
                return db.session.findOneAsync({_id: sid});
        })
        .nodeify(callback);
};

MongoSessionStore.prototype.set = function(sid, session, callback)
{
        var model = this.model;

        P.using(model.acquire(), function(db)
        {
                session._id = sid;

                return db.session.updateAsync({_id: sid}, session, {upsert: true, w: 0});
        })
        .return()
        .nodeify(callback);
};

MongoSessionStore.prototype.destroy = function(sid, callback)
{
        var model = this.model;

        P.using(model.acquire(), function(db)
        {
                return db.session.removeAsync({_id: sid}, {w: 0});
        })
        .return()
        .nodeify(callback);
};

MongoSessionStore.prototype.length = function(callback)
{
        var model = this.model;

        P.using(model.acquire(), function(db)
        {
                return db.session.countAsync();
        })
        .nodeify(callback);
};

MongoSessionStore.prototype.clear = function(callback)
{
        var model = this.model;

        P.using(model.acquire(), function(db)
        {
                return db.session.removeAsync({}, {w: 0});
        })
        .return()
        .nodeify(callback);
};

P.promisifyAll(MongoSessionStore.prototype);
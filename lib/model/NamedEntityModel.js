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

var Model = require('./Model');

/**
 *
 * Looks like in mongo:
 *
 * {
 *  "_id" : "my name (displayed in URLs)",
 *  "company: "company id"
 *  "user: ObjectId("user id")
 * }
 *
 * @param modelIndex
 * @constructor
 */
function NamedEntityModel(modelIndex)
{
        Model.call(this, modelIndex);
}

module.exports = NamedEntityModel;
require('inherits')(NamedEntityModel, Model);

NamedEntityModel.prototype.cleanupName = function(name)
{
        if (!name)
        {
                return '';
        }

        name = name.toString();
        name = name.replace(/[\x00-\x1F]+/g, ''); // ascii control chars
        name = name.trim();

        // replace spaces with dashes
        name = name.replace(/\s+/g, '-');

        name = name.toLowerCase();
        return name;
};

NamedEntityModel.prototype.createByGuessingId = function(named)
{
        var livedb = this.modelIndex.livedb;

        named._id = null;

        return P.using(this.modelIndex.acquire(), function(db)
        {
                var p;
                var namePromise;
                var existingNamedIdPromise;
                var entityVersionPromise;
                var id;
                var removeObj;

                if (named.company)
                {
                        id = named.company;
                        removeObj = {company: named.company};
                        p = db.company.findOneAsync({_id: id}, {name: 1, namedEntityId: 1, _v: 1});
                        namePromise = p.get('name');

                }
                else if (named.user)
                {
                        id = named.user;
                        removeObj = {user: named.user};
                        p = db.user.findOneAsync({_id: id}, {displayName: 1, namedEntityId: 1});
                        namePromise = p.get('displayName');
                }
                else
                {
                        throw Error('Invalid argument');
                }

                existingNamedIdPromise = p.get('namedEntityId');
                entityVersionPromise = p.get('_v');

                namePromise = namePromise.then(this.cleanupName);

                return P.join(namePromise, existingNamedIdPromise, function(name, previousNamedId)
                {
                        if (!name)
                        {
                                return [];
                        }

                        var attempts = [];
                        for (var i = 1; i <= 25; ++i)
                        {
                                var nameAttempt = name + (i > 1 ? '-' + i : '');

                                if (previousNamedId === nameAttempt)
                                {
                                        // we already have this name, use the existing namedEntity by rejecting,
                                        // skipping all the other database stuff
                                        named._id = previousNamedId;
                                        // start with $ to discourage saving this back into mongo...
                                        named.$reuseExistingNamedEntityBailout = true;
                                        return P.reject(named);
                                }

                                if (/^[0-9a-zA-Z]{24}$/.test(nameAttempt))
                                {
                                        // ObjectIDs are reserved
                                        nameAttempt += 'x';
                                }

                                attempts.push(P.join(
                                        nameAttempt,
                                        db.namedEntity.findOneAsync({_id: nameAttempt}, {dummy: 1, _id: 0})
                                ));
                        }

                        return P.all(attempts);
                })
                .then(function(attempts)
                {
                        for (var i = 0; i < attempts.length; ++i)
                        {
                                var attempt = attempts[i];
                                if (!attempt[1])
                                {
                                        return attempt[0];
                                }
                        }

                        // give up
                        return null;
                })
                .then(function(unusedName)
                {
                        if (unusedName)
                        {
                                named._id = unusedName;
                        }
                        else
                        {
                                // use the OID of the entity
                                named._id = id.toString();
                        }

                        // avoid unique index errors
                        var bulk = db.namedEntity._native.initializeOrderedBulkOp();
                        bulk.executeAsync = P.promisify(bulk.execute);
                        bulk.find(removeObj).removeOne();
                        if (unusedName)
                        {
                                bulk.insert(named);
                        } // else: do not insert ObjectId's in namedEntity

                        return bulk.executeAsync()
                        .catch(function(err)
                        {
                                console.error('Error in NamedEntityModel.prototype.createByGuessingId bulk operation', err, err.stack);
                                // use the OID of the entity as fallback
                                named._id = id.toString();
                        })
                        .return(named);
                })
                .then(function(named)
                {
                        // if creating the new named entity was successful,
                        // update the entity too

                        if (named.company)
                        {
                                return livedb.submitAsync('company', named.company, {
                                        op: [
                                                {
                                                        p: ['namedEntityId'],
                                                        od: existingNamedIdPromise.value(),
                                                        oi: named._id
                                                }
                                        ],
                                        v : entityVersionPromise.value()
                                });
                        }
                        else if (named.user)
                        {
                                return livedb.submitAsync('user', named.user, {
                                        op: [
                                                {
                                                        p: ['namedEntityId'],
                                                        od: existingNamedIdPromise.value(),
                                                        oi: named._id
                                                }
                                        ],
                                        v : entityVersionPromise.value()
                                });
                        }

                        return null;
                })
                .catch(function(namedOrError)
                {
                        if (namedOrError &&
                            namedOrError.$reuseExistingNamedEntityBailout)
                        {
                                return P.resolve(namedOrError);
                        }

                        return P.reject(namedOrError);
                });
        }.bind(this))
        .return(named);
};

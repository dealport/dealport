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
var ObjectID = require('mongodb').ObjectID;
var clone = require('clone');

function NamedEntity(primus, model, config, user)
{
        Resource.call(this, primus, 'NamedEntity');
        this.model = model;
        this.config = config;
        this.user = user;

        this.listen(['byName', 'byCompany', 'byUser', 'setCompanyName', 'setMyUserName']);
}

require('inherits')(NamedEntity, Resource);
module.exports = NamedEntity;

NamedEntity.cleanupName = function(name)
{
        if (!name)
        {
                return '';
        }

        name = name.toString();
        name = name.replace(/[\x00-\x1F]+/g, ''); // ascii control chars
        name = name.trim();
        return name;
};

function postProcess(named)
{
        if (named && named.user)
        {
                named = clone(named, false);
                named.user = named.user.toString();
        }

        return named;
}

NamedEntity.prototype.byName = function(name)
{
        return P.using(this.model.acquire(), function(db)
        {
                return db.namedEntity.findOneAsync({_id: name}).then(postProcess);
        }).bind(this);
};

NamedEntity.prototype._createNamedByGuessingName = function(db, named)
{
        var namePromise;
        var id;

        if (named.company)
        {
                id = named.company;
                namePromise = db.company.findOneAsync({_id: id}, {name: 1}).get('name');
        }
        else if (named.user)
        {
                id = named.user;
                namePromise = db.user.findOneAsync({_id: id}, {displayName: 1}).get('displayName');
        }
        else
        {
                throw Error('Assertion error');
        }

        return namePromise
        .then(NamedEntity.cleanupName)
        .then(function(name)
        {
                if (!name)
                {
                        return [];
                }

                var attempts = [];
                for (var i = 1; i <= 25; ++i)
                {
                        var nameAttempt = name + (i > 1 ? ' ' + i : '');
                        attempts.push(P.join(
                                nameAttempt,
                                db.namedEntity.findOneAsync({_id: nameAttempt}, {dummy: 1, _id: 0})
                        ));
                }

                attempts.push(P.join(
                        id.toString(),
                        db.namedEntity.findOneAsync({_id: id.toString()}, {dummy: 1, _id: 0})
                ));

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
                if (!unusedName)
                {
                        return null;
                }

                named._id = unusedName;
                return db.namedEntity.insertAsync(named)
                .return(named);
        });
};

NamedEntity.prototype.byCompany = function(companyId)
{
        return P.using(this.model.acquire(), function(db)
        {
                return db.namedEntity.findOneAsync({company: companyId})
                .bind(this)
                .then(function(named)
                {
                        if (named)
                        {
                                return named;
                        }

                        return this._createNamedByGuessingName(db, {company: companyId});
                })
                .then(postProcess);
        }.bind(this));
};

NamedEntity.prototype.byUser = function(userId)
{
        userId = new ObjectID(userId);
        return P.using(this.model.acquire(), function(db)
        {
                return db.namedEntity.findOneAsync({user: userId})
                .bind(this)
                .then(function(named)
                {
                        if (named)
                        {
                                return named;
                        }

                        return this._createNamedByGuessingName(db, {user: userId});
                })
                .then(postProcess);
        }.bind(this));
};

NamedEntity.prototype.setCompanyName = function(companyId, name)
{
        var model = this.model;
        var user = this.user;

        name = NamedEntity.cleanupName(name);

        if (!name)
        {
                throw Error('Missing or invalid argument "name"');
        }

        return P.using(model.acquire(), function(db)
        {
                return P.join(
                        db.company.findOneAsync({_id: companyId}, {private: 1}),
                        db.namedEntity.findOneAsync({_id: name}),
                        db.namedEntity.findOneAsync({company: companyId})
                )
                .spread(function(company, existing, old)
                {
                        if (!company)
                        {
                                throw Error('The given company does not exist');
                        }

                        if (!model.company.isEditableByUser(company, user))
                        {
                                throw Error('You are not allowed to edit this company');
                        }

                        if (existing)
                        {
                                if (existing.company === name)
                                {
                                        // no change
                                        return postProcess(existing);
                                }

                                throw Error('The given name is already in use');
                        }

                        var removePromise = P.resolve();

                        if (old)
                        {
                                removePromise = db.namedEntity.removeAsync({_id: old._id});
                        }

                        var obj = {
                                _id: name,
                                company: companyId
                        };

                        return removePromise.then(function()
                        {
                                return db.namedEntity.insertAsync(obj);
                        })
                        .return(obj)
                        .then(postProcess);
                });
        }).bind(this);
};

NamedEntity.prototype.setMyUserName = function(name)
{
        var model = this.model;
        var user = this.user;

        name = NamedEntity.cleanupName(name);

        if (!name)
        {
                throw Error('Missing or invalid argument "name"');
        }

        if (!user)
        {
                throw Error('You are not logged in');
        }

        return P.using(model.acquire(), function(db)
        {
                return P.join(
                        db.namedEntity.findOneAsync({_id: name}),
                        db.namedEntity.findOneAsync({user: user._id})
                )
                .spread(function(existing, old)
                {
                        if (existing)
                        {
                                if (user._id.equals(existing.user))
                                {
                                        // no change
                                        return postProcess(existing);
                                }

                                throw Error('The given name is already in use');
                        }

                        var removePromise = P.resolve();

                        if (old)
                        {
                                removePromise = db.namedEntity.removeAsync({_id: old._id});
                        }

                        var obj = {
                                _id: name,
                                user: user._id
                        };

                        return removePromise.then(function()
                        {
                                return db.namedEntity.insertAsync(obj);
                        })
                        .return(obj)
                        .then(postProcess);
                });
        }).bind(this);
};
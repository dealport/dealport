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
var merge = require('merge');
var ObjectID = require('mongodb').ObjectID;

var Model = require('./Model');

/**
 *
 * Looks like in mongo:
 *
 * {
 *  "_id" : "object id hex string",
 *  "auth": {...passport object...},
 *  "displayName": "first name last name etc",
 *  "email": "foo@example.com"
 *  "private": { // this is never sent to a client
 *    allPermissions: true
 *  }
 * }
 *
 *
 * Virtual keys:
 *
 * editableByCurrentUser
 *
 * @param modelIndex
 * @constructor
 */

function UserModel(modelIndex)
{
        Model.call(this, modelIndex);
}

module.exports = UserModel;
require('inherits')(UserModel, Model);

UserModel.prototype.isEditableByUser = function(user, editor)
{
        if (editor &&
            editor.private &&
            editor.private.allPermissions)
        {
                return true;
        }

        return editor &&
               user._id === editor._id;
};


UserModel.prototype.addVirtualFields = function(id, data, user)
{
        data._id = id;
        data.editableByCurrentUser = this.isEditableByUser(data, user);
};

UserModel.prototype.filterDocument = P.method(function(docId, data, user)
{
        this.addVirtualFields(docId, data.data, user);
        data.data.private = undefined; // delete is slow
});

UserModel.prototype.validateReadingAllowed = P.method(function(docId, user)
{
});

UserModel.prototype._validateComponent = function(comp)
{
        if (!Array.isArray(comp.p))
        {
                console.error(comp);
                throw Error('Invalid operation, missing path');
        }

        function assert(cond)
        {
                if (!cond)
                {
                        throw Error('Invalid operation for path ' + comp.p.join(', '));
                }
        }

        // todo: make this stuff more generic
        var cleanComp = {p : comp.p};

        // allow complete replacements for these keys
        if (comp.p.length === 1 && 'oi' in comp)
        {
                switch (comp.p[0])
                {
                        case 'displayName':
                                if ('oi' in comp)
                                {
                                        assert(typeof comp.oi === 'string');
                                        cleanComp.oi = comp.oi;
                                }

                                if ('od' in comp)
                                {
                                        assert(typeof comp.od === 'string');
                                        cleanComp.od = comp.od;

                                        if (!('oi' in cleanComp))
                                        {
                                                // make sure the key is not deleted (turn it into a replacement)
                                                cleanComp.oi = '';
                                        }
                                }
                                break;
                }

                return cleanComp;
        }

        switch(comp.p[0])
        {
                case 'displayName': // strings
                        assert(comp.p.length === 2);
                        assert(Number.isFinite(comp[1]));

                        if ('si' in comp)
                        {
                                assert(typeof comp.si === 'string');
                                cleanComp.si = comp.si;
                        }

                        if ('sd' in comp)
                        {
                                assert(typeof comp.sd === 'string');
                                cleanComp.sd = comp.si;
                        }

                        break;
        }

        return cleanComp;
};

UserModel.prototype.validateOperation = P.method(function(docId, opData, user)
{
        return P.using(this.modelIndex.acquire(), function(db)
        {
                return db.user.findOneAsync({_id: docId}, {_id: 1, private: 1})
                        .bind(this)
                        .then(function(userPrivateOnly)
                        {
                                if (!userPrivateOnly)
                                {
                                        throw Error('Invalid user id: ' + docId);
                                }

                                if (!this.isEditableByUser(userPrivateOnly, user))
                                {
                                        throw Error('You are not allowed to edit the company: ' + docId);
                                }

                                opData.op.forEach(function(comp, index)
                                {
                                        opData.op[index] = this._validateComponent(comp);
                                }, this);

                                return true;
                        });
        }.bind(this));
});

UserModel.prototype.afterSubmit = P.method(function(docId, opData, snapshot, user)
{
        var nameChanged = false;

        opData.op.forEach(function(comp, index)
        {
                if (comp.p &&
                    comp.p[0] === 'displayName')
                {
                        nameChanged = true;
                }
        }, this);

        if (nameChanged)
        {
                return this.modelIndex.namedEntity.createByGuessingId({
                        user: docId
                });
        }

        return null;
});

var userDefaultFields = {
        displayName: '',
        email: '',
        auth: {},
        private: {

        }
};

UserModel.prototype.newUser = P.method(function(initialFields)
{
        var fields = merge.recursive(userDefaultFields, initialFields);
        var id = new ObjectID().toString();

        return this.modelIndex.livedb.submitAsync('user', id, {
                create: {
                        type: 'json0',
                        data: fields
                }
        })
        .bind(this)
        .spread(function(version, transformedByOps, snapshot)
        {
                this.addVirtualFields(id, snapshot.data, null);
                return snapshot.data;
        });
});
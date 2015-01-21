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
 *  "company": "object id hex of company",
 *  "name": "Used in the url, unique in combination with 'company'",
 *  "title": "Single line text",
 *  "private" : {
 *      "editableByUser" : [
 *          "object id hex"
 *      ],
 *      "createdByUser" : ObjectId(...)
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

function VacancyModel(modelIndex)
{
        Model.call(this, modelIndex);
}

module.exports = VacancyModel;
require('inherits')(VacancyModel, Model);

VacancyModel.prototype.cleanupName = function(name)
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


VacancyModel.prototype.isEditableByUser = function(vacancy, user)
{
        var ret = false;

        if (user &&
            user.private &&
            user.private.allPermissions)
        {
                return true;
        }

        if (user &&
            vacancy.private &&
            vacancy.private.editableByUser)
        {
                vacancy.private.editableByUser.forEach(function(userId)
                {
                        if (user._id === userId)
                        {
                                ret = true;
                        }
                });
        }

        return ret;
};

VacancyModel.prototype.isVisibleToUser = function(vacancy, user)
{
        if (vacancy.visible || vacancy.visible === undefined)
        {
                return true;
        }

        return this.isEditableByUser(vacancy, user);
};


VacancyModel.prototype.addVirtualFields = function(id, data, user)
{
        data._id = id;

        data.editableByCurrentUser = this.isEditableByUser(data, user);

        if (data.visible === undefined) { data.visible = true; }
};

VacancyModel.prototype.filterDocument = P.method(function(docId, data, user)
{
        this.addVirtualFields(docId, data.data, user);
        data.data.private = undefined; // delete is slow

});

VacancyModel.prototype.validateReadingAllowed = P.method(function(docId, user)
{
});

VacancyModel.prototype._validateComponent = function(comp)
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
                        case 'title':
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
                case 'title': // strings
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

VacancyModel.prototype.validateOperation = P.method(function(docId, opData, user)
{
        return P.using(this.modelIndex.acquire(), function(db)
        {
                return db.vacancy.findOneAsync({_id: docId}, {_id: 1, private: 1})
                .bind(this)
                .then(function(vacancyPrivateOnly)
                {
                        if (!vacancyPrivateOnly)
                        {
                                throw Error('Invalid vacancy id: ' + docId);
                        }

                        if (!this.isEditableByUser(vacancyPrivateOnly, user))
                        {
                                throw Error('You are not allowed to edit the vacancy: ' + docId);
                        }

                        opData.op.forEach(function(comp, index)
                        {
                                opData.op[index] = this._validateComponent(comp);
                        }, this);

                        return true;
                });
        }.bind(this));
});

VacancyModel.prototype.afterSubmit = P.method(function(docId, opData, snapshot, user)
{
        var titleChanged = false;

        opData.op.forEach(function(comp)
        {
                if (comp.p &&
                    comp.p[0] === 'title')
                {
                        titleChanged = true;
                }
        }, this);

        if (titleChanged)
        {
                return this.findUniqueName(snapshot.data.company, snapshot.data.title, docId)
                .bind(this)
                .then(function(uniqueName)
                {
                        if (!uniqueName)
                        {
                                uniqueName = docId; // fallback
                        }

                        return this.modelIndex.livedb.submitAsync('vacancy', docId, {
                                op: [
                                        {
                                                p : ['name'],
                                                od: snapshot.data.name,
                                                oi: uniqueName
                                        }
                                ],
                                v : snapshot.v
                        });
                });
        }

        return null;
});

VacancyModel.prototype.findUniqueName = P.method(function(companyId, title, findForVacancyId)
{
        var name = this.cleanupName(title);

        return P.using(this.modelIndex.acquire(), function(db)
        {
                var attempts = [];
                for (var i = 1; i <= 25; ++i)
                {
                        var nameAttempt = name + (i > 1 ? '-' + i : '');

                        if (/^[0-9a-zA-Z]{24}$/.test(nameAttempt))
                        {
                                // ObjectIDs are reserved
                                nameAttempt += 'x';
                        }

                        attempts.push(P.join(
                                nameAttempt,
                                db.vacancy.findOneAsync({company: companyId, name: nameAttempt}, {_id: 1})
                        ));
                }

                return P.all(attempts)
                .then(function(attempts)
                {
                        for (var i = 0; i < attempts.length; ++i)
                        {
                                var attempt = attempts[i];
                                var foundVacancyId = attempt[1] && attempt[1]._id;

                                if (!foundVacancyId ||
                                    foundVacancyId === findForVacancyId)
                                {
                                        return attempt[0];
                                }
                        }

                        // give up
                        return null;
                });
        });
});

var vacancyDefaultFields = {
        title: '{ New vacancy! }',
        name: 'new-vacancy',
        company: null,
        private: {
                editableByUser: [],
                createdByUser: null
        }
};

VacancyModel.prototype.newVacancy = P.method(function(initialFields)
{
        var fields = merge.recursive(vacancyDefaultFields, initialFields);
        var id = new ObjectID().toString();

        if (!fields.company)
        {
                throw Error('Company field is required');
        }

        return this.findUniqueName(fields.company, fields.title)
        .bind(this)
        .then(function(uniqueName)
        {
                fields.name = uniqueName || id;

                return this.modelIndex.livedb.submitAsync('vacancy', id, {
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


});
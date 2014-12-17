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
 *  "_id" : "objectid hex",
 *  "companyImportID": "1234",
 *  "name" : "{ New company! }",
 *  "logoUploadedImage": ObjectId(...),
 *  "logoURL" : "https://example.com/foo.png",
 *  "openForInvestment" : false,
 *  "hiring" : false,
 *  "sectors" : [
 *      "please",
 *      "fill in the",
 *      "sectors"
 *  ],
 *  "revenueModel" : "Unknown",
 *  "payoff" : "payoff goes here",
 *  "hidden" : true,
 *  "visible" : false,
 *  "private" : {
 *      "editableByUser" : [
 *          ObjectId(...)
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

function CompanyModel(modelIndex)
{
        Model.call(this, modelIndex);
}

module.exports = CompanyModel;
require('inherits')(CompanyModel, Model);

CompanyModel.prototype.isEditableByUser = function(company, user)
{
        var ret = false;

        if (user &&
            user.private &&
            user.private.allPermissions)
        {
                return true;
        }

        if (user &&
            company.private &&
            company.private.editableByUser)
        {
                company.private.editableByUser.forEach(function(userId)
                {
                        if (user._id.equals(userId))
                        {
                                ret = true;
                        }
                });
        }

        return ret;
};

CompanyModel.prototype.isVisibleToUser = function(company, user)
{
        if (company.visible || company.visible === undefined)
        {
                return true;
        }

        return this.isEditableByUser(company, user);
};

CompanyModel.prototype.addVirtualFields = function(id, data, user)
{
        data._id = id;

        data.editableByCurrentUser = this.isEditableByUser(data, user);

        if (data.visible === undefined) { data.visible = true; }

        if (data.logoUploadedImage)
        {
                data.logoUploadedImage = data.logoUploadedImage.toString(); // ObjectID
                data.logoURL = '/company-logo/' + id;
        }
};

/**
 * db.company.update({_v: null}, {$set: {_v: 0}}, {multi: true})
 * db.company.update({_type: null}, {$set: {_type: 'http://sharejs.org/types/JSONv0'}}, {multi: true})
 * db.company.update({_m: null}, {$set: {_m: {mtime: 0, ctime: 0}}}, {multi: true})
 */

CompanyModel.prototype.filterDocument = P.method(function(docId, data, user)
{
        this.addVirtualFields(docId, data.data, user);
        data.data.private = undefined; // delete is slow

});

CompanyModel.prototype.validateReadingAllowed = P.method(function(docId, user)
{
});

CompanyModel.prototype._validateComponent = function(comp)
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
                        case 'name':
                        case 'payoff':
                        case 'revenueModel':
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
                        case 'homepage':
                                if ('oi' in comp)
                                {
                                        assert(comp.oi === null || typeof comp.oi === 'string');
                                        cleanComp.oi = comp.oi;
                                }

                                if ('od' in comp)
                                {
                                        assert(comp.od === null || typeof comp.od === 'string');
                                        cleanComp.od = comp.od;

                                        if (!('oi' in cleanComp))
                                        {
                                                // make sure the key is not deleted (turn it into a replacement)
                                                cleanComp.oi = '';
                                        }
                                }
                                break;
                        case 'hiring':
                        case 'openForInvestment':
                        case 'visible':
                                if ('oi' in comp)
                                {
                                        assert(typeof comp.oi === 'boolean');
                                        cleanComp.oi = comp.oi;
                                }

                                if ('od' in comp)
                                {
                                        assert(typeof comp.od === 'boolean');
                                        cleanComp.od = comp.od;

                                        if (!('oi' in cleanComp))
                                        {
                                                // make sure the key is not deleted
                                                cleanComp.oi = false;
                                        }
                                }
                                break;
                        case 'sectors':
                                if ('oi' in comp)
                                {
                                        assert(Array.isArray(comp.oi));
                                        comp.oi.forEach(function(item){ assert(typeof item === 'string'); });

                                        cleanComp.oi = comp.oi;
                                }

                                if ('od' in comp)
                                {
                                        assert(Array.isArray(comp.od));
                                        comp.od.forEach(function(item){ assert(typeof item === 'string'); });

                                        cleanComp.od = comp.od;

                                        if (!('oi' in cleanComp))
                                        {
                                                // make sure the key is not deleted
                                                cleanComp.oi = false;
                                        }
                                }
                                break;
                }

                return cleanComp;
        }

        switch(comp.p[0])
        {
                case 'name': // strings
                case 'payoff':
                case 'revenueModel':
                case 'homepage':
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

                case 'sectors':

                        if ('li' in comp)
                        {
                                assert(comp.p.length === 2);
                                assert(Number.isFinite(comp[1]));
                                assert(typeof comp.li === 'string');
                                cleanComp.li = comp.li;
                        }

                        if ('ld' in comp)
                        {
                                assert(comp.p.length === 2);
                                assert(Number.isFinite(comp[1]));
                                assert(typeof comp.ld === 'string');
                                cleanComp.ld = comp.ld;
                        }

                        if ('si' in comp)
                        {
                                assert(comp.p.length === 3);
                                assert(Number.isFinite(comp[1]));
                                assert(typeof comp.si === 'string');
                                cleanComp.si = comp.si;
                        }

                        if ('sd' in comp)
                        {
                                assert(comp.p.length === 3);
                                assert(Number.isFinite(comp[1]));
                                assert(typeof comp.si === 'string');
                                cleanComp.sd = comp.si;
                        }
        }

        return cleanComp;
};

CompanyModel.prototype.validateOperation = P.method(function(docId, opData, user)
{
        return P.using(this.modelIndex.acquire(), function(db)
        {
                return db.company.findOneAsync({_id: docId}, {_id: 1, private: 1})
                .bind(this)
                .then(function(companyPrivateOnly)
                {
                        if (!companyPrivateOnly)
                        {
                                throw Error('Invalid company id: ' + docId);
                        }

                        if (!this.isEditableByUser(companyPrivateOnly, user))
                        {
                                console.log('user', user);
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

CompanyModel.prototype.afterSubmit = P.method(function(docId, opData, snapshot, user)
{
        var nameChanged = false;

        opData.op.forEach(function(comp, index)
        {
                if (comp.p &&
                    comp.p[0] === 'name')
                {
                        nameChanged = true;
                }
        }, this);

        if (nameChanged)
        {
                return this.modelIndex.namedEntity.createByGuessingId({
                        company: docId
                });
        }

        return null;
});
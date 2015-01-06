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
var clone = require('clone');

function NamedEntity(primus, model, config, user)
{
        Resource.call(this, primus, 'NamedEntity');
        this.model = model;
        this.config = config;
        this.user = user;

        this.listen(['byName']);
}

require('inherits')(NamedEntity, Resource);
module.exports = NamedEntity;

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
                if (/^[0-9a-zA-Z]{24}$/.test(name)) // ObjectID
                {
                        return P.join(
                                db.company.findOneAsync({_id: name}, {_id: 1}),
                                db.user.findOneAsync({_id: name}, {_id: 1})
                        )
                        .spread(function(company, user)
                        {
                                if (company)
                                {
                                        return {
                                                _id    : company._id,
                                                company: company._id
                                        };
                                }

                                if (user)
                                {
                                        return {
                                                _id : user._id,
                                                user: user._id
                                        };
                                }

                                return null;
                        });
                }

                return db.namedEntity.findOneAsync({_id: name});
        }).then(postProcess);
};

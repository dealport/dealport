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

var StateAnchor = require('./StateAnchor');

function NamedEntityAnchor(node, router, entity, namedEntityState, content)
{
        StateAnchor.call(this, node, router);

        this._shareContext = null;

        if (this.isCreationConstructor(node))
        {
                this.cls('NamedEntityAnchor');

                this.attr('data-entity-id', entity._id);
                this.attr('data-named-entity-id', entity.namedEntityId);
                this.namedEntityState = namedEntityState;

                for (var i = 4; i < arguments.length; ++i)
                {
                        this.appendChild(arguments[i]);
                }
        }
        else
        {
                this.assertHasClass('NamedEntityAnchor');
        }
}

module.exports = NamedEntityAnchor;
require('inherits')(NamedEntityAnchor, StateAnchor);

Object.defineProperty(NamedEntityAnchor.prototype, 'entityId', {
        get: function()
        {
                return this.getAttr('data-entity-id');
        }
});

Object.defineProperty(NamedEntityAnchor.prototype, 'namedEntityId', {
        get: function()
        {
                var id = this.getAttr('data-named-entity-id');

                if (!id)
                {
                        id = this.entityId;
                }

                return id;
        }
});

Object.defineProperty(NamedEntityAnchor.prototype, 'namedEntityState', {
        get: function()
        {
                return this.state && this.state[2];
        },
        set: function(val)
        {
                if (!val)
                {
                        this.state = null;
                        return;
                }

                this.state = ['page', new this.router.NamedEntity(this.namedEntityId), val];
        }
});

// used to update the href as needed
NamedEntityAnchor.prototype.attachContext = P.method(function(contextManager)
{
        if (this._shareContext)
        {
                this._shareContext._onOp = null;
                this._shareContext.destroy();
                this._shareContext = null;
        }

        if (!contextManager)
        {
                return false;
        }

        // assume the manager is bound to an id
        return contextManager.get()
        .bind(this)
        .then(function(context)
        {
                this._shareContext = context;
                this._shareContext._onOp = this._contextOnOp.bind(this); // _onOp(opData.op)

                return true;
        });
});

NamedEntityAnchor.prototype._contextOnOp = function(components)
{
        components.forEach(function(comp)
        {
                if (comp.p[0] !== 'namedEntityId')
                {
                        // not for me
                        return;
                }

                this.handleOperationComponent(comp);
        }, this);
};

NamedEntityAnchor.prototype.handleOperationComponent = function(comp)
{
        if ('oi' in comp)
        {
                this.attr('data-named-entity-id', comp.oi);
        }
        else if ('od' in comp) // only a remove
        {
                this.attr('data-named-entity-id', null);
        }

        // refresh
        this.namedEntityState = this.namedEntityState;
};
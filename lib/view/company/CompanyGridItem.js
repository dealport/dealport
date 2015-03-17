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
var domv = require('domv');
var P = require('bluebird');

var CompanyHeader = require('./CompanyHeader');
var EditableBooleanText = require('./../editing/EditableBooleanText');

require('static-reference')('./style/CompanyGridItem.less');

function CompanyGridItem(node, urlStateMap, company)
{
        domv.Component.call(this, node, 'li');
        this.urlStateMap = urlStateMap;

        if (this.isCreationConstructor(node))
        {
                this.cls('CompanyGridItem');

                var div = this.shorthand('div');

                this.attr('data-id', company._id);

                this.appendChild(
                        this.header = new CompanyHeader(this.document, urlStateMap, company),
                        div('bottomButtons',
                                this.visible = new EditableBooleanText(this.document, company.visible, '✗ hidden', '✓ visible').cls('visible')
                        )
                );

                if (company.editableByCurrentUser)
                {
                        this.cls('canEdit');
                }
                else
                {
                        this.visible.style.display = 'none';
                }
        }
        else
        {
                this.assertHasClass('CompanyGridItem');
                this.header = this.assertSelector('> .CompanyHeader', CompanyHeader, urlStateMap);
                this.visible = this.assertSelector('> .bottomButtons > .visible', EditableBooleanText);
        }

        this.on('click', this._onClick);
}

module.exports = CompanyGridItem;
require('inherits')(CompanyGridItem, domv.Component);

Object.defineProperty(CompanyGridItem.prototype, 'id', {
        get: function()
        {
                return this.getAttr('data-id');
        }
});

Object.defineProperty(CompanyGridItem.prototype, 'canEdit', {
        get: function()
        {
                return this.hasClass('canEdit');
        },
        set: function(value)
        {
                return this.toggleClass('canEdit', value);
        }
});

Object.defineProperty(CompanyGridItem.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.header.editing = value;
                this.visible.editing = value;
        }
});

CompanyGridItem.prototype._onClick = function(e)
{
        if (this.editing)
        {
                return;
        }

        if (domv.isLeftMouseButton(e))
        {
                if (this.header.titleLink.trigger())
                {
                        e.preventDefault();
                }
        }
};

CompanyGridItem.prototype.attachEditingContexts = P.method(function(contextManager)
{
        contextManager = contextManager && contextManager.bind('company', this.id);

        return P.join(
                this.header.attachEditingContexts(contextManager),
                this.visible.attachEditingContext('visible', contextManager)
        );
});
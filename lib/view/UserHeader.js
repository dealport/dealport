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
var domv = require('domv');
var P = require('bluebird');

var NamedEntityAnchor = require('./NamedEntityAnchor');
var EditablePlainText = require('./editing/EditablePlainText');
//require('static-reference')('./style/UserHeader.less');

function UserHeader(node, router, user)
{
        domv.Component.call(this, node, 'div');

        this.router = router;

        if (this.isCreationConstructor(node))
        {
                var h2 = this.shorthand('h2');

                this.cls('UserHeader');
                this.attr('data-id', user._id);

                this.appendChild(
                        h2('title',
                                this.titleLink = new NamedEntityAnchor(
                                        this.document,
                                        router,
                                        user,
                                        'none',
                                        this.titleText = new EditablePlainText(
                                                this.document,
                                                'span',
                                                false,
                                                user.displayName + ''
                                        )
                                )
                        )
                );

        }
        else
        {
                this.assertHasClass('UserHeader');
                this.titleLink = this.assertSelector('> .title > .NamedEntityAnchor', NamedEntityAnchor, router);
                this.titleText = this.titleLink.assertSelector('> .EditablePlainText', EditablePlainText);
        }

        this.on('domv-stateselect', this._onStateSelect);
}

module.exports = UserHeader;
require('inherits')(UserHeader, domv.Component);

Object.defineProperty(UserHeader.prototype, 'id', {
        get: function()
        {
                return this.getAttr('data-id');
        }
});

/*
UserHeader.prototype.setValues = function(user)
{
        if ('namedEntityId' in user)
        {
                this.titleLink.state = ['page', new this.router.NamedEntity(user.namedEntityId), 'none'];
        }

        if ('displayName' in user)
        {
                this.titleText.value = user.displayName;
        }
};
*/

Object.defineProperty(UserHeader.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.titleText.editing = value;
        }
});

UserHeader.prototype._onStateSelect = function(e)
{
        if (this.editing)
        {
                e.stopPropagation();
                e.preventDefault();
        }
};

UserHeader.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        contextFactory = contextFactory && contextFactory.bind('user', this.id);

        return P.join(
                this.titleText.attachEditingContext('displayName', contextFactory),
                this.titleLink.attachContext(contextFactory)
        );
});

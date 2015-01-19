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

var UserHeader = require('../UserHeader');

//require('static-reference')('./style/UserDetailPage.less');

function UserDetailPage(node, router, user)
{
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('UserDetailPage');
                this.attr('data-id', user._id);

                this.appendChild(
                        this.header = new UserHeader(this.document, router, user)
                );

        }
        else
        {
                this.assertHasClass('UserDetailPage');
                this.header = this.assertSelector('> .UserHeader', UserHeader, router);
        }
}

module.exports = UserDetailPage;
require('inherits')(UserDetailPage, domv.Component);

Object.defineProperty(UserDetailPage.prototype, 'id', {
        get: function()
        {
                return this.getAttr('data-id');
        }
});


UserDetailPage.prototype.setValues = function(company)
{
        this.header.setValues(company);
};

UserDetailPage.prototype.getValues = function(since)
{
        return this.header.getValues(since);
};

Object.defineProperty(UserDetailPage.prototype, 'editing', {
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
        }
});
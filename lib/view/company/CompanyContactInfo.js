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

var CompanyContactTable = require('./CompanyContactTable');

require('static-reference')('./style/CompanyContactInfo.less');

function CompanyContactInfo(node, company)
{
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                var h3 = this.shorthand('h3');

                this.cls('CompanyContactInfo');

                this.appendChild(
                        h3('title', 'Contact Info'),
                        this.table = new CompanyContactTable(this.document, company)
                );
        }
        else
        {
                this.assertHasClass('CompanyContactInfo');
                this.table = this.assertSelector('> .CompanyContactTable', CompanyContactTable);
        }
}

module.exports = CompanyContactInfo;
require('inherits')(CompanyContactInfo, domv.Component);

Object.defineProperty(CompanyContactInfo.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.table.editing = value;
        }
});

CompanyContactInfo.prototype.attachEditingContexts = P.method(function(contextManager)
{
        return this.table.attachEditingContexts(contextManager);
});
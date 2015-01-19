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

//require('static-reference')('./style/CompanyContactTable.less');
var CaptionedValuesTable = require('./CaptionedValuesTable');

var EditableAutoLink = require('./editing/EditableAutoLink');

function CompanyContactTable(node, company)
{
        CaptionedValuesTable.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('CompanyContactTable');

                this.addRow('homepage',
                        'Homepage',
                        this.homepage = new EditableAutoLink(this.document, company.homepage || '')
                );

                this.homepage.attr('rel', 'nofollow');
        }
        else
        {
                this.assertHasClass('CompanyContactTable');
                this.homepage = this.rows.homepage.assertSelector('> .EditableAutoLink', EditableAutoLink);
        }
}

module.exports = CompanyContactTable;
require('inherits')(CompanyContactTable, CaptionedValuesTable);

Object.defineProperty(CompanyContactTable.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.homepage.editing = value;
        }
});

CompanyContactTable.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        return P.join(
                this.homepage.attachEditingContext('homepage', contextFactory)
        );
});
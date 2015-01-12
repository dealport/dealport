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

//require('static-reference')('./style/CompanyShortMetaTable.less');
var CaptionedValuesTable = require('./CaptionedValuesTable');
var EditablePlainText = require('./editing/EditablePlainText');
var EditableBooleanText = require('./editing/EditableBooleanText');

function CompanyShortMetaTable(node, router, company)
{
        CaptionedValuesTable.call(this, node);

        if (this.isCreationConstructor(node))
        {
                this.cls('CompanyShortMetaTable');

                this.addRow('revenueModel',
                        'Makes money via',
                        this.revenueModel = new EditablePlainText(this.document, 'div', false, company.revenueModel || 'Unknown')
                );

                this.addRow('hiring',
                        'Hiring',
                        this.hiring = new EditableBooleanText(this.document, company.hiring)
                );

                this.addRow('openForInvestment',
                        'Open for investment',
                        this.openForInvestment = new EditableBooleanText(this.document, company.openForInvestment)
                );
        }
        else
        {
                this.assertHasClass('CompanyShortMetaTable');

                this.revenueModel      = this.rows.revenueModel.assertSelector('> .EditablePlainText', EditablePlainText);
                this.hiring            = this.rows.hiring.assertSelector('> .EditableBooleanText', EditableBooleanText);
                this.openForInvestment = this.rows.openForInvestment.assertSelector('> .EditableBooleanText', EditableBooleanText);
        }
}

module.exports = CompanyShortMetaTable;
require('inherits')(CompanyShortMetaTable, CaptionedValuesTable);

Object.defineProperty(CompanyShortMetaTable.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.revenueModel.editing = value;
                this.hiring.editing = value;
                this.openForInvestment.editing = value;
        }
});

CompanyShortMetaTable.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        return P.join(
                this.revenueModel.attachEditingContext('revenueModel', contextFactory),
                this.hiring.attachEditingContext('hiring', contextFactory),
                this.openForInvestment.attachEditingContext('openForInvestment', contextFactory)
        );
});
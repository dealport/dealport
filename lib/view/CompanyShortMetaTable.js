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

//require('static-reference')('./style/CompanyShortMetaTable.less');
var EditablePlainText = require('./editing/EditablePlainText');
var EditableBooleanText = require('./editing/EditableBooleanText');

function CompanyShortMetaTable(node, router, company)
{
        domv.Component.call(this, node, 'table');

        if (this.isCreationConstructor(node))
        {
                this.cls('CompanyShortMetaTable');

                var colgroup = this.shorthand('colgroup');
                var col = this.shorthand('col');

                this.attr('data-id', company._id);

                this.appendChild(colgroup(
                        col('title'),
                        col('value')
                ));

                this.appendChild(this.tbody = this.create('tbody'));
                this.innerNode = this.tbody;


                this._addRow('revenueModel',
                        'Makes money via',
                        this.revenueModel = new EditablePlainText(this.document, 'div', false, company.revenueModel || 'Unknown')
                );

                this._addRow('hiring',
                        'Hiring',
                        this.hiring = new EditableBooleanText(this.document, company.hiring)
                );

                this._addRow('openForInvestment',
                        'Open for investment',
                        this.openForInvestment = new EditableBooleanText(this.document, company.openForInvestment)
                );
        }
        else
        {
                this.assertHasClass('CompanyShortMetaTable');
                this.tbody = this.revenueModel = this.assertSelector('> tbody');
                this.revenueModel = this.tbody.assertSelector('> .revenueModel > .value > .EditablePlainText', EditablePlainText);
                this.hiring = this.tbody.assertSelector('> .hiring > .value > .EditableBooleanText', EditableBooleanText);
                this.openForInvestment = this.tbody.assertSelector('> .openForInvestment > .value > .EditableBooleanText', EditableBooleanText);
        }
}

module.exports = CompanyShortMetaTable;
require('inherits')(CompanyShortMetaTable, domv.Component);

// (not using get/set for this because only a subset of company is stored here)
CompanyShortMetaTable.prototype.setValues = function(company)
{
        if ('revenueModel' in company)
        {
                this.revenueModel.value = company.revenueModel;
        }

        if ('hiring' in company)
        {
                this.hiring.value = company.hiring;
        }

        if ('openForInvestment' in company)
        {
                this.openForInvestment.value = company.openForInvestment;
        }
};

CompanyShortMetaTable.prototype.getValues = function(since)
{
        var values = {};

        if (this.revenueModel.isChangedByUserSince(since))
        {
                values.revenueModel = this.revenueModel.value;
        }

        if (this.hiring.isChangedByUserSince(since))
        {
                values.hiring = this.hiring.value;
        }

        if (this.openForInvestment.isChangedByUserSince(since))
        {
                values.openForInvestment = this.openForInvestment.value;
        }


        return values;
};

CompanyShortMetaTable.prototype._addRow = function(className, title, value)
{
        var tr = this.shorthand('tr');
        var td = this.shorthand('td');
        var row;

        this.appendChild(row = tr(className,
                td('title', title),
                td('value', value)
        ));
        return row;
};

Object.defineProperty(CompanyShortMetaTable.prototype, 'id', {
        get: function()
        {
                return this.getAttr('data-id');
        }
});

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
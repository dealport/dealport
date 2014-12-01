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

var CompanyGridItem = require('./CompanyGridItem');
var CompanyGridItemPlaceholder = require('./CompanyGridItemPlaceholder');

require('static-reference')('./style/CompanyGrid.less');

function CompanyGrid(node, router, companies)
{
        domv.Component.call(this, node, 'ul');

        this.router = router;
        this.companies = [];
        this.placeholders = [];

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('CompanyGrid');

                this.addCompany(companies || []);
        }
        else
        {
                this.assertHasClass('CompanyGrid');
                this.companies = this.selectorAll('> .CompanyGridItem', CompanyGridItem, router);
                this.placeholders = this.selectorAll('> .CompanyGridItemPlaceholder', CompanyGridItemPlaceholder, router);
        }
}

module.exports = CompanyGrid;
require('inherits')(CompanyGrid, domv.Component);

CompanyGrid.prototype.addCompany = function(company)
{
        if (Array.isArray(company))
        {
                company.forEach(this.addCompany, this);
                return;
        }

        var companyItem = new CompanyGridItem(this.document, this.router, company);
        if (this.placeholders.length)
        {
                this.placeholders[0].siblingBefore(companyItem);
        }
        else
        {
                this.appendChild(companyItem);
        }

        this.companies.push(companyItem);
        return companyItem;
};

CompanyGrid.prototype.addPlaceholder = function()
{
        var item = new CompanyGridItemPlaceholder(this.document, this.router);
        this.appendChild(item);
        this.placeholders.push(item);
        return item;
};

Object.defineProperty(CompanyGrid.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.companies.forEach(function(company)
                {
                        company.editing = value && company.canEdit;
                }, this);
        }
});
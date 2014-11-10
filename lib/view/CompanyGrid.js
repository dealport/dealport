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
        this.appendChild(companyItem);
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
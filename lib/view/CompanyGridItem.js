'use strict';
var domv = require('domv');

//var StateAnchor = require('../StateAnchor');
var CompanySectorsList = require('./CompanySectorsList');
var CompanyShortMetaTable = require('./CompanyShortMetaTable');

require('static-reference')('./style/CompanyGridItem.less');

function CompanyGridItem(node, router, company)
{
        domv.Component.call(this, node, 'li');

        if (this.isCreationConstructor(node))
        {
                this.cls('CompanyGridItem');

                var p = this.shorthand('p');
                var a = this.shorthand('a');
                var h2 = this.shorthand('h2');

                this.attr('data-id', company._id);

                this.appendChild(
                        h2('title',
                                a({href: company.homepage ? company.homepage + '' : null},
                                        company.name + ''
                                )
                        ),
                        p('payoff', company.payoff + ''),
                        this.sectors = new CompanySectorsList(this.document, router, company.sectors),
                        this.meta = new CompanyShortMetaTable(this.document, router, company)
                );
        }
        else
        {
                this.assertHasClass('CompanyGridItem');
                this.sectors = this.assertSelector('> .CompanySectorsList', CompanySectorsList, router);
                this.meta = this.assertSelector('> .CompanyShortMetaTable', CompanyShortMetaTable, router);
        }
}

module.exports = CompanyGridItem;
require('inherits')(CompanyGridItem, domv.Component);

Object.defineProperty(CompanyGridItem.prototype, 'id', {
        get: function()
        {
                return this.getAttr('data-id');
        }
});

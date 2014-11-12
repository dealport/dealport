'use strict';
var domv = require('domv');

//var StateAnchor = require('../StateAnchor');
var EditablePlainText = require('./editing/EditablePlainText');
var CompanyLogo = require('./CompanyLogo');
var CompanySectorsList = require('./CompanySectorsList');
var CompanyShortMetaTable = require('./CompanyShortMetaTable');

require('static-reference')('./style/CompanyGridItem.less');

function CompanyGridItem(node, router, company)
{
        domv.Component.call(this, node, 'li');

        if (this.isCreationConstructor(node))
        {
                this.cls('CompanyGridItem');

                var a = this.shorthand('a');
                var h2 = this.shorthand('h2');

                this.attr('data-id', company._id);

                this.appendChild(
                        company.logoURL ? new CompanyLogo(this.document, company) : null,
                        h2('title',
                                a({href: company.homepage ? company.homepage + '' : null},
                                        company.name + ''
                                )
                        ),
                        this.payoff = new EditablePlainText(this.document, 'p', true, (company.payoff || '') + '').cls('payoff'),
                        this.sectors = new CompanySectorsList(this.document, router, company.sectors),
                        this.meta = new CompanyShortMetaTable(this.document, router, company)
                );

                if (company.local.editableByCurrentUser)
                {
                        this.cls('canEdit');
                }
        }
        else
        {
                this.assertHasClass('CompanyGridItem');
                this.payoff = this.assertSelector('> .payoff', EditablePlainText);
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

Object.defineProperty(CompanyGridItem.prototype, 'canEdit', {
        get: function()
        {
                return this.hasClass('canEdit');
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
                this.payoff.editing = value;
        }
});
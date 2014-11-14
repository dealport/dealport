'use strict';
var domv = require('domv');

//var StateAnchor = require('../StateAnchor');
var EditablePlainText = require('./editing/EditablePlainText');
var EditableTextEnumeration = require('./editing/EditableTextEnumeration');
var CompanyLogo = require('./CompanyLogo');
var CompanyShortMetaTable = require('./CompanyShortMetaTable');

require('static-reference')('./style/CompanyGridItem.less');

function CompanyGridItem(node, router, company)
{
        domv.Component.call(this, node, 'li');

        if (this.isCreationConstructor(node))
        {
                this.cls('CompanyGridItem');

                //var a = this.shorthand('a');
                var h2 = this.shorthand('h2');

                this.attr('data-id', company._id);

                this.appendChild(
                        company.logoURL ? new CompanyLogo(this.document, company) : null,
                        h2('title',
                                this.titleLink = new EditablePlainText(
                                        this.document,
                                        'a',
                                        false,
                                        company.name + ''
                                ).attr({href: company.homepage ? company.homepage + '' : null})
                        ),
                        this.payoff = new EditablePlainText(this.document, 'p', true, (company.payoff || '') + '').cls('payoff'),
                        this.sectors = new EditableTextEnumeration(this.document, company.sectors).cls('sectors'),
                        this.meta = new CompanyShortMetaTable(this.document, router, company)
                );

                if (company.editableByCurrentUser)
                {
                        this.cls('canEdit');
                }
        }
        else
        {
                this.assertHasClass('CompanyGridItem');
                this.titleLink = this.assertSelector('> .title > a', EditablePlainText);
                this.payoff = this.assertSelector('> .payoff', EditablePlainText);
                this.sectors = this.assertSelector('> .sectors', EditableTextEnumeration);
                this.meta = this.assertSelector('> .CompanyShortMetaTable', CompanyShortMetaTable, router);
        }
}

module.exports = CompanyGridItem;
require('inherits')(CompanyGridItem, domv.Component);

// (not using get/set for this because only a subset of company is stored here)
CompanyGridItem.prototype.setValues = function(company)
{
        //todo logoUrl

        if ('homepage' in company)
        {
                this.titleLink.attr('href', company.homepage);
        }

        if ('name' in company)
        {
                this.titleLink.value = company.name;
        }

        if ('payoff' in company)
        {
                this.payoff.value = company.payoff;
        }

        if ('sectors' in company)
        {
                this.sectors.value = company.sectors;
        }

        this.meta.setValues(company);
};

CompanyGridItem.prototype.getValues = function()
{
        var values = this.meta.getValues();
        // todo logoUrl & homepage
        values.name = this.titleLink.value;
        values.payoff = this.payoff.value;
        values.sectors = this.sectors.value;
        return values;
};

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
                this.titleLink.editing = value;
                this.payoff.editing = value;
                this.meta.editing = value;
                this.sectors.editing = value;
        }
});

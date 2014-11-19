'use strict';
var domv = require('domv');

//var StateAnchor = require('../StateAnchor');
var EditablePlainText = require('./editing/EditablePlainText');
var EditablePlainAnchor = require('./editing/EditablePlainAnchor');
var EditableTextEnumeration = require('./editing/EditableTextEnumeration');
var EditableBooleanText = require('./editing/EditableBooleanText');
var CompanyLogo = require('./CompanyLogo');
var CompanyShortMetaTable = require('./CompanyShortMetaTable');

require('static-reference')('./style/CompanyGridItem.less');

function CompanyGridItem(node, router, company)
{
        domv.Component.call(this, node, 'li');

        if (this.isCreationConstructor(node))
        {
                this.cls('CompanyGridItem');

                var div = this.shorthand('div');
                var h2 = this.shorthand('h2');

                this.attr('data-id', company._id);

                this.appendChild(
                        company.logoURL ? new CompanyLogo(this.document, company) : null,
                        h2('title',
                                this.titleLink = new EditablePlainAnchor(
                                        this.document,
                                        company.name + '',
                                        company.homepage ? company.homepage + '' : null
                                ).attr({
                                        rel: 'nofollow'
                                })
                        ),
                        this.payoff = new EditablePlainText(this.document, 'p', true, (company.payoff || '') + '').cls('payoff'),
                        this.sectors = new EditableTextEnumeration(this.document, company.sectors).cls('sectors'),
                        this.meta = new CompanyShortMetaTable(this.document, router, company),
                        div('bottomButtons',
                                this.visible = new EditableBooleanText(this.document, company.visible, '✗ hidden', '✓ visible').cls('visible')
                        )
                );

                if (company.editableByCurrentUser)
                {
                        this.cls('canEdit');
                }
                else
                {
                        this.visible.style.display = 'none';
                }
        }
        else
        {
                this.assertHasClass('CompanyGridItem');
                this.titleLink = this.assertSelector('> .title > a', EditablePlainAnchor);
                this.payoff = this.assertSelector('> .payoff', EditablePlainText);
                this.sectors = this.assertSelector('> .sectors', EditableTextEnumeration);
                this.meta = this.assertSelector('> .CompanyShortMetaTable', CompanyShortMetaTable, router);
                this.visible = this.assertSelector('> .bottomButtons > .visible', EditableBooleanText);
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
                this.titleLink.hrefValue = company.homepage;
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

        if ('visible' in company)
        {
                this.visible.value = company.visible;
        }

        this.meta.setValues(company);
};

CompanyGridItem.prototype.getValues = function(since)
{
        var values = this.meta.getValues(since);
        // todo logoUrl

        if (this.titleLink.isChangedByUserSince(since))
        {
                values.name = this.titleLink.value;
                values.homepage = this.titleLink.hrefValue;
        }

        if (this.payoff.isChangedByUserSince(since))
        {
                values.payoff = this.payoff.value;
        }

        if (this.sectors.isChangedByUserSince(since))
        {
                values.sectors = this.sectors.value;
        }

        if (this.visible.isChangedByUserSince(since))
        {
                values.visible = this.visible.value;
        }

        return Object.keys(values).length ? values : null;
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
        },
        set: function(value)
        {
                return this.toggleClass('canEdit', value);
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
                this.visible.editing = value;
        }
});

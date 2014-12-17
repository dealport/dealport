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

var StateAnchor = require('./StateAnchor');
var EditablePlainText = require('./editing/EditablePlainText');
var EditableTextEnumeration = require('./editing/EditableTextEnumeration');
var EditableBooleanText = require('./editing/EditableBooleanText');
var EditableImage = require('./editing/EditableImage');
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
                        this.logo = new EditableImage(this.document, 1024 * 1024, company.logoURL).cls('logo'),
                        h2('title',
                                this.titleLink = new StateAnchor(
                                        this.document,
                                        router,
                                        ['page', new router.NamedEntity(company.namedEntityId || company._id)],

                                        this.titleText = new EditablePlainText(
                                                this.document,
                                                'span',
                                                false,
                                                company.name + ''
                                        )
                                )
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
                this.logo = this.assertSelector('> .logo', EditableImage);
                this.titleLink = this.assertSelector('> .title > .StateAnchor', StateAnchor, router);
                this.titleText = this.titleLink.assertSelector('> .EditablePlainText', EditablePlainText);
                this.payoff = this.assertSelector('> .payoff', EditablePlainText);
                this.sectors = this.assertSelector('> .sectors', EditableTextEnumeration);
                this.meta = this.assertSelector('> .CompanyShortMetaTable', CompanyShortMetaTable, router);
                this.visible = this.assertSelector('> .bottomButtons > .visible', EditableBooleanText);
        }

        this.on('click', this._onClick);
        this.on('domv-stateselect', this._onStateSelect);
}

module.exports = CompanyGridItem;
require('inherits')(CompanyGridItem, domv.Component);

// (not using get/set for this because only a subset of company is stored here)
CompanyGridItem.prototype.setValues = function(company)
{
        if ('logoURL' in company)
        {
                this.logo.srcValue = company.logoURL;
        }

        if ('namedEntityId' in company)
        {
                this.titleLink.state = ['page', new this.router.NamedEntity(company.namedEntityId)];
        }

        if ('name' in company)
        {
                this.titleText.value = company.name;
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


        if (this.logo.isChangedByUserSince(since))
        {
                if (this.logo.fileValue)
                {
                        values.logoFile = this.logo.fileValue;
                }
                else if (!this.logo.isPreviewSrc)
                {
                        values.logoURL = this.logo.srcValue;
                }
                else
                {
                        values.logoURL = '';
                }
        }

        if (this.titleText.isChangedByUserSince(since))
        {
                values.name = this.titleText.value;
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
                this.logo.editing = value;
                this.titleText.editing = value;
                this.payoff.editing = value;
                this.meta.editing = value;
                this.sectors.editing = value;
                this.visible.editing = value;
        }
});

CompanyGridItem.prototype._onClick = function(e)
{
        if (this.editing)
        {
                return;
        }

        if (this.titleLink.trigger())
        {
                e.preventDefault();
        }
};

CompanyGridItem.prototype._onStateSelect = function(e)
{
        if (this.editing)
        {
                e.stopPropagation();
                e.preventDefault();
        }
};
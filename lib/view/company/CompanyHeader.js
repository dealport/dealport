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
var P = require('bluebird');

var NamedEntityAnchor = require('../NamedEntityAnchor');
var EditablePlainText = require('./../editing/EditablePlainText');
var EditableTextEnumeration = require('./../editing/EditableTextEnumeration');
var EditableImage = require('./../editing/EditableImage');
var CompanyShortMetaTable = require('./CompanyShortMetaTable');

require('static-reference')('./style/CompanyHeader.less');

function CompanyHeader(node, router, company)
{
        domv.Component.call(this, node, 'div');

        this.router = router;

        if (this.isCreationConstructor(node))
        {
                this.cls('CompanyHeader');

                var h2 = this.shorthand('h2');

                this.attr('data-id', company._id);

                var logoUrl = company.logoUploadedImage
                        ? '/uploads/image/' + company.logoUploadedImage
                        : company.logoURL;

                this.appendChild(
                        this.logo = new EditableImage(this.document, 1024 * 1024, logoUrl).cls('logo'),
                        h2('title',
                                this.titleLink = new NamedEntityAnchor(
                                        this.document,
                                        router,
                                        company,
                                        'none',
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
                        this.meta = new CompanyShortMetaTable(this.document, router, company)
                );

                if (company.editableByCurrentUser)
                {
                        this.cls('canEdit');
                }
        }
        else
        {
                this.assertHasClass('CompanyHeader');
                this.logo = this.assertSelector('> .logo', EditableImage);
                this.titleLink = this.assertSelector('> .title > .NamedEntityAnchor', NamedEntityAnchor, router);
                this.titleText = this.titleLink.assertSelector('> .EditablePlainText', EditablePlainText);
                this.payoff = this.assertSelector('> .payoff', EditablePlainText);
                this.sectors = this.assertSelector('> .sectors', EditableTextEnumeration);
                this.meta = this.assertSelector('> .CompanyShortMetaTable', CompanyShortMetaTable, router);
        }

        this.on('domv-stateselect', this._onStateSelect);
}

module.exports = CompanyHeader;
require('inherits')(CompanyHeader, domv.Component);

Object.defineProperty(CompanyHeader.prototype, 'id', {
        get: function()
        {
                return this.getAttr('data-id');
        }
});

Object.defineProperty(CompanyHeader.prototype, 'canEdit', {
        get: function()
        {
                return this.hasClass('canEdit');
        },
        set: function(value)
        {
                return this.toggleClass('canEdit', value);
        }
});

Object.defineProperty(CompanyHeader.prototype, 'editing', {
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
        }
});

CompanyHeader.prototype._onStateSelect = function(e)
{
        if (this.editing)
        {
                e.stopPropagation();
                e.preventDefault();
        }
};

CompanyHeader.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        contextFactory = contextFactory && contextFactory.bind('company', this.id);

        return P.join(
                this.logo.attachEditingContext('logoUploadedImage', contextFactory),
                this.titleText.attachEditingContext('name', contextFactory),
                this.payoff.attachEditingContext('payoff', contextFactory),
                this.sectors.attachEditingContext('sectors', contextFactory),
                this.titleLink.attachContext(contextFactory),
                this.meta.attachEditingContexts(contextFactory)
        );
});
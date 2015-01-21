/*
 * DealPort
 * Copyright (c) 2015  DealPort B.V.
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

var EditablePlainText = require('../editing/EditablePlainText');
var EditableImage = require('../editing/EditableImage');

require('static-reference')('./style/VacancyDetailPage.less');

function VacancyDetailPage(node, router, company, vacancy)
{
        domv.Component.call(this, node, 'div');
        this.router = router;

        if (this.isCreationConstructor(node))
        {
                var h2 = this.shorthand('h2');

                this.cls('VacancyDetailPage');
                this.attr('data-company-id', company._id);
                this.attr('data-id', vacancy._id);

                if (vacancy.editableByCurrentUser)
                {
                        this.cls('canEdit');
                }

                var logoUrl = company.logoUploadedImage
                        ? '/uploads/image/' + company.logoUploadedImage
                        : company.logoURL;

                this.appendChild(
                        this.logo = new EditableImage(this.document, 1024 * 1024, logoUrl).cls('logo'),
                        h2('title',
                                this.titleText = new EditablePlainText(
                                        this.document,
                                        'span',
                                        false,
                                        vacancy.title + ''
                                )
                        )
                );

        }
        else
        {
                this.assertHasClass('VacancyDetailPage');
                this.logo = this.assertSelector('> .logo', EditableImage);
                this.titleText = this.assertSelector('> .title > .EditablePlainText', EditablePlainText);
        }
}

module.exports = VacancyDetailPage;
require('inherits')(VacancyDetailPage, domv.Component);

Object.defineProperty(VacancyDetailPage.prototype, 'id', {
        get: function()
        {
                return this.getAttr('data-id');
        }
});

Object.defineProperty(VacancyDetailPage.prototype, 'companyId', {
        get: function()
        {
                return this.getAttr('data-company-id');
        }
});


Object.defineProperty(VacancyDetailPage.prototype, 'canEdit', {
        get: function()
        {
                return this.hasClass('canEdit');
        },
        set: function(value)
        {
                return this.toggleClass('canEdit', value);
        }
});

Object.defineProperty(VacancyDetailPage.prototype, 'editing', {
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
        }
});

VacancyDetailPage.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        var companyContextFactory = contextFactory && contextFactory.bind('company', this.companyId);
        contextFactory = contextFactory && contextFactory.bind('vacancy', this.id);

        return P.join(
                this.logo.attachEditingContext('logoUploadedImage', companyContextFactory),
                this.titleText.attachEditingContext('title', contextFactory)
        );
});
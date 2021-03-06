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
var VacancyAnchor = require('../vacancy/VacancyAnchor');
var NamedEntityAnchor = require('../NamedEntityAnchor');

var VacancyDescription = require('../vacancy/VacancyDescription');
var VacancyDetails = require('../vacancy/VacancyDetails');

require('static-reference')('./style/VacancyDetailPage.less');

function VacancyDetailPage(node, urlStateMap, company, vacancy)
{
        domv.Component.call(this, node, 'div');
        this.urlStateMap = urlStateMap;

        if (this.isCreationConstructor(node))
        {
                var div = this.shorthand('div');
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
                        div('header',
                                this.logoLink = new NamedEntityAnchor(
                                        this.document,
                                        urlStateMap,
                                        company,
                                        'none',
                                        this.logo = new EditableImage(this.document, 1024 * 1024, logoUrl)
                                ).cls('logo'),
                                h2('title',
                                        this.titleText = new EditablePlainText(this.document, {
                                                tagName: 'span',
                                                value: vacancy.title,
                                                placeholder: 'The title for the job vacancy'
                                        }),
                                        ' at ',
                                        this.companyLink = new NamedEntityAnchor(
                                                this.document,
                                                urlStateMap,
                                                company,
                                                'none',
                                                this.companyTitle = new EditablePlainText(this.document, {
                                                        tagName: 'span',
                                                        value: company.name
                                                })
                                        ).cls('companyLink')
                                ),
                                this.teaserText = new EditablePlainText(this.document, {
                                        tagName: 'span',
                                        value: vacancy.teaser,
                                        placeholder: 'A short one line teaser (shown in search results)'
                                }).cls('teaser')
                        ),
                        div('content',
                                this.desc = new VacancyDescription(this.document, vacancy),
                                this.details = new VacancyDetails(this.document, vacancy)
                        ),
                        div('footerStuff',
                                this.removeButton = new VacancyAnchor(
                                        this.document,
                                        urlStateMap,
                                        company,
                                        vacancy,
                                        'remove',
                                        '[ remove this job vacancy ]'
                                ).cls('removeButton')
                        )
                );

        }
        else
        {
                this.assertHasClass('VacancyDetailPage');
                this.logoLink = this.assertSelector('> .header > .logo', NamedEntityAnchor, urlStateMap);
                this.logo = this.logoLink.assertSelector('> .EditableImage', EditableImage);

                this.titleText = this.assertSelector('> .header > .title > .EditablePlainText', EditablePlainText);
                this.companyLink = this.assertSelector('> .header .title > .companyLink', NamedEntityAnchor, urlStateMap);
                this.companyTitle = this.companyLink.assertSelector('> .EditablePlainText', EditablePlainText);

                this.teaserText = this.assertSelector('> .header > .teaser', EditablePlainText);
                this.desc = this.assertSelector('> .content > .VacancyDescription', VacancyDescription);
                this.details = this.assertSelector('> .content > .VacancyDetails', VacancyDetails);
                this.removeButton = this.assertSelector('> .footerStuff > .removeButton', VacancyAnchor, urlStateMap);
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
                // do not edit the company logo here (users might mistakenly assume they
                // are only editing the logo for this vacancy)
                this.titleText.editing = value;
                this.teaserText.editing = value;
                this.desc.editing = value;
                this.details.editing = value;
        }
});

VacancyDetailPage.prototype.attachEditingContexts = P.method(function(contextManager)
{
        var companyContextManager = contextManager && contextManager.bind('company', this.companyId);
        contextManager = contextManager && contextManager.bind('vacancy', this.id);

        return P.join(
                this.logoLink.attachContext(companyContextManager),
                this.logo.attachEditingContext('logoUploadedImage', companyContextManager),
                this.companyLink.attachContext(companyContextManager),
                this.companyTitle.attachEditingContext('name', companyContextManager),

                this.titleText.attachEditingContext('title', contextManager),
                this.teaserText.attachEditingContext('teaser', contextManager),
                this.desc.attachEditingContexts(contextManager),
                this.details.attachEditingContexts(contextManager),
                this.removeButton.attachContext(contextManager)
        );
});
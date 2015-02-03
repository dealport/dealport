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
var VacancyAnchor = require('../vacancy/VacancyAnchor');
var CompanyHeader = require('../company/CompanyHeader');

var VacancyDescription = require('../vacancy/VacancyDescription');
var VacancyDetails = require('../vacancy/VacancyDetails');

require('static-reference')('./style/VacancyDetailPage.less');

function VacancyDetailPage(node, router, company, vacancy)
{
        domv.Component.call(this, node, 'div');
        this.router = router;

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

                this.appendChild(
                        div('header',
                                this.companyHeader = new CompanyHeader(this.document, router, company, false),

                                h2('title',
                                        this.titleText = new EditablePlainText(
                                                this.document,
                                                'span',
                                                false,
                                                vacancy.title + ''
                                        )
                                ),
                                this.teaserText = new EditablePlainText(
                                        this.document,
                                        'span',
                                        false,
                                        vacancy.teaser + ''
                                ).cls('teaser')
                        ),
                        div('content',
                                this.desc = new VacancyDescription(this.document, vacancy),
                                this.details = new VacancyDetails(this.document, vacancy)
                        ),
                        div('footerStuff',
                                this.removeButton = new VacancyAnchor(
                                        this.document,
                                        router,
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
                this.companyHeader = this.assertSelector('> .header > .CompanyHeader', CompanyHeader, router);
                this.titleText = this.assertSelector('> .header > .title > .EditablePlainText', EditablePlainText);
                this.teaserText = this.assertSelector('> .header > .teaser', EditablePlainText);
                this.desc = this.assertSelector('> .content > .VacancyDescription', VacancyDescription);
                this.details = this.assertSelector('> .content > .VacancyDetails', VacancyDetails);
                this.removeButton = this.assertSelector('> .footerStuff > .removeButton', VacancyAnchor, router);
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

VacancyDetailPage.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        var companyContextFactory = contextFactory && contextFactory.bind('company', this.companyId);
        contextFactory = contextFactory && contextFactory.bind('vacancy', this.id);

        return P.join(
                this.companyHeader.attachEditingContexts(companyContextFactory),

                this.titleText.attachEditingContext('title', contextFactory),
                this.teaserText.attachEditingContext('teaser', contextFactory),
                this.desc.attachEditingContexts(contextFactory),
                this.details.attachEditingContexts(contextFactory),
                this.removeButton.attachContext(contextFactory)
        );
});
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
var CompanyHeader = require('../company/CompanyHeader');
var CompanyContactInfo = require('../company/CompanyContactInfo');
var CompanyProduct = require('../company/CompanyProduct');
var CompanyVacancyList = require('../company/CompanyVacancyList');

require('static-reference')('./style/CompanyDetailPage.less');

function CompanyDetailPage(node, router, company, vacancies)
{
        domv.Component.call(this, node, 'div');
        this.router = router;

        if (this.isCreationConstructor(node))
        {
                var div = this.shorthand('div');

                this.cls('CompanyDetailPage');
                this.attr('data-id', company._id);
                this.appendChild(
                        this.header = new CompanyHeader(this.document, router, company),
                        this.contact = new CompanyContactInfo(this.document, company),
                        this.product = new CompanyProduct(this.document, company),
                        this.vacancies = new CompanyVacancyList(this.document, router, company, vacancies),
                        div('footerStuff',
                                this.removeButton = new NamedEntityAnchor(
                                        this.document,
                                        router,
                                        company,
                                        'remove',
                                        '[ remove this company ]'
                                ).cls('removeButton')
                        )
                );

                if (company.editableByCurrentUser)
                {
                        this.cls('canEdit');
                }
        }
        else
        {
                this.assertHasClass('CompanyDetailPage');
                this.header = this.assertSelector('> .CompanyHeader', CompanyHeader, router);
                this.contact = this.assertSelector('> .CompanyContactInfo', CompanyContactInfo);
                this.product = this.assertSelector('> .CompanyProduct', CompanyProduct);
                this.vacancies = this.assertSelector('> .CompanyVacancyList', CompanyVacancyList, router);
                this.removeButton = this.assertSelector('> .footerStuff > .removeButton', NamedEntityAnchor, router);
        }
}

module.exports = CompanyDetailPage;
require('inherits')(CompanyDetailPage, domv.Component);

Object.defineProperty(CompanyDetailPage.prototype, 'id', {
        get: function()
        {
                return this.getAttr('data-id');
        }
});

Object.defineProperty(CompanyDetailPage.prototype, 'canEdit', {
        get: function()
        {
                return this.hasClass('canEdit');
        },
        set: function(value)
        {
                return this.toggleClass('canEdit', value);
        }
});

Object.defineProperty(CompanyDetailPage.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.header.editing = value;
                this.product.editing = value;
                this.contact.editing = value;
                this.vacancies.editing = value;
        }
});

CompanyDetailPage.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        contextFactory = contextFactory && contextFactory.bind('company', this.id);
        return P.join(
                this.header.attachEditingContexts(contextFactory),
                this.contact.attachEditingContexts(contextFactory),
                this.product.attachEditingContexts(contextFactory),
                this.vacancies.attachEditingContexts(contextFactory),
                this.removeButton.attachContext(contextFactory)
        );
});

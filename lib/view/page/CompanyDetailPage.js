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

function CompanyDetailPage(node, urlStateMap, company, vacancies)
{
        domv.Component.call(this, node, 'div');
        this.urlStateMap = urlStateMap;

        if (this.isCreationConstructor(node))
        {
                var div = this.shorthand('div');

                this.cls('CompanyDetailPage');
                this.attr('data-id', company._id);
                this.appendChild(
                        div('left',
                                this.header = new CompanyHeader(this.document, urlStateMap, company),
                                this.contact = new CompanyContactInfo(this.document, company),
                                this.product = new CompanyProduct(this.document, company)
                        ),
                        div('right',
                                this.vacancies = new CompanyVacancyList(this.document, urlStateMap, company, vacancies)
                        ),
                        div('footerStuff',
                                this.removeButton = new NamedEntityAnchor(
                                        this.document,
                                        urlStateMap,
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
                this.header = this.assertSelector('> .left > .CompanyHeader', CompanyHeader, urlStateMap);
                this.contact = this.assertSelector('> .left > .CompanyContactInfo', CompanyContactInfo);
                this.product = this.assertSelector('> .left > .CompanyProduct', CompanyProduct);
                this.vacancies = this.assertSelector('> .right > .CompanyVacancyList', CompanyVacancyList, urlStateMap);
                this.removeButton = this.assertSelector('> .footerStuff > .removeButton', NamedEntityAnchor, urlStateMap);
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
                // (do not edit vacancies here, this is confusing)
        }
});

CompanyDetailPage.prototype.attachEditingContexts = P.method(function(contextManager)
{
        contextManager = contextManager && contextManager.bind('company', this.id);
        return P.join(
                this.header.attachEditingContexts(contextManager),
                this.contact.attachEditingContexts(contextManager),
                this.product.attachEditingContexts(contextManager),
                this.vacancies.attachEditingContexts(contextManager),
                this.removeButton.attachContext(contextManager)
        );
});

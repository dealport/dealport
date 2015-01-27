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
var EditableDropDown = require('../editing/EditableDropDown');
var VacancyAnchor = require('../vacancy/VacancyAnchor');

require('static-reference')('./style/CompanyVacancyListItem.less');

var jobClassificationData = require('../../resource/static/job-classification.json').value;
var salaryRangeData = require('../../resource/static/salary-range.json').value.euro;

function CompanyVacancyListItem(node, router, company, vacancy)
{
        domv.Component.call(this, node, 'li');

        if (this.isCreationConstructor(node))
        {
                var h2 = this.shorthand('h2');

                this.cls('CompanyVacancyListItem');
                this.attr('data-company-id', company._id);
                this.attr('data-id', vacancy._id);
                this.toggleClass('canEdit', vacancy.editableByCurrentUser);

                this.appendChild(
                        this.link = new VacancyAnchor(
                                this.document,
                                router,
                                company,
                                vacancy,

                                h2('title',
                                        this.titleText = new EditablePlainText(
                                                this.document,
                                                'span',
                                                false,
                                                vacancy.title + ''
                                        )
                                ),
                                this.jobClassification = new EditableDropDown(this.document, jobClassificationData, vacancy.jobClassification).cls('jobClassification'),
                                this.salaryRange = new EditableDropDown(this.document, salaryRangeData, vacancy.salaryRange).cls('salaryRange')
                        )
                );
        }
        else
        {
                this.assertHasClass('CompanyVacancyListItem');
                this.link = this.assertSelector('> .VacancyAnchor', VacancyAnchor, router);
                this.titleText = this.link.assertSelector('> .title > .EditablePlainText', EditablePlainText);
                this.jobClassification = this.link.assertSelector('> .jobClassification', EditableDropDown, jobClassificationData);
                this.salaryRange = this.link.assertSelector('> .salaryRange', EditableDropDown, salaryRangeData);
        }
}

module.exports = CompanyVacancyListItem;
require('inherits')(CompanyVacancyListItem, domv.Component);


Object.defineProperty(CompanyVacancyListItem.prototype, 'id', {
        get: function()
        {
                return this.getAttr('data-id');
        }
});

Object.defineProperty(CompanyVacancyListItem.prototype, 'companyId', {
        get: function()
        {
                return this.getAttr('data-company-id');
        }
});

Object.defineProperty(CompanyVacancyListItem.prototype, 'canEdit', {
        get: function()
        {
                return this.hasClass('canEdit');
        },
        set: function(value)
        {
                return this.toggleClass('canEdit', value);
        }
});

Object.defineProperty(CompanyVacancyListItem.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.titleText.editing = value;
                this.jobClassification.editing = value;
                this.salaryRange.editing = value;
        }
});

CompanyVacancyListItem.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        //var companyContextFactory = contextFactory && contextFactory.bind('company', this.companyId);
        contextFactory = contextFactory && contextFactory.bind('vacancy', this.id);

        return P.join(
                this.link.attachContext(contextFactory),
                this.titleText.attachEditingContext('title', contextFactory),
                this.jobClassification.attachEditingContext('jobClassification', contextFactory),
                this.salaryRange.attachEditingContext('salaryRange', contextFactory)
        );
});
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
var EditableTextEnumeration = require('../editing/EditableTextEnumeration');
var EditableDropDown = require('../editing/EditableDropDown');

require('static-reference')('./style/VacancyDetails.less');

var jobClassificationData = require('../../resource/static/job-classification.json').value;
var salaryRangeData = require('../../resource/static/salary-range.json').value.euro;
var jobRoleData = require('../../resource/static/job-role.json').value;

function VacancyDetails(node, vacancy)
{
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                var div = this.shorthand('div');
                var h3 = this.shorthand('h3');
                var h4 =  this.shorthand('h4');

                this.cls('VacancyDetails');
                this.appendChild(
                        h3('title', 'Details'),

                        h4('', 'Skills'),
                        this.skills = new EditableTextEnumeration(this.document, vacancy.skills).cls('skills'),

                        h4('', 'Your role'),
                        div(
                                this.primaryRole = new EditableDropDown(this.document, jobRoleData, vacancy.primaryRole).cls('primaryRole'),
                                this.secondaryRole = new EditableDropDown(this.document, jobRoleData, vacancy.secondaryRole).cls('secondaryRole')
                        ),

                        h4('', 'Location'),
                        this.location = new EditablePlainText(this.document, 'p', false, vacancy.location).cls('location'),

                        h4('', 'Compensation'),
                        div(
                                this.jobClassification = new EditableDropDown(this.document, jobClassificationData, vacancy.jobClassification).cls('jobClassification'),
                                this.salaryRange = new EditableDropDown(this.document, salaryRangeData, vacancy.salaryRange).cls('salaryRange')
                        )
                );
        }
        else
        {
                this.assertHasClass('VacancyDetails');
                this.skills = this.assertSelector('> .skills', EditableTextEnumeration);
                this.location = this.assertSelector('> .location', EditablePlainText);
                this.jobClassification = this.assertSelector('> div > .jobClassification', EditableDropDown, jobClassificationData);
                this.salaryRange = this.assertSelector('> div > .salaryRange', EditableDropDown, salaryRangeData);
                this.primaryRole = this.assertSelector('> div > .primaryRole', EditableDropDown, jobRoleData);
                this.secondaryRole = this.assertSelector('> div > .secondaryRole', EditableDropDown, jobRoleData);
        }
}

module.exports = VacancyDetails;
require('inherits')(VacancyDetails, domv.Component);


Object.defineProperty(VacancyDetails.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.skills.editing = value;
                this.location.editing = value;
                this.jobClassification.editing = value;
                this.salaryRange.editing = value;
                this.primaryRole.editing = value;
                this.secondaryRole.editing = value;
        }
});

VacancyDetails.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        return P.join(
                this.skills.attachEditingContext('skills', contextFactory),
                this.location.attachEditingContext('location', contextFactory),
                this.jobClassification.attachEditingContext('jobClassification', contextFactory),
                this.salaryRange.attachEditingContext('salaryRange', contextFactory),
                this.primaryRole.attachEditingContext('primaryRole', contextFactory),
                this.secondaryRole.attachEditingContext('secondaryRole', contextFactory)
        );
});
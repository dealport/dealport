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
//var domv = require('domv');
var P = require('bluebird');

var StateAnchor = require('../StateAnchor');
//require('static-reference')('./style/VacancyAnchor.less');

function VacancyAnchor(node, urlStateMap, company, vacancy, vacancyState, content)
{
        StateAnchor.call(this, node, urlStateMap);

        this.urlStateMap = urlStateMap;
        this._shareContextCompany = null;
        this._shareContextVacancy = null;

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('VacancyAnchor');
                this.attr('data-company-id', company._id);
                this.attr('data-vacancy-id', vacancy._id);
                this.attr('data-company-name', company.namedEntityId || company._id);
                this.attr('data-vacancy-name', vacancy.name || vacancy._id);

                this.vacancyState = vacancyState;

                for (var i = 5; i < arguments.length; ++i)
                {
                        this.appendChild(arguments[i]);
                }
        }
        else
        {
                this.assertHasClass('VacancyAnchor');

        }
}

module.exports = VacancyAnchor;
require('inherits')(VacancyAnchor, StateAnchor);

Object.defineProperty(VacancyAnchor.prototype, 'vacancyState', {
        get: function()
        {
                return this.state && this.state[2];
        },
        set: function(val)
        {
                if (!val)
                {
                        this.state = null;
                        return;
                }

                var namedVacancy = new this.urlStateMap.NamedVacancy(
                        this.getAttr('data-company-name'),
                        this.getAttr('data-vacancy-name')
                );
                this.state = ['page', namedVacancy, val];
        }
});

// used to update the href as needed
VacancyAnchor.prototype.attachContext = P.method(function(contextManager)
{
        if (this._shareContextCompany)
        {
                this._shareContextCompany._onOp = null;
                this._shareContextCompany.destroy();
                this._shareContextCompany = null;
        }

        if (this._shareContextVacancy)
        {
                this._shareContextVacancy._onOp = null;
                this._shareContextVacancy.destroy();
                this._shareContextVacancy = null;
        }

        if (!contextManager)
        {
                return false;
        }

        return P.join(
                contextManager.get('company', this.getAttr('data-company-id')),
                contextManager.get('vacancy', this.getAttr('data-vacancy-id'))
        )
        .bind(this)
        .spread(function(companyContext, vacancyContext)
        {
                this._shareContextCompany = companyContext;
                this._shareContextCompany._onOp = this._contextOnOp.bind(this, 'company');
                this._shareContextVacancy = vacancyContext;
                this._shareContextVacancy._onOp = this._contextOnOp.bind(this, 'vacancy');

                return true;
        });
});

VacancyAnchor.prototype._contextOnOp = function(collection, components)
{
        components.forEach(function(comp)
        {
                if (collection === 'company')
                {
                        if (comp.p[0] !== 'namedEntityId')
                        {
                                return;
                        }

                        this.handleCompanyOperationComponent(comp);
                }
                else if (collection === 'vacancy')
                {
                        if (comp.p[0] !== 'name')
                        {
                                return;
                        }

                        this.handleVacancyOperationComponent(comp);
                }


        }, this);
};

VacancyAnchor.prototype.handleCompanyOperationComponent = function(comp)
{
        if ('oi' in comp)
        {
                this.attr('data-company-name', comp.oi);
        }
        else if ('od' in comp) // only a remove
        {
                this.attr('data-company-name', this.getAttr('data-company-id'));
        }

        this.vacancyState = this.vacancyState;
};

VacancyAnchor.prototype.handleVacancyOperationComponent = function(comp)
{
        if ('oi' in comp)
        {
                this.attr('data-vacancy-name', comp.oi);
        }
        else if ('od' in comp) // only a remove
        {
                this.attr('data-vacancy-name', this.getAttr('data-vacancy-id'));
        }

        this.vacancyState = this.vacancyState;
};
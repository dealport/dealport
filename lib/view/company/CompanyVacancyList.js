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

var CompanyVacancyListItem = require('./CompanyVacancyListItem');

require('static-reference')('./style/CompanyVacancyList.less');

function CompanyVacancyList(node, router, company, vacancies)
{
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                var h3 = this.shorthand('h3');
                var ul = this.shorthand('ul');

                this.cls('CompanyVacancyList');

                this.appendChild(
                        h3('title', 'Jobs'),
                        this.list = ul()
                );

                this.items = [];

                (vacancies || []).forEach(function(vacancy)
                {
                        var item = new CompanyVacancyListItem(this.document, router, company, vacancy);
                        this.items.push(item);
                        this.list.appendChild(item);
                }, this);
        }
        else
        {
                this.assertHasClass('CompanyVacancyList');
                this.list = this.assertSelector('> ul');
                this.items = this.list.selectorAll('> li', CompanyVacancyListItem, router);
        }

        this.innerNode = this.list;
}

module.exports = CompanyVacancyList;
require('inherits')(CompanyVacancyList, domv.Component);


Object.defineProperty(CompanyVacancyList.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.items.forEach(function(item)
                {
                        item.editing = item.canEdit && value;
                });
        }
});

CompanyVacancyList.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        this._contextFactory = contextFactory;

        return P.all(this.items.map(function(item)
        {
                return item.attachEditingContexts(contextFactory);
        }, this));
});
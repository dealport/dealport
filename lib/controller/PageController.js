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

var P = require('bluebird');
var clone = require('clone');
var Controller = require('stateful-controller');

var HomePageController = require('./HomePageController');
var CompanyDetailPageController = require('./CompanyDetailPageController');
var swissarmyknife = require('../swissarmyknife');

var HomePage = require('../view/page/HomePage');
var CompanyDetailPage = require('../view/page/CompanyDetailPage');


function PageController(context)
{
        Controller.call(this, context);

        this.pageView = null;
        this._acquiredContextsInState = []; // holds promises
}

require('inherits')(PageController, Controller);
module.exports = PageController;

PageController.prototype.leave = function()
{
        return P.all(this._acquiredContextsInState)
        .bind(this)
        .each(function(acquireContextResult)
        {
                acquireContextResult.destroy();
        })
        .then(function()
        {
                this._acquiredContextsInState = [];
                this.pageView.removeNode();
                this.pageView = null;
        });
};

PageController.prototype._companyAcquireContexts = function(ids)
{
        var Company = this.context.resource.Company;

        var acquire = ids
                ? Company.acquireContexts(ids)
                : Company.acquireAllContexts();

        var p = acquire
        .bind(this)
        .then(function(acquireContextResult)
        {
                acquireContextResult.addListener(this._onCompanyOp.bind(this));
                return acquireContextResult;
        });

        this._acquiredContextsInState.push(p);

        return p;
};

PageController.prototype._onCompanyOp = function(id, snapshot, components, keys)
{
        // todo really apply operations

        var set = {};

        keys.forEach(function(key)
        {
                set[key] = snapshot[key];
        });

        if (this.currentState === 'home')
        {
                console.info('Applying new data for keys ', keys, 'on company', id);

                var companyItem = this.pageView.companyGrid.companiesById[id];
                if (!companyItem)
                {
                        return;
                }

                companyItem.setValues(set);
        }
        else if (this.currentState.type === 'NamedEntity' &&
                 this.pageView &&
                 this.pageView.id === id)
        {
                console.info('Applying new data for keys ', keys, 'on company', id);

                if ('namedEntityId' in set)
                {
                        var namedEntityState = new this.context.router.NamedEntity(set.namedEntityId || id);
                        var states = this.getFullStateList(namedEntityState);
                        this.context.replaceState(states);
                }

                this.pageView.setValues(set);
        }
};

PageController.prototype.enterHome = function(state, upgrade)
{
        var doc = this.context.document;
        var Company = this.context.resource.Company;

        if (upgrade)
        {
                this.pageView = doc.assertSelector('> .HomePage', HomePage, this.context.router);

                return this._companyAcquireContexts()
                .bind(this)
                .then(function(acquireContextsResult)
                {
                        this.child = new HomePageController(this.context, this.pageView, acquireContextsResult);
                });
        }

        var acquireContextP = !this.context.server && this._companyAcquireContexts();

        return P.join(
                this.context.server ? Company.all() : acquireContextP.get('allSnapshots'),
                acquireContextP,

                function(companies, acquireContextsResult)
                {
                        companies = clone(companies, false, 1);
                        swissarmyknife.sortByStringProperty(companies, 'name');

                        var homePage = new HomePage(doc.document, this.context.router);
                        homePage.companyGrid.addCompany(companies);
                        homePage.companyGrid.addPlaceholder();

                        this.pageView = homePage;
                        doc.appendChild(homePage);
                        doc.title = homePage.title + ' :: DealPort.co';

                        this.child = new HomePageController(this.context, this.pageView, acquireContextsResult);
                }.bind(this)
        );
};

PageController.prototype.enterNamedEntity = function(namedEntityState, upgrade)
{
        var Company = this.context.resource.Company;
        var NamedEntity = this.context.resource.NamedEntity;
        var doc = this.context.document;
        // Determine which page to display based on the matching entity

        // make sure we have a child in case the named entity is not found
        this.child = new Controller.Dummy(this.context);

        if (upgrade)
        {
                this.pageView = doc.selector('> .notFound');
                if (this.pageView)
                {
                        return null;
                }

                this.pageView = doc.selector('> .CompanyDetailPage', CompanyDetailPage, this.context.router);
                if (this.pageView)
                {
                        // company
                        return this._companyAcquireContexts([this.pageView.id])
                        .bind(this)
                        .then(function(acquireContextsResult)
                        {
                                this.child = new CompanyDetailPageController(this.context, this.pageView, acquireContextsResult);
                        });
                }

                // todo also try user here

                throw Error('Unable to match a Page view');
        }

        return NamedEntity.byName(namedEntityState.name)
        .bind(this)
        .then(function(named)
        {
                if (named && named.company)
                {
                        if (this.context.server)
                        {
                                return [
                                        named,
                                        Company.ids([named.company]).get(0),
                                        null // no editing context on the server
                                ];
                        }
                        else
                        {
                                var acquireContextP = this._companyAcquireContexts([named.company]);

                                return [
                                        named,
                                        acquireContextP.get('allSnapshots').get('0'),
                                        acquireContextP
                                ];
                        }
                }

                return [named, null, null];
        })
        .spread(function(named, entity, acquireContextsResult)
        {
                if (!named ||
                    !named.company ||
                    !entity)
                {
                        if (named)
                        {
                                // database inconsistency
                                console.error('Found NamedEntity however the entity it references does not exist!', named);
                        }
                        // todo 404 header
                        this.pageView = doc.create('p', 'notFound', 'Route not found');
                        doc.appendChild(this.pageView);
                        return;
                }

                if (named.company)
                {
                        doc.title = entity.name + ' :: DealPort.co';
                        this.pageView = new CompanyDetailPage(doc.document, this.context.router, entity);
                        this.child = new CompanyDetailPageController(this.context, this.pageView, acquireContextsResult);
                        doc.appendChild(this.pageView);
                }
                else if (named.user)
                {
                        // todo
                }
        });

};
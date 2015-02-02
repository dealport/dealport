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

var swissarmyknife = require('../swissarmyknife');

var HomePageController = require('./HomePageController');
var CompanyDetailPageController = require('./CompanyDetailPageController');
var UserDetailPageController = require('./UserDetailPageController');
var VacancyDetailPageController = require('./VacancyDetailPageController');

var HomePage = require('../view/page/HomePage');
var CompanyDetailPage = require('../view/page/CompanyDetailPage');
var UserDetailPage = require('../view/page/UserDetailPage');
var VacancyDetailPage = require('../view/page/VacancyDetailPage');

function PageController(context)
{
        Controller.call(this, context);

        this.pageView = null;
        this._contextFactory = null;
}

require('inherits')(PageController, Controller);
module.exports = PageController;

PageController.prototype.beforeEnter = function()
{
        if (!this.context.server)
        {
                this._contextFactory = this.context.resource.createContextFactory();
        }

        this.context.document.on('domv-edit-state', this._onEditState, false, this);
};

PageController.prototype.afterLeave = function()
{
        var doc = this.context.document;

        doc.removeListener('domv-edit-state', this._onEditState, false, this);
        doc.editButtonEnabled = false;

        this.pageView.removeNode();
        this.pageView = null;

        this.context.document.editState = false;

        if (this._contextFactory)
        {
                this._contextFactory.destroyAll(true);
                this._contextFactory = null;
        }
};

PageController.prototype._onEditState = function(e)
{
        if (this.pageView)
        {
                this.pageView.editing = e.editState;
        }
};

// cleaned up by _contextFactory.destroyAll()
PageController.prototype._watchEntityNameChangeInState = function(collection, id)
{
        var NamedEntityState = this.context.router.NamedEntity;
        var NamedVacancyState = this.context.router.NamedVacancy;

        // todo: refactor so that this stuff lives in browser.js?
        if (!this._contextFactory)
        {
                return P.resolve();
        }

        //console.log('_watchEntityNameChangeInState', collection, id);

        // make sure the URL is updated if a named entity is updated by someone

        return this._contextFactory.get(collection, id)
        .bind(this)
        .then(function(context)
        {
                context._onOp = function(components)
                {
                        components.forEach(function(comp)
                        {
                                var replacement;

                                //console.log('_watchEntityNameChangeInState comp', collection, id, comp);

                                if (collection === 'company' || collection === 'user')
                                {
                                        if (comp.p[0] !== 'namedEntityId')
                                        {
                                                return;
                                        }

                                        var namedEntityId;

                                        if ('oi' in comp)
                                        {
                                                namedEntityId = comp.oi;
                                        }

                                        // id always works so use it as a fallback
                                        namedEntityId = namedEntityId || id;

                                        if (this.currentState.type === 'NamedEntity')
                                        {
                                                replacement = new NamedEntityState(namedEntityId);
                                        }
                                        else if (this.currentState.type === 'NamedVacancy')
                                        {
                                                replacement = new NamedVacancyState(
                                                        namedEntityId,
                                                        this.currentState.vacancyName
                                                );
                                        }
                                }
                                else if (collection === 'vacancy')
                                {
                                        if (comp.p[0] !== 'name')
                                        {
                                                return;
                                        }

                                        var vacancyName;

                                        if ('oi' in comp)
                                        {
                                                vacancyName = comp.oi;
                                        }

                                        // id always works so use it as a fallback
                                        vacancyName = vacancyName || id;

                                        if (this.currentState.type === 'NamedVacancy')
                                        {
                                                replacement = new NamedVacancyState(
                                                        this.currentState.companyName,
                                                        vacancyName
                                                );
                                        }
                                }

                                if (replacement)
                                {
                                        var states = this.getFullStateList(replacement);
                                        this.context.replaceState(states);
                                }

                        }, this);
                }.bind(this);
        });
};

PageController.prototype.enterHome = function(state, upgrade)
{
        var doc = this.context.document;
        var Company = this.context.resource.Company;

        doc.editButtonEnabled = !!this.context.user;

        if (upgrade)
        {
                this.pageView = doc.assertSelector('> .HomePage', HomePage, this.context.router);
                this.child = new HomePageController(this.context, this.pageView);
                return this.pageView.attachEditingContexts(this._contextFactory);
        }

        return Company.all(this._contextFactory)
        .bind(this)
        .then(function(companies)
        {
                // avoid modifying the array directly
                companies = clone(companies, false, 1);
                swissarmyknife.sortByStringProperty(companies, 'name');

                var homePage = new HomePage(doc.document, this.context.router);
                homePage.companyGrid.addCompany(companies);
                homePage.companyGrid.addPlaceholder();

                this.pageView = homePage;
                doc.appendChild(homePage);
                doc.title = homePage.title + ' :: DealPort.co';

                this.child = new HomePageController(this.context, this.pageView);

                return this.pageView.attachEditingContexts(this._contextFactory);
        });
};

PageController.prototype.enterNamedEntity = function(namedEntityState, upgrade)
{
        var Company = this.context.resource.Company;
        var Vacancy = this.context.resource.Vacancy;
        var User = this.context.resource.User;
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

                        return this._contextFactory.getSnapshot('company', this.pageView.id)
                        .bind(this)
                        .then(function(entity)
                        {
                                return this._enterCompanyDetail(entity, null, upgrade);
                        });
                }

                this.pageView = doc.selector('> .UserDetailPage', UserDetailPage, this.context.router);
                if (this.pageView)
                {
                        // user
                        return this._contextFactory.getSnapshot('user', this.pageView.id)
                        .bind(this)
                        .then(function(entity)
                        {
                                return this._enterUserDetail(entity, upgrade);
                        });
                }

                throw Error('Unable to match a Page view');
        } // else:

        return NamedEntity.byName(namedEntityState.name)
        .bind(this)
        .then(function(named)
        {
                if (named && named.company)
                {
                        return [
                                named,
                                Company.ids([named.company], this._contextFactory).get(0),
                                Vacancy.allCompany(named.company, this._contextFactory)
                        ];

                }
                else if (named && named.user)
                {
                        return [
                                named,
                                User.ids([named.user], this._contextFactory).get(0),
                                []
                        ];
                }

                return [named, null];
        })
        .spread(function(named, entity, vacancies)
        {
                if (!named ||
                    (!named.company && !named.user) ||
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
                        return null;
                }

                if (named.company)
                {
                        return this._enterCompanyDetail(entity, vacancies, upgrade);
                }
                else if (named.user)
                {
                        return this._enterUserDetail(entity, upgrade);
                }

                return null;
        });
};

PageController.prototype.leaveNamedEntity = function()
{
        this._companyEntity = null;
        this.pageView.removeListener('domv-add-vacancy', this._companyDetailOnAddVacancy, false, this);
};

PageController.prototype._enterCompanyDetail = P.method(function(entity, vacancies, upgrade)
{
        var doc = this.context.document;
        doc.editButtonEnabled = entity.editableByCurrentUser;
        this._companyEntity = entity;

        if (upgrade)
        {

        }
        else
        {
                doc.title = entity.name + ' :: DealPort.co';

                this.pageView = new CompanyDetailPage(
                        doc.document,
                        this.context.router,
                        entity,
                        vacancies
                );

                doc.appendChild(this.pageView);
        }

        this.child = new CompanyDetailPageController(
                this.context,
                this.pageView,
                entity
        );

        this.pageView.on('domv-add-vacancy', this._companyDetailOnAddVacancy, false, this);

        return P.join(
                this._watchEntityNameChangeInState('company', entity._id),
                this.pageView.attachEditingContexts(this._contextFactory)
        );
});

PageController.prototype._companyDetailOnAddVacancy = function(e)
{
        var Vacancy = this.context.resource.Vacancy;
        var vacancyList = e.vacancyList;

        Vacancy.newEmptyVacancy(vacancyList.companyId, this._contextFactory)
        .bind(this)
        .then(function(vacancy)
        {
                vacancyList.addVacancy(this._companyEntity, vacancy);
                this.context.document.triggerEditStateChange(true);
        });
};

PageController.prototype._enterUserDetail = function(entity, upgrade)
{
        var doc = this.context.document;
        doc.editButtonEnabled = entity.editableByCurrentUser;

        if (upgrade)
        {

        }
        else
        {
                doc.title = entity.displayName + ' :: DealPort.co';

                this.pageView = new UserDetailPage(doc.document, this.context.router, entity);
                doc.appendChild(this.pageView);

        }

        this.child = new UserDetailPageController(
                this.context,
                this.pageView,
                entity
        );

        return P.join(
                this._watchEntityNameChangeInState('user', this.pageView.id),
                this.pageView.attachEditingContexts(this._contextFactory)
        );
};

PageController.prototype.enterVacancy = function(namedVacancy, upgrade)
{
        var NamedEntity = this.context.resource.NamedEntity;
        var Company = this.context.resource.Company;
        var Vacancy = this.context.resource.Vacancy;
        var doc = this.context.document;

        if (upgrade)
        {
                this.pageView = doc.selector('> .notFound');
                if (this.pageView)
                {
                        return null;
                }

                this.pageView = doc.assertSelector('> .VacancyDetailPage', VacancyDetailPage, this.context.router);

                return P.join(
                        this._contextFactory.getSnapshot('company', this.pageView.companyId),
                        this._contextFactory.getSnapshot('vacancy', this.pageView.id)
                )
                .bind(this)
                .spread(function(company, vacancy)
                {
                        doc.editButtonEnabled = vacancy.editableByCurrentUser;
                        this.child = new VacancyDetailPageController(this.context, this.pageView, vacancy);

                        return P.join(
                                this._watchEntityNameChangeInState('vacancy', this.pageView.id),
                                this._watchEntityNameChangeInState('company', this.pageView.companyId),
                                this.pageView.attachEditingContexts(this._contextFactory)
                        );
                });
        }

        return NamedEntity.byName(namedVacancy.companyName)
        .bind(this)
        .then(function(named)
        {
                if (named && named.company)
                {
                        return [
                                named,
                                Company.ids([named.company], this._contextFactory).get(0)
                        ];

                }

                return [named, null];
        })
        .spread(function(named, company)
        {
                if (company)
                {
                        return [
                                named,
                                company,
                                Vacancy.byName(company._id, namedVacancy.vacancyName, this._contextFactory)
                        ];
                }

                return [named, company, null];
        })
        .spread(function(named, company, vacancy)
        {
                if (!named ||
                    !named.company ||
                    !company ||
                    !vacancy)
                {
                        if (named && named.company)
                        {
                                // database inconsistency
                                console.error('Found NamedEntity however the entity it references does not exist!',
                                        named);
                        }
                        // todo 404 header
                        this.pageView = doc.create('p', 'notFound', 'Route not found');
                        doc.appendChild(this.pageView);
                        return null;
                }

                doc.title = vacancy.title;
                doc.editButtonEnabled = vacancy.editableByCurrentUser;

                this.pageView = new VacancyDetailPage(doc.document, this.context.router, company, vacancy);
                doc.appendChild(this.pageView);

                this.child = new VacancyDetailPageController(this.context, this.pageView, vacancy);

                return P.join(
                        this._watchEntityNameChangeInState('vacancy', this.pageView.id),
                        this._watchEntityNameChangeInState('company', this.pageView.companyId),
                        this.pageView.attachEditingContexts(this._contextFactory)
                );
        });
};

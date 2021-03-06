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
var Controller = require('stateful-controller');

var SubmitForm = require('../view/SubmitForm');

function HomePageController(context, pageView)
{
        Controller.call(this, context);
        this.pageView = pageView;
}

require('inherits')(HomePageController, Controller);
module.exports = HomePageController;

HomePageController.prototype.enterNone = function(state, upgrade)
{
        var user = this.context.user;
        var pageView = this.pageView;

        if (user)
        {
                pageView.on('domv-stateselect', this._onStateSelectAddCompany, false, this);
        }

};

HomePageController.prototype.leaveNone = function()
{
        var pageView = this.pageView;
        pageView.removeListener('domv-stateselect', this._onStateSelectAddCompany, false, this);
};

HomePageController.prototype._onStateSelectAddCompany = function(e)
{
        var Company = this.context.resource.Company;
        var doc = this.context.document;
        var pageView = this.pageView;

        if (!this.context.user)
        {
                return;
        }

        if (e.state.length !== 3 ||
            e.state[0] !== 'page' ||
            e.state[1] !== 'home' ||
            e.state[2] !== 'submit')
        {
                return;
        }

        e.preventDefault();
        e.stopPropagation();

        P.using(this.context.document.savePendingDisposer(), function()
        {
                doc.triggerEditStateChange(true);

                return Company.newEmptyCompany()
                .bind(this)
                .then(function(company)
                {
                        return pageView.companyGrid.addCompany(company);

                }).then(function(item)
                {
                        item.editing = true;

                        if (item.outerNode.scrollIntoView)
                        {
                                item.outerNode.scrollIntoView();
                        }
                });
        }.bind(this))
        .done();
};

HomePageController.prototype._handleSubmitFormSubmit = function(e)
{
        var submitForm = this.submitForm;
        var CompanySubmit = this.context.resource.CompanySubmit;

        if (e.defaultPrevented)
        {
                return; // invalid user data
        }
        e.preventDefault();

        submitForm.setBusy();
        var data = submitForm.getAll();

        CompanySubmit.submit(data)
        .bind(this)
        .then(function()
        {
                submitForm.showThanks(this.getFullStateList('none'));
        })
        .catch(function(err)
        {
                submitForm.exceptionMessage.textContent =
                        'Sorry, something went wrong with your form submission';
                return P.reject(err);
        });
};

HomePageController.prototype.enterSubmit = function(state, upgrade)
{
        var context = this.context;
        var doc = context.document.document;
        var user = context.user;
        var pageView = this.pageView;
        var CompanySubmit = context.resource.CompanySubmit;

        if (upgrade)
        {
                this.submitForm = pageView.assertSelector('> .SubmitForm', SubmitForm, context.urlStateMap);
                this.submitForm.on('submit', this._handleSubmitFormSubmit, false, this);
                return;
        }

        context.document.faderState = this.getFullStateList('none');

        var submitForm = new SubmitForm(
                doc,
                context.urlStateMap,
                context.csrfToken,
                !user // do not show the submitter fields if a user is logged in
        );

        this.submitForm = submitForm;
        pageView.appendChild(submitForm);
        submitForm.attr('action', context.urlStateMap.toURL(this.getFullStateList()));

        if (context.csrfValid &&
            context.postData)
        {
                submitForm.setAll(context.postData);
                submitForm.cls('attemptedSubmit');
                if (submitForm.validate(true))
                {
                        submitForm.showThanks(this.getFullStateList('none'));
                        return CompanySubmit.submit(context.postData);
                }
        }

        submitForm.on('submit', this._handleSubmitFormSubmit, false, this);

        if (submitForm.outerNode.scrollIntoView)
        {
                submitForm.outerNode.scrollIntoView();
        }
};

HomePageController.prototype.leaveSubmit = function()
{
        this.submitForm.removeNode();
        this.context.document.faderState = null;
};

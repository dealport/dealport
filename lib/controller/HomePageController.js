'use strict';

var P = require('bluebird');

var Controller = require('./Controller');
var StateAnchor = require('../view/StateAnchor');
var SubmitForm = require('../view/SubmitForm');
var ga = require('../google-analytics');
var lazyTimer = require('lazy-timer');
var hrtime = require('../swissarmyknife/hrtime');

function HomePageController(context)
{
        Controller.call(this, context);

        // send database updates every 500ms
        this._onEditChange = lazyTimer(500, true, this, this._onEditChangeImpl);
        this._onEditChangeSince = 0;
}

require('inherits')(HomePageController, Controller);
module.exports = HomePageController;

HomePageController.prototype.enterNone = function(state)
{
        var doc = this.context.document;
        var router = this.context.router;
        var user = this.context.user;
        var pageView = this.parent.pageView;

        if (this.context.wrapLoadedPage)
        {
                this.editAnchor = doc.contextualMenu.selector('> .editAnchor', StateAnchor, router);
        }
        else
        {
                if (user)
                {
                        doc.contextualMenu.appendChild(
                                this.editAnchor = new StateAnchor(
                                        doc.document,
                                        router,
                                        ['page', 'home', 'edit'],
                                        '[ edit ]'
                                ).cls('editAnchor')
                        );
                }
        }

};

HomePageController.prototype.leaveNone = function()
{
        if (this.editAnchor)
        {
                this.editAnchor.removeNode();
                this.editAnchor = null;
        }
};

HomePageController.prototype.enterEdit = function(state)
{
        var doc = this.context.document;
        var router = this.context.router;
        var user = this.context.user;
        var pageView = this.parent.pageView;

        if (this.context.wrapLoadedPage)
        {
                this.editAnchor = doc.contextualMenu.selector('> .editAnchor', StateAnchor, router);
        }
        else
        {
                if (user)
                {
                        pageView.companyGrid.editing = true;
                }

                doc.contextualMenu.appendChild(
                        this.editAnchor = new StateAnchor(doc.document, router, ['page', 'home', 'none'], '[ stop editing ]').cls('editAnchor')
                );
        }

        if (user)
        {
                pageView.companyGrid.on('domv-editable-change', this._onEditChange, false, this);
        }
};

HomePageController.prototype.leaveEdit = function()
{
        var pageView = this.parent.pageView;
        pageView.companyGrid.removeListener('domv-editable-change', this._onEditChange, false, this);
        pageView.companyGrid.editing = false;
        this.context.document.lastSave = null;
        this.editAnchor.removeNode();
        this.editAnchor = null;
};

HomePageController.prototype._onEditChangeImpl = function(done)
{
        var since = this._onEditChangeSince;
        this._onEditChangeSince = hrtime();
        var Company = this.context.resource.Company;

        this.context.document.savingPending = true;

        // CompanyGridItem
        var items = this.parent.pageView.companyGrid.companies;

        P.map(items, function(item)
        {
                var values = item.getValues(since);
                if (values)
                {
                        return Company.updateCompany(item.id, values);
                }
        }).bind(this).then(function()
        {
                this.context.document.savingPending = false;
                this.context.document.lastSave = new Date();
        }).finally(done);

        // todo show message if no client side support
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

        var faderState = this.getParentsStateList();
        faderState[faderState.length-1] = 'none';

        submitForm.setBusy();
        var data = submitForm.getAll();


        CompanySubmit.submit(data)
                .then(function()
                {
                        submitForm.showThanks(faderState);
                }).catch(function(err)
                {
                        submitForm.exceptionMessage.textContent =
                        'Sorry, something went wrong with your for submission';

                        ga.logException(err);
                        console.error(err);
                });
};

HomePageController.prototype.enterSubmit = function(state)
{
        var context = this.context;
        var doc = context.document.document;
        var user = context.user;
        var pageView = this.parent.pageView;
        var CompanySubmit = context.resource.CompanySubmit;

        if (context.wrapLoadedPage)
        {
                this.submitForm = pageView.assertSelector('> .SubmitForm', SubmitForm, context.router);
                this.submitForm.on('submit', this._handleSubmitFormSubmit, false, this);
                return;
        }

        var faderState = this.getParentsStateList();
        faderState[faderState.length-1] = 'none';
        context.document.faderState = faderState;


        var submitForm = new SubmitForm(
                doc,
                context.router,
                context.csrfToken,
                !user // do not show the submitter fields if a user is logged in
        );

        this.submitForm = submitForm;
        pageView.appendChild(submitForm);
        submitForm.attr('action', context.router.stringify(this.getParentsStateList()));

        if (context.csrfValid &&
            context.postData)
        {
                submitForm.setAll(context.postData);
                submitForm.cls('attemptedSubmit');
                if (submitForm.validate(true))
                {
                        submitForm.showThanks(faderState);
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
'use strict';

//var P = require('bluebird');

var Controller = require('./Controller');
var SubmitForm = require('../view/SubmitForm');
var ga = require('../google-analytics');

function HomePageController(context)
{
        Controller.call(this, context);
}

require('inherits')(HomePageController, Controller);
module.exports = HomePageController;

HomePageController.prototype.enterNone = function(state)
{
        if (global.testAbc)
        {
                throw Error('test');
        }
        // noop
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
        var CompanySubmit = context.resource.CompanySubmit;
        var UserResource = context.resource.User;

        if (context.wrapLoadedPage)
        {
                this.submitForm = this.parent.pageView.assertSelector('> .SubmitForm', SubmitForm, context.router);
                this.submitForm.on('submit', this._handleSubmitFormSubmit.bind(this));
                return;
        }

        var faderState = this.getParentsStateList();
        faderState[faderState.length-1] = 'none';
        context.document.faderState = faderState;

        return UserResource.sessionUser().then(function(user)
        {
                var submitForm = new SubmitForm(
                        doc,
                        context.router,
                        context.csrfToken,
                        !user // do not show the submitter fields if a user is logged in
                );

                this.submitForm = submitForm;
                this.parent.pageView.appendChild(submitForm);
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

                submitForm.on('submit', this._handleSubmitFormSubmit.bind(this));

                if (submitForm.outerNode.scrollIntoView)
                {
                        submitForm.outerNode.scrollIntoView();
                }
        }.bind(this));
};

HomePageController.prototype.leaveSubmit = function()
{
        this.submitForm.removeNode();
        this.context.document.faderState = null;
};
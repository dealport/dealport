'use strict';

//var P = require('bluebird');

var Controller = require('./Controller');
var SubmitForm = require('../view/SubmitForm');

function HomePageController(context)
{
        Controller.call(this, context);
}

require('inherits')(HomePageController, Controller);
module.exports = HomePageController;

HomePageController.prototype.enterNone = function(state)
{
        // noop
};

HomePageController.prototype.enterSubmit = function(state)
{
        var context = this.context;
        var doc = context.document.document;
        var CompanySubmit = context.resource.CompanySubmit;

        if (context.wrapLoadedPage)
        {
                this.submitForm = this.parent.pageView.assertSelector('> .SubmitForm', SubmitForm, context.router);
                return;
        }

        var faderState = this.getParentsStateList();
        faderState[faderState.length-1] = 'none';
        context.document.faderState = faderState;

        var submitForm = new SubmitForm(doc, context.router, context.csrfToken);
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

        submitForm.on('submit', function(e)
        {
                if (e.defaultPrevented)
                {
                        return; // invalid user data
                }
                e.preventDefault();

                var data = submitForm.getAll();

                CompanySubmit.submit(data)
                        .then(function()
                        {
                                submitForm.showThanks(faderState);
                        }).catch(function(err)
                        {
                                submitForm.exceptionMessage.textContent =
                                        'Sorry, something went wrong with your for submission';

                                console.error(err);
                        });

        }.bind(this));

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
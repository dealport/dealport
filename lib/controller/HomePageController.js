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

        if (context.wrapLoadedPage)
        {
                this.submitForm = this.parent.pageView.assertSelector('> .SubmitForm', SubmitForm, context.router);
                return;
        }

        var faderState = this.getParentsStateList();
        faderState[faderState.length-1] = 'none';
        context.document.faderState = faderState;

        this.submitForm = new SubmitForm(doc, context.router, context.csrfToken);
        this.parent.pageView.appendChild(this.submitForm);
        this.submitForm.attr('action', context.router.stringify(this.getParentsStateList()));

        if (context.csrfValid &&
            context.postData)
        {
                this.submitForm.setAll(context.postData);
                this.submitForm.cls('attemptedSubmit');
                if (this.submitForm.validate(true))
                {
                        this.submitForm.showThanks(faderState);
                        return context.resource.CompanySubmit.submit(context.postData);
                }
        }
};

HomePageController.prototype.leaveSubmit = function()
{
        this.submitForm.removeNode();
        this.context.document.faderState = null;
};
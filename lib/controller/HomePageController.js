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
        if (this.context.wrapLoadedPage)
        {
                this.submitForm = this.parent.pageView.assertSelector('> .SubmitForm', SubmitForm);
                return;
        }

        var faderState = this.getParentsStateList();
        faderState[faderState.length-1] = 'none';
        this.context.document.faderState = faderState;

        this.submitForm = new SubmitForm(this.context.document.document, this.context.csrfToken);
        this.submitForm.attr('action', this.context.router.stringify(this.getParentsStateList()));
        this.parent.pageView.prependChild(this.submitForm);
};

HomePageController.prototype.leaveSubmit = function()
{
        this.submitForm.removeNode();
        this.context.document.faderState = null;
};
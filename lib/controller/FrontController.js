'use strict';

var Controller = require('./Controller');
var PageController = require('./PageController');
var LoginPage = require('../view/page/LoginPage');

function FrontController(context)
{
        Controller.call(this, context);
        this.pageView = null;
}

require('inherits')(FrontController, Controller);
module.exports = FrontController;

FrontController.prototype.enterPage = function(state)
{
        this.child = new PageController(this.context);
};

FrontController.prototype.enter404 = function(state)
{
        if (this.context.wrapLoadedPage)
        {

        }
        else
        {
                this.context.document.textContent = 'Route not found';
        }
};

FrontController.prototype.leave404 = function()
{
        this.context.document.textContent = '';
};

FrontController.prototype.enterLogin = function(state)
{
        var doc = this.context.document;

        if (this.context.wrapLoadedPage)
        {
                this.pageView = doc.assertSelector('> .LoginPage', LoginPage, this.context.router);
                return;
        }

        this.pageView = new LoginPage(doc.document, this.context.router);
        doc.appendChild(this.pageView);
        doc.title = this.pageView.title + ' :: DealPort.co';
};

FrontController.prototype.leaveLogin = function(state)
{
        if (this.pageView)
        {
                this.pageView.removeNode();
        }
};
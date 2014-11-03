'use strict';

//var P = require('bluebird');

var Controller = require('./Controller');

var HomePage = require('../view/page/HomePage');

function PageController(context)
{
        Controller.call(this, context);
}

require('inherits')(PageController, Controller);
module.exports = PageController;

PageController.prototype.setupPage = function(wrapSelector, Constructor)
{
        var doc = this.context.document;
        if (this.context.wrapLoadedPage)
        {
                this.pageView = doc.assertSelector(wrapSelector, Constructor, this.context.router);
        }
        else
        {
                this.pageView = new Constructor(doc.document, this.context.router);
                doc.appendChild(this.pageView);
                doc.title = this.pageView.title + ' :: DealPort.nl';
        }
        
        return this.pageView;
};

PageController.prototype.leave = function()
{
        if (this.pageView)
        {
                this.pageView.removeNode();
                this.pageView = null;
        }
};

PageController.prototype.enterHome = function(state)
{
        this.setupPage('> .HomePage', HomePage);
};

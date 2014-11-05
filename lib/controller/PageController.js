'use strict';

//var P = require('bluebird');

var swissarmyknife = require('../swissarmyknife');
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

var homePageCachePromise;
var homePageCachedClearer = swissarmyknife.lazyTimeout(5 * 60 * 1000, function(){ homePageCachePromise = null; });
PageController.prototype.enterHome = function(state)
{
        var doc = this.context.document;

        if (this.context.wrapLoadedPage)
        {
                this.pageView = doc.assertSelector('> .HomePage', HomePage, this.context.router);
                return;
        }

        var p = homePageCachePromise;
        if (!p)
        {
                p = this.context.resource.Company.all().then(function(companies)
                {
                        var homePage = new HomePage(doc.document, this.context.router);
                        homePage.companyGrid.addCompany(companies);
                        homePageCachedClearer();
                        return homePage;
                }.bind(this));
                homePageCachePromise = p;
        }

        return p.then(function(pageView)
        {
                this.pageView = pageView;
                doc.appendChild(this.pageView);
                doc.title = this.pageView.title + ' :: DealPort.nl';
        }.bind(this));
};

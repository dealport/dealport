'use strict';

//var P = require('bluebird');

var Controller = require('./Controller');
var HomePage = require('../view/page/HomePage');
var HomePageController = require('./HomePageController');

function PageController(context)
{
        Controller.call(this, context);

        this.homePageController = new HomePageController(context);
}

require('inherits')(PageController, Controller);
module.exports = PageController;

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
        var doc = this.context.document;

        this.child = this.homePageController;

        if (this.context.wrapLoadedPage)
        {
                this.pageView = doc.assertSelector('> .HomePage', HomePage, this.context.router);
                return;
        }

        return this.context.resource.Company.all().then(function(companies)
        {
                var homePage = new HomePage(doc.document, this.context.router);
                homePage.companyGrid.addCompany(companies);
                this.pageView = homePage;
                doc.appendChild(homePage);
                doc.title = homePage.title + ' :: DealPort.nl';
        }.bind(this));
};

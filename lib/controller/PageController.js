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

//var P = require('bluebird');

var Controller = require('./Controller');
var HomePageController = require('./HomePageController');

var HomePage = require('../view/page/HomePage');

function PageController(context)
{
        Controller.call(this, context);

        this.pageView = null;
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

PageController.prototype.enterHome = function(state, upgrade)
{
        var doc = this.context.document;

        this.child = this.homePageController;

        if (upgrade)
        {
                this.pageView = doc.assertSelector('> .HomePage', HomePage, this.context.router);
                return;
        }

        return this.context.resource.Company.all().then(function(companies)
        {
                var homePage = new HomePage(doc.document, this.context.router);
                homePage.companyGrid.addCompany(companies);
                homePage.companyGrid.addPlaceholder();

                this.pageView = homePage;
                doc.appendChild(homePage);
                doc.title = homePage.title + ' :: DealPort.co';
        }.bind(this));
};

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
var clone = require('clone');

var Controller = require('./Controller');
var HomePageController = require('./HomePageController');
var swissarmyknife = require('../swissarmyknife');

var HomePage = require('../view/page/HomePage');

function PageController(context)
{
        Controller.call(this, context);

        this.pageView = null;
        this.homePageController = new HomePageController(context);
        this.homePageCompanyContexts = null;
}

require('inherits')(PageController, Controller);
module.exports = PageController;

PageController.prototype.leave = function()
{
        if (this.homePageCompanyContexts)
        {
                this.homePageCompanyContexts.destroy();
                this.homePageCompanyContexts = null;
        }

        if (this.pageView)
        {
                this.pageView.removeNode();
                this.pageView = null;
        }
};

PageController.prototype._companyAcquireAllContexts = function()
{
        var Company = this.context.resource.Company;

        return Company.acquireAllContexts()
        .bind(this)
        .then(function(acquireContextResult)
        {
                this.homePageCompanyContexts = acquireContextResult;
                this.homePageCompanyContexts.onOp = this._onCompanyOp.bind(this);
                return acquireContextResult.allSnapshots;
        });
};

PageController.prototype._onCompanyOp = function(id, snapshot, components)
{
        // todo really apply operations

        var keys = components.map(function(comp)
        {
                return comp.p[0];
        });

        console.info('Applying new data for keys ', keys, 'on company', id);

        var companyItem = this.pageView.companyGrid.companiesById[id];
        if (!companyItem)
        {
                return;
        }

        var set = {};

        keys.forEach(function(key)
        {
                set[key] = snapshot[key];
        });

        companyItem.setValues(set);
};

PageController.prototype.enterHome = function(state, upgrade)
{
        var doc = this.context.document;
        var Company = this.context.resource.Company;

        this.child = this.homePageController;

        if (upgrade)
        {
                this.pageView = doc.assertSelector('> .HomePage', HomePage, this.context.router);
                return this._companyAcquireAllContexts();
        }

        var allCompaniesPromise = this.context.server
                ? Company.all()
                : this._companyAcquireAllContexts();

        return allCompaniesPromise.then(function(companies)
        {
                companies = clone(companies, false, 1);
                swissarmyknife.sortByStringProperty(companies, 'name');
                var homePage = new HomePage(doc.document, this.context.router);
                homePage.companyGrid.addCompany(companies);
                homePage.companyGrid.addPlaceholder();

                this.pageView = homePage;
                doc.appendChild(homePage);
                doc.title = homePage.title + ' :: DealPort.co';
        }.bind(this));
};

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
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

var P = require('bluebird');
var Controller = require('stateful-controller');
var RemoveConfirmation = require('../view/RemoveConfirmation');

function CompanyDetailPageController(context, pageView, company)
{
        Controller.call(this, context);
        this.pageView = pageView;
        this.company = company;
        this.removeConfirmation = null;
}

require('inherits')(CompanyDetailPageController, Controller);
module.exports = CompanyDetailPageController;

CompanyDetailPageController.prototype.enterNone = function(state, upgrade)
{
};

CompanyDetailPageController.prototype.leaveNone = function()
{
};

CompanyDetailPageController.prototype.enterRemove = function(state, upgrade)
{
        var doc = this.context.document.document;
        if (upgrade)
        {
                this.removeConfirmation = this.pageView.assertSelector('> .RemoveConfirmation', RemoveConfirmation, this.context.router);
        }
        else
        {
                this.context.document.faderState = this.getFullStateList('none');

                this.removeConfirmation = new RemoveConfirmation(doc, this.context.router, 'company', this.getFullStateList('none'));
                this.pageView.appendChild(this.removeConfirmation);
        }

        this.removeConfirmation.on('domv-remove-confirmation', this._onRemoveConfirm, false, this);
};

CompanyDetailPageController.prototype.leaveRemove = function()
{
        this.removeConfirmation.removeListener('domv-remove-confirmation', this._onRemoveConfirm, false, this);
        this.removeConfirmation.removeNode();
        this.removeConfirmation = null;
        this.context.document.faderState = null;
};

CompanyDetailPageController.prototype._onRemoveConfirm = function(e)
{
        var context = this.context;
        var companyId = this.company._id;
        this.removeConfirmation.removeListener('domv-remove-confirmation', this._onRemoveConfirm, false, this);

        P.using(context.document.savePendingDisposer(), function()
        {
                return context.resource.Company.removeCompany(companyId)
                .then(function()
                {
                        context.newState(['page', 'home', 'none']);
                });
        }).done();
};
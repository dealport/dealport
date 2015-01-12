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
var Controller = require('stateful-controller');

var NamedEntityAnchor = require('../view/NamedEntityAnchor');

function CompanyDetailPageController(context, pageView, company)
{
        Controller.call(this, context);
        this.pageView = pageView;
        this.company = company;
        this._contextFactory = null;
}

require('inherits')(CompanyDetailPageController, Controller);
module.exports = CompanyDetailPageController;

CompanyDetailPageController.prototype.beforeEnter = function()
{
        if (!this.context.server)
        {
                this._contextFactory = this.context.resource.createContextFactory('user', this.user._id);
        }
};

CompanyDetailPageController.prototype.afterLeave = function()
{
        if (this._contextFactory)
        {
                this._contextFactory.destroyAll(true);
                this._contextFactory = null;
        }
};

CompanyDetailPageController.prototype.enterNone = function(state, upgrade)
{
        var doc = this.context.document;
        var router = this.context.router;

        if (upgrade)
        {
                this.editAnchor = doc.contextualMenu.selector('> .editAnchor', NamedEntityAnchor, router);
        }
        else
        {
                if (this.company.editableByCurrentUser)
                {
                        doc.contextualMenu.appendChild(
                                this.editAnchor = new NamedEntityAnchor(
                                        doc.document,
                                        router,
                                        this.company,
                                        'edit',
                                        '[ edit ]'
                                ).cls('editAnchor')
                        );
                }
        }

        this.editAnchor.attachContext(this._contextFactory);
};

CompanyDetailPageController.prototype.leaveNone = function()
{
        if (this.editAnchor)
        {
                this.editAnchor.removeNode();
                this.editAnchor = null;
        }
};

CompanyDetailPageController.prototype.enterEdit = function(state, upgrade)
{
        var doc = this.context.document;
        var router = this.context.router;
        var user = this.context.user;
        var pageView = this.pageView;

        if (upgrade)
        {
                this.editAnchor = doc.contextualMenu.selector('> .editAnchor', NamedEntityAnchor, router);
        }
        else
        {
                if (user)
                {
                        pageView.editing = true;
                }

                doc.contextualMenu.appendChild(
                        this.editAnchor = new NamedEntityAnchor(
                                doc.document,
                                router,
                                this.company,
                                'none',
                                '[ stop editing ]'
                        ).cls('editAnchor')
                );
        }

        this.editAnchor.attachContext(this._contextFactory);
};

CompanyDetailPageController.prototype.leaveEdit = function()
{
        var pageView = this.pageView;
        //pageView.removeListener('domv-editable-change', this._onEditChange, false, this);
        pageView.editing = false;
        this.context.document.lastSave = null;
        this.editAnchor.removeNode();
        this.editAnchor = null;
};

/*
todo: logo
CompanyDetailPageController.prototype._onEditChangeImpl = function(done)
{
        var since = this._onEditChangeSince;
        var pageView = this.pageView;
        this._onEditChangeSince = hrtime();
        var acquireContextsResult = this.acquireContextsResult;
        var UploadedImage = this.context.resource.UploadedImage;

        P.using(this.context.document.savePendingDisposer(), function()
        {
                var values = pageView.getValues(since);
                if (!values)
                {
                        // nothing has been changed
                        return null;
                }

                var context = acquireContextsResult.get(pageView.id);
                if (!context)
                {
                        console.warn('Unable to update company %s, the sharejs context is missing',
                                pageView.id);
                }

                var op = Object.keys(values).map(function (key)
                {
                        var val = values[key];
                        if (key === 'logoFile')
                        {
                                return null;
                        }

                        var od;
                        if (typeof val === 'boolean')
                        {
                                od = false;
                        }
                        else if (typeof val === 'string')
                        {
                                od = '';
                        }
                        else if (typeof val === 'number')
                        {
                                od = 0;
                        }
                        else if (Array.isArray(val))
                        {
                                od = [];
                        }
                        else if (val === null)
                        {
                                od = null;
                        }
                        else
                        {
                                od = {};
                        }

                        return {
                                p : [key],
                                od: od,
                                oi: val
                        };
                }).filter(function (comp)
                {
                        return !!comp;
                });

                var logoPromise = P.resolve();
                if (values.logoFile)
                {
                        logoPromise = UploadedImage.updateCompanyLogo(pageView.id, values.logoFile);
                        values.logoFile = undefined;
                }

                return P.join(context.submitOpAsync(op), logoPromise)
                .bind(this)
                .then(function ()
                {
                        this.context.document.lastSave = new Date();
                });

        }.bind(this))
        .finally(done);

};
*/
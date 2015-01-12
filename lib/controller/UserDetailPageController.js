/*
 * DealPort
 * Copyright (c) 2015  DealPort B.V.
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

function UserDetailPageController(context, pageView, user)
{
        Controller.call(this, context);
        this.pageView = pageView;
        this.user = user;
        this._contextFactory = null;
}

require('inherits')(UserDetailPageController, Controller);
module.exports = UserDetailPageController;


UserDetailPageController.prototype.beforeEnter = function()
{
        if (!this.context.server)
        {
                this._contextFactory = this.context.resource.createContextFactory('user', this.user._id);
        }
};

UserDetailPageController.prototype.afterLeave = function()
{
        if (this._contextFactory)
        {
                this._contextFactory.destroyAll(true);
                this._contextFactory = null;
        }
};

UserDetailPageController.prototype.enterNone = function(state, upgrade)
{
        var doc = this.context.document;
        var router = this.context.router;

        if (upgrade)
        {
                this.editAnchor = doc.contextualMenu.selector('> .editAnchor', NamedEntityAnchor, router);
        }
        else
        {
                if (this.user.editableByCurrentUser)
                {
                        doc.contextualMenu.appendChild(
                                this.editAnchor = new NamedEntityAnchor(
                                        doc.document,
                                        router,
                                        this.user,
                                        'edit',
                                        '[ edit ]'
                                ).cls('editAnchor')
                        );
                }
        }

        if (this.editAnchor)
        {
                this.editAnchor.attachContext(this._contextFactory);
        }
};

UserDetailPageController.prototype.leaveNone = function()
{
        if (this.editAnchor)
        {
                this.editAnchor.removeNode();
                this.editAnchor = null;
        }
};

UserDetailPageController.prototype.enterEdit = function(state, upgrade)
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
                                this.user,
                                'none',
                                '[ stop editing ]'
                        ).cls('editAnchor')
                );
        }

        if (this.editAnchor)
        {
                this.editAnchor.attachContext(this._contextFactory);
        }
};

UserDetailPageController.prototype.leaveEdit = function()
{
        var pageView = this.pageView;
        pageView.editing = false;
        this.context.document.lastSave = null;
        this.editAnchor.removeNode();
        this.editAnchor = null;
};

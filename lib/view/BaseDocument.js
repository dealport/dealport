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
var domv = require('domv');
var LoadingThrobber = require('./LoadingThrobber.js');
var StateAnchor = require('./StateAnchor');

require('static-reference')('./style/BaseDocument.less');

function BaseDocument(node, router)
{
        domv.HtmlDocument.call(this, node);

        if (!router)
        {
                throw new domv.Exception(Error('Missing argument router'));
        }

        this.router = router;

        if (this.isCreationConstructor(node))
        {
                this.cls('BaseDocument');

                var div = this.shorthand('div');
                var span = this.shorthand('span');
                var h1 =  this.shorthand('h1');

                // CSS blocks downloading of javascript,
                // so define the javascript first (which has async=async)
                this.addJS('/bundle.js' + BaseDocument.cacheToken);
                this.addCSS('/bundle.css' + BaseDocument.cacheToken);
                this.addCSS('//fonts.googleapis.com/css?family=Open+Sans:400,700,400italic');
                /*this.head.appendChild(this.create('link', {
                        href: '/favicon.ico',
                        type: 'image/x-icon',
                        rel: 'shortcut icon'
                }));*/

                this.head.appendChild(this.create('meta', {
                         name: 'viewport',
                         content: 'width=device-width, initial-scale=1'
                }));

                this.appendChild(
                        this.fader = new StateAnchor(this.document, router).cls('fader'),
                        this.header = div('header',
                                div('wrap',
                                        div('left',
                                                this.lastSaveNode = span('lastSave'),
                                                this.savingThrobber = new LoadingThrobber(this.document, 24).cls('savingThrobber')
                                        ),
                                        div('center',
                                                this.headerTitle = h1('title')
                                        ),
                                        div('right',
                                                this.contextualMenu = span('contextualMenu'),
                                                //,
                                                ' ',
                                                this.userName = new StateAnchor(this.document, router).cls('userName'),
                                                this.loginAnchor = new StateAnchor(this.document, router, ['login'], 'login/register').cls('loginAnchor')
                                        )
                                )
                        ),
                        this.content = div('content'),
                        this.footer = div('footer',
                                div('wrap')
                        ),
                        this.loadingThrobber = new LoadingThrobber(this.document)
                );

                this.faderState = null;
                this.title = '';
                this.setUser(null);
        }
        else
        {
                this.assertHasClass('BaseDocument');
                this.fader = this.assertSelector('> .fader', StateAnchor, router);
                this.header = this.assertSelector('> .header');
                this.lastSaveNode = this.header.assertSelector('> .wrap > div > .lastSave');
                this.savingThrobber = this.header.assertSelector('> .wrap > div > .savingThrobber', LoadingThrobber);
                this.userName = this.header.assertSelector('> .wrap > div > .userName', StateAnchor, router);
                this.contextualMenu = this.header.assertSelector('> .wrap > div > .contextualMenu');
                this.loginAnchor = this.header.assertSelector('> .wrap > div > .loginAnchor', StateAnchor, router);
                this.headerTitle = this.header.assertSelector('> .wrap > div > .title');
                this.content = this.assertSelector('>.content');
                this.footer = this.assertSelector('> .footer');
                this.loadingThrobber = this.assertSelector('> .LoadingThrobber', LoadingThrobber);
        }

        this.innerNode = this.content;
}

BaseDocument.cacheToken = '?' + new Date().getTime().toString(36);

module.exports = BaseDocument;
require('inherits')(BaseDocument,  domv.HtmlDocument);


Object.defineProperty(BaseDocument.prototype, 'title', {
        configurable: true,
        get: function()
        {
                return Object.getOwnPropertyDescriptor(BaseDocument.super_.prototype, 'title').get.call(this);
        },
        set: function(value)
        {
                var headTitle = ' :: Rotterdam\'s go-to startup guide to discover new entrepreneurs and companies';
                Object.getOwnPropertyDescriptor(BaseDocument.super_.prototype, 'title').set.call(this, value + headTitle);
                this.headerTitle.textContent = value;
                this.headerTitle.attr('title', value);
        }
});

Object.defineProperty(BaseDocument.prototype, 'stateTransitionPending', {
        configurable: true,
        get: function()
        {
                return this.hasClass('stateTransitionPending');
        },
        set: function(value)
        {
                this.toggleClass('stateTransitionPending', !!value);
        }
});

Object.defineProperty(BaseDocument.prototype, 'savingPending', {
        configurable: true,
        get: function()
        {
                return this._savePending || 0;
        },
        set: function(value)
        {
                this._savePending = value || 0;
                this.toggleClass('savingPending', this._savePending > 0);
        }
});

BaseDocument.prototype.savePendingDisposer = function()
{
        ++this.savingPending;

        return P.resolve(this).disposer(function(doc)
        {
                --doc.savingPending;
        });
};

Object.defineProperty(BaseDocument.prototype, 'faderState', {
        get: function()
        {
                if (this.fader.style.display !== 'none')
                {
                        return this.fader.state;
                }

                return null;
        },
        set: function(state)
        {
                this.fader.style.display = state ? '' : 'none';
                this.fader.state = state;
        }
});

BaseDocument.prototype.setUser = function(user)
{
        // todo operations
        this.loginAnchor.style.display = user ? 'none' : null;
        this.userName.style.display = user ? null : 'none';
        this.userName.textContent = user ? user.displayName : '';
        this.userName.state = user && ['page', new this.router.NamedEntity(user.namedEntityId || user._id), 'none'];
};

Object.defineProperty(BaseDocument.prototype, 'lastSave', {
        get: function()
        {
                var time = this.lastSaveNode.getAttr('data-time');
                return time ? new Date(parseInt(time, 10)) : null;
        },
        set: function(date)
        {
                if (typeof date === 'number')
                {
                        date = new Date(date);
                }

                if (date)
                {
                        this.lastSaveNode.textContent =
                                'last save '
                                + ('0' + date.getHours()).substr(-2) // 05
                                + ':'
                                + ('0' + date.getMinutes()).substr(-2)
                                + ':'
                                + ('0' + date.getSeconds()).substr(-2);
                        this.lastSaveNode.attr('data-time', date.getTime());
                }
                else
                {
                        this.lastSaveNode.textContent = '';
                        this.lastSaveNode.attr('data-time', false);
                }
        }
});
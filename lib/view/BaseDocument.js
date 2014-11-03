'use strict';
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

        if (this.isCreationConstructor(node))
        {
                this.cls('BaseDocument');

                var div = this.shorthand('div');
                var h1 =  this.shorthand('h1');

                // CSS blocks downloading of javascript,
                // so define the javascript first (which has async=async)
                this.addJS('/bundle.js' + BaseDocument.cacheToken);
                this.addCSS('/bundle.css' + BaseDocument.cacheToken);
                /*this.head.appendChild(this.create('link', {
                        href: '/favicon.ico',
                        type: 'image/x-icon',
                        rel: 'shortcut icon'
                }));*/

                this.appendChild(
                        this.fader = new StateAnchor(this.document, router).cls('fader'),
                        this.header = div('header',
                                div('wrap',
                                        this.headerTitle = h1('title')
                                )
                        ),
                        this.content = div('content'),
                        this.footer = div('footer',
                                div('wrap',
                                        div('ik ben een footer!')
                                )
                        ),
                        this.loadingThrobber = new LoadingThrobber(this.document)
                );

                this.faderState = null;
                this.title = '';
        }
        else
        {
                this.assertHasClass('BaseDocument');
                this.fader = this.assertSelector('> .fader', StateAnchor, router);
                this.header = this.assertSelector('> .header');
                this.headerTitle = this.assertSelector('>.header > .wrap > .title');
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
                Object.getOwnPropertyDescriptor(BaseDocument.super_.prototype, 'title').set.call(this, value);
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

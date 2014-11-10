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
                this.addCSS('http://fonts.googleapis.com/css?family=Open+Sans:400,700,400italic');
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


BaseDocument.prototype.addGoogleAnalytics = function(uaCode, appName, appVersion)
{
        // insert it before our own script tags
        this.titleWrapped.siblingAfter(this.create('script', '',
                '(function(i,s,o,g,r,a,m){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){',
                '(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),',
                'm=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)',
                '})(window,document,"script","//www.google-analytics.com/analytics.js","ga");',
                'ga("create", '+JSON.stringify(uaCode)+', "auto");',
                'ga("set", "appName", '+JSON.stringify(appName)+');',
                'ga("set", "appVersion", '+JSON.stringify(appVersion)+');'
        ));
};
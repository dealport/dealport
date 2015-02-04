'use strict';

var P = require('bluebird');
var lazyTimer = require('lazy-timer');

function SharejsContextFactory(sharejs, defaultCollection, defaultId)
{
        this.sharejs = sharejs;
        this.defaultCollection = defaultCollection;
        this.defaultId = defaultId;
        this.contexts = [];
        this.children = [];
}

module.exports = SharejsContextFactory;

SharejsContextFactory.sharejsLeakFix = function(doc)
{
        // workaround for a sharejs memory leak
        var contexts = doc.editingContexts;
        for (var i = 0; i < contexts.length; i++)
        {
                if (contexts[i].remove)
                {
                        contexts.splice(i--, 1);
                }
        }
};

SharejsContextFactory.hasActiveContexts = function(doc)
{
        var contexts = doc.editingContexts;
        for (var i = 0; i < contexts.length; i++)
        {
                if (!contexts[i].remove)
                {
                        return true;
                }
        }

        return false;
};

Object.defineProperty(SharejsContextFactory.prototype, 'isSharejsContextFactory', {
        value: 1
});

SharejsContextFactory.prototype._subscribeDoc = function(collection, id)
{
        if (typeof id === 'object' &&
            '_id' in id)
        {
                // a Doc
                id = id._id;
        }

        id = id || this.defaultId;
        collection = collection || this.defaultCollection;

        if (!collection)
        {
                throw Error('Missing argument collection');
        }

        if (!id)
        {
                throw Error('Missing argument id');
        }

        var doc = this.sharejs.get(collection, id);
        doc.subscribe(); // (sharejs ignores duplicate subscriptions)
        return doc;
};

SharejsContextFactory.prototype.get = P.method(function get(collection, id)
{
        if (id === undefined)
        {
                if (collection === undefined)
                {
                        id = this.defaultId;
                        collection = this.defaultCollection;
                }
                else
                {
                        id = collection;
                        collection = this.defaultCollection;
                }
        }

        if (Array.isArray(id))
        {
                return P.all(
                        id.map(function(id)
                        {
                                return this.get(id);
                        }, this)
                );
        }

        var doc = this._subscribeDoc(collection, id);

        return doc.whenReadyAsync()
        .bind(this)
        .then(function()
        {
                var context = doc.createContext();
                this.contexts.push({doc: doc, context: context});
                return context;
        });
});

SharejsContextFactory.prototype.getSnapshot = P.method(function getSnapshot(collection, id)
{
        if (id === undefined)
        {
                if (collection === undefined)
                {
                        id = this.defaultId;
                        collection = this.defaultCollection;
                }
                else
                {
                        id = collection;
                        collection = this.defaultCollection;
                }
        }

        if (Array.isArray(id))
        {
                return P.all(
                        id.map(function(id)
                        {
                                return this.getSnapshot(collection, id);
                        }, this)
                );
        }

        var doc = this._subscribeDoc(collection, id);

        return doc.whenReadyAsync()
        .bind(this)
        .then(function()
        {
                var knowsAboutDoc = false;

                for (var i = 0; i < this.contexts.length; ++i)
                {
                        if (doc === this.contexts[i].doc)
                        {
                                knowsAboutDoc = true;
                                break;
                        }
                }

                // make sure we clean up this document on destroyAll()
                if (!knowsAboutDoc)
                {
                        var context = doc.createContext();
                        this.contexts.push({doc: doc, context: context});
                }

                return doc.snapshot;
        });
});

var lazyAutoUnsubscribe = function()
{
        if (!SharejsContextFactory.hasActiveContexts(this))
        {
                this.unsubscribe(); // does nothing if already unsubscribed
        }
};

SharejsContextFactory.prototype.destroyAll = function(unsubscribe)
{
        this.children.forEach(function(child)
        {
                child.destroyAll();
        });

        for (var i = this.contexts.length - 1; i >= 0; --i)
        {
                var doc = this.contexts[i].doc;
                var context = this.contexts[i].context;

                SharejsContextFactory.sharejsLeakFix(doc);
                context.destroy();

                if (unsubscribe)
                {
                        // this prevents unsub + sub during state transitions
                        if (!doc._lazyAutoUnsubscribe)
                        {
                                doc._lazyAutoUnsubscribe = lazyTimer(30000, false, doc, lazyAutoUnsubscribe);
                        }

                        doc._lazyAutoUnsubscribe();
                }
        }

        this.contexts.length = 0;
        this.children.length = 0;
};

SharejsContextFactory.prototype.bind = function(collection, id)
{
        if (collection === undefined)
        {
                collection = this.defaultCollection;
        }

        if (id === undefined)
        {
                id = this.defaultId;
        }
        else if (typeof id === 'object' &&
                 '_id' in id)
        {
                id = id._id;
        }

        if (collection === this.defaultCollection &&
            id === this.defaultId)
        {
                return this;
        }

        var child = new SharejsContextFactory(this.sharejs, collection, id);
        this.children.push(child);
        return child;
};


'use strict';

var P = require('bluebird');

function AcquireContextsResult(autoUnsubscribe)
{
        this.autoUnsubscribe = autoUnsubscribe;
        this._contexts = Object.create(null);
        this._docs = Object.create(null);
        this._allSnapshots = null;
        this.listeners = [];
}
module.exports = AcquireContextsResult;

function destroyOverride(doc, fn, autoUnsubscribe)
{
        return function()
        {
                fn.apply(this, arguments);

                // ensure contexts are removed immediately
                // (sharejs defers this for some reason, might be fixed in the future)
                var contexts = doc.editingContexts;
                for (var i = 0; i < contexts.length; i++)
                {
                        if (contexts[i].remove)
                        {
                                contexts.splice(i--, 1);
                        }
                }

                // automatically subscribe/unsubscribe if there are contexts present
                if (autoUnsubscribe &&
                    !contexts.length)
                {
                        doc.unsubscribe();
                }
        };
}

AcquireContextsResult.prototype.add = function(doc)
{
        var id = doc.name;
        var context = doc.createContext();

        this._contexts[id] = context;
        this._docs[id] = doc;

        context.destroy = destroyOverride(doc, context.destroy, this.autoUnsubscribe);
        context.submitOpAsync = P.promisify(context.submitOp);

        context._onOp = function(components)
        {
                var snapshot = this.getSnapshot(id);
                var keys = components.map(function(comp)
                {
                        return comp.p[0];
                });

                this.listeners.forEach(function(listener)
                {
                        listener[0].call(listener[1], id, snapshot, components, keys);
                });
        }.bind(this);
};

AcquireContextsResult.prototype.get = function(id)
{
        return this._contexts[id] || null;
};

AcquireContextsResult.prototype.getSnapshot = function(id)
{
        var doc = this._docs[id];
        return (doc && doc.getSnapshot()) || null;
};

Object.defineProperty(AcquireContextsResult.prototype, 'allSnapshots', {
        get: function()
        {
                if (!this._allSnapshots)
                {
                        this._allSnapshots = [];
                        this.each(function(id, context, snapshot)
                        {
                                this._allSnapshots.push(snapshot);
                        }, this);
                }

                return this._allSnapshots;
        }
});

AcquireContextsResult.prototype.each = function(fn, thisObj)
{
        Object.keys(this._contexts).forEach(function(id)
        {
                fn.call(
                        thisObj,
                        id,
                        this._contexts[id],
                        this._docs[id] && this._docs[id].getSnapshot()
                );
        }, this);
};

AcquireContextsResult.prototype.destroy = function()
{
        this.each(function(id, context, doc)
        {
                this._contexts[id].destroy();
        }, this);

        this.listeners = [];
        this._docs = Object.create(null);
        this._contexts = Object.create(null);
};

AcquireContextsResult.prototype.addListener = function(fn, thisObject)
{
        if (typeof fn !== 'function')
        {
                throw Error('Invalid argument');
        }

        this.listeners.push([
                fn,
                arguments.length === 1 ? this : thisObject
        ]);
};

AcquireContextsResult.prototype.removeListener = function(fn)
{
        for (var i = 0; i < this.listeners.length; ++i)
        {
                if (this.listeners[i][0] === fn)
                {
                        this.listeners.splice(i, 1);
                        return;
                }
        }
};

AcquireContextsResult.acquireContexts = function(docs, autoUnsubscribe)
{
        var ret = new AcquireContextsResult(autoUnsubscribe);
        // call AcquireContextsResult.prototype.destroy() when you are done

        docs.forEach(function(doc)
        {
                ret.add(doc);
        });

        return ret;
};
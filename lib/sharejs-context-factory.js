'use strict';

function sharejsLeakFix(doc)
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
}

function hasActiveContexts(doc)
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
}

function newContextFactory(sharejs, collection, defaultId)
{
        function contextFactory(id)
        {
                var sharejs = contextFactory.sharejs;
                var collection = contextFactory.collection;
                var contexts = contextFactory.contexts;
                id = id || contextFactory.defaultId;

                var doc = sharejs.get(collection, id);
                doc.subscribe(); // (sharejs ignores duplicate subscriptions)
                var context = doc.createContext();
                contexts.push([doc, context]);
        }

        contextFactory.sharejs = sharejs;
        contextFactory.collection = collection;
        contextFactory.defaultId = defaultId;
        contextFactory.contexts = [];
        contextFactory.children = [];

        contextFactory.destroyAll = function(unsubscribe)
        {
                var children = contextFactory.children;
                var contexts = contextFactory.contexts;

                children.forEach(function(child)
                {
                        child.destroyAll();
                });

                for (var i = contexts.length - 1; i >= 0; --i)
                {
                        var doc = contexts[i][0];
                        var context = contexts[i][1];
                        sharejsLeakFix(doc);
                        context.destroy();

                        if (unsubscribe &&
                            !hasActiveContexts(doc))
                        {
                                doc.unsubscribe(); // does nothing if already unsubscribed
                        }
                }

                contexts.length = 0;
                children.length = 0;
        };

        contextFactory.bindToId = function(id)
        {
                var child = newContextFactory(contextFactory.sharejs, contextFactory.collection, id);
                contextFactory.children.push(child);
                return child;
        };

}

module.exports = newContextFactory;
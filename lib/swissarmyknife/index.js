'use strict';

var ownProp = ({}).hasOwnProperty;

module.exports.datesFromJSON = function(columns, data)
{
        var i, column, val;

        for (i = 0; i < columns.length; ++i)
        {
                column = columns[i];
                val = data[column];

                if (ownProp.call(data, column) &&
                    val !== undefined &&
                    val !== null)
                {
                        data[column] = val && new Date(val);
                }
        }

        return data;
};

function filterDangerousDOMEach(wrapped)
{
        var node = wrapped.outerNode;
        var i;
        var attr;
        var javascriptUriRE = /[\x00-\x20]*[jl][\x00-\x20]*[ai][\x00-\x20]*v[\x00-\x20]*[ae][\x00-\x20]*s[\x00-\x20]*c[\x00-\x20]*r[\x00-\x20]*i[\x00-\x20]*p[\x00-\x20]*t[\x00-\x20]*:/ig;

        // inline svg, html+time, etc
        if (node.namespaceURI &&
            node.namespaceURI !== 'http://www.w3.org/1999/xhtml')
        {
                wrapped.removeNode();
                return;
        }

        switch (wrapped.outerNodeName)
        {
                case 'script':
                case 'style': // url(javascript:...)  expression(...)
                case 'link':
                case 'object':
                case 'embed':
                case 'meta':
                case 'iframe':
                case 'frame':
                case 'base':
                        wrapped.swapNode(null);
                        return;
        }

        for (i = node.attributes.length - 1; i >= 0; --i)
        {
                attr = node.attributes[i];

                if (/^\s*on/i.test(attr.name))
                {
                        if (attr.namespaceURI)
                        {
                                node.removeAttributeNS(attr.namespaceURI, attr.name);
                        }
                        else
                        {
                                node.removeAttribute(attr.namespaceURI, attr.name);
                        }
                        continue;
                }


                attr.value = attr.value.replace(javascriptUriRE, 'FILTERED:');

                // further issues:
                // * old IE: expression()
                // * old IE: conditional compilation
                // * css-escaped javascript uri in style attributes

        }
}

/**
 * Attempt to filter dangerous elements within a DOM node (excluding the node itself).
 * Script tags, javascript uri's, style tags, event attributes, etc.
 * Do not assume this is complete. This function is intended for input from content management.
 * Input from a random visitor should never be parsed as HTML (except maybe a strict subset of html).
 * Do not attach the node to the Document before calling this function.
 * @param {module:domv/lib/Component} wrappedNode
 */
module.exports.filterDangerousDOM = function(wrappedNode)
{
        wrappedNode.selectorAll('*').forEach(filterDangerousDOMEach);
};

module.exports.pasteHtmlAtCaret = function(window, html, selectPastedContent)
{
        var document = window.document;
        //http://stackoverflow.com/questions/6690752/insert-html-at-caret-in-a-contenteditable-div/6691294#6691294
        var sel, range;
        if (window.getSelection)
        {
                // IE9 and non-IE
                sel = window.getSelection();
                if (sel.getRangeAt && sel.rangeCount)
                {
                        range = sel.getRangeAt(0);
                        range.deleteContents();

                        // Range.createContextualFragment() would be useful here but is
                        // only relatively recently standardized and is not supported in
                        // some browsers (IE9, for one)
                        var el = document.createElement('div');
                        el.innerHTML = html;
                        var frag = document.createDocumentFragment(), node, lastNode;
                        while ( (node = el.firstChild) )
                        {
                                lastNode = frag.appendChild(node);
                        }
                        var firstNode = frag.firstChild;
                        range.insertNode(frag);

                        // Preserve the selection
                        if (lastNode)
                        {
                                range = range.cloneRange();
                                range.setStartAfter(lastNode);
                                if (selectPastedContent)
                                {
                                        range.setStartBefore(firstNode);
                                }
                                else
                                {
                                        range.collapse(true);
                                }
                                sel.removeAllRanges();
                                sel.addRange(range);
                        }
                }
        }
        else if ( (sel = document.selection) && sel.type !== 'Control')
        {
                // IE < 9
                var originalRange = sel.createRange();
                originalRange.collapse(true);
                sel.createRange().pasteHTML(html);
                if (selectPastedContent)
                {
                        range = sel.createRange();
                        range.setEndPoint('StartToStart', originalRange);
                        range.select();
                }
        }
};
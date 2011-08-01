/**
* Module contains overrides for Y.DOM.
* @module nodejs-dom-after
*/
YUI.add('nodejs-dom-after', function(Y) {
    Y.DOM.VALUE_GETTERS.button = function(node) {
        return node.getAttribute('value');
    }
    Y.DOM.VALUE_GETTERS.option = function(opt) {
        var val = opt.getAttribute('value');
        if (!opt.hasAttribute('value')) {
            val = opt.innerHTML;
        }
        return val;
    }
    Y.DOM.VALUE_GETTERS.select = function(node) {
        var si = node.selectedIndex;
        if (!node.options[si]) {
            si = 0;
        }
        var opt = node.options[si];
        var val;
        if (opt) {
            val = opt.getAttribute('value');
            if (!opt.hasAttribute('value')) {
                val = opt.innerHTML;
            }
        }
        return val;
    }

    Y.DOM.VALUE_SETTERS.select = function(node, val) {
        for (var i = 0, options = node.getElementsByTagName('option'), option;
                option = options[i++];) {
            if (Y.DOM.getValue(option) === val) {
                option.selected = true;
                break;
            }
        }
    }
    
    Y.Selector.useNative = false;
    Y.Selector._nativeQuery = Y.Selector._bruteQuery;
    
}, 'NODE' );


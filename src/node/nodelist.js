/**
 * @module  nodelist
 * @author  lifesinger@gmail.com
 */
KISSY.add('node/nodelist', function(S, DOM,Node,undefined) {

    var AP = Array.prototype,
        isElementNode = DOM._isElementNode;

    /**
     * The NodeList class provides a wrapper for manipulating DOM NodeList.
     */
    function NodeList(domNodes) {
        // factory or constructor
        if (!(this instanceof NodeList)) {
            return new NodeList(domNodes);
        }

        // push nodes
        AP.push.apply(this, S.makeArray(domNodes) || []);
        return undefined;
    }

    S.mix(NodeList.prototype, {

        /**
         * 默认长度为 0
         */
        length: 0,

        /**
         * 根据 index 或 DOMElement 获取对应的 KSNode
         */
        item: function(index) {
            var ret = null, i, len;

            // 找到 DOMElement 对应的 index
            if (isElementNode(index)) {
                for (i = 0,len = this.length; i < len; i++) {
                    if (index === this[i]) {
                        index = i;
                        break;
                    }
                }
            }

            // 转换为 KSNode
            if (isElementNode(this[index])) {
                ret = new Node(this[index]);
            }

            return ret;
        },

        /**
         * Retrieves the DOMNodes.
         */
        getDOMNodes: function() {
            return AP.slice.call(this);
        },

        /**
         * Applies the given function to each Node in the NodeList.
         * @param fn The function to apply. It receives 3 arguments: the current node instance, the node's index, and the NodeList instance
         * @param context An optional context to apply the function with Default context is the current Node instance
         */
        each: function(fn, context) {
            var len = this.length, i = 0, node;

            for (node = new Node(this[0]);
                 i < len && fn.call(context || node, node, i, this) !== false; node = new Node(this[++i])) {
            }

            return this;
        }
    });

    // query api
    NodeList.all = function(selector, context) {
        return new NodeList(DOM.query(selector, context, true));
    };

    return  NodeList;
}, {
    requires:["dom","node/node"]
});

/**
 * Notes:
 *
 *  2010.04
 *   - each 方法传给 fn 的 this, 在 jQuery 里指向原生对象，这样可以避免性能问题。
 *     但从用户角度讲，this 的第一直觉是 $(this), kissy 和 yui3 保持一致，牺牲
 *     性能，以易用为首。
 *   - 有了 each 方法，似乎不再需要 import 所有 dom 方法，意义不大。
 *   - dom 是低级 api, node 是中级 api, 这是分层的一个原因。还有一个原因是，如果
 *     直接在 node 里实现 dom 方法，则不大好将 dom 的方法耦合到 nodelist 里。可
 *     以说，技术成本会制约 api 设计。
 */

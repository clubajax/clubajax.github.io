require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const on = require('@clubajax/on');

class BaseComponent extends HTMLElement {
	constructor () {
		super();
		this._uid = uid(this.localName);
		privates[this._uid] = { DOMSTATE: 'created' };
		privates[this._uid].handleList = [];
		plugin('init', this);
	}

	connectedCallback () {
		privates[this._uid].DOMSTATE = privates[this._uid].domReadyFired ? 'domready' : 'connected';
		plugin('preConnected', this);
		nextTick(onCheckDomReady.bind(this));
		if (this.connected) {
			this.connected();
		}
		this.fire('connected');
		plugin('postConnected', this);
	}

	onConnected (callback) {
		if (this.DOMSTATE === 'connected' || this.DOMSTATE === 'domready') {
			callback(this);
			return;
		}
		this.once('connected', () => {
			callback(this);
		});
	}

	onDomReady (callback) {
		if (this.DOMSTATE === 'domready') {
			callback(this);
			return;
		}
		this.once('domready', () => {
			callback(this);
		});
	}

	disconnectedCallback () {
		privates[this._uid].DOMSTATE = 'disconnected';
		plugin('preDisconnected', this);
		if (this.disconnected) {
			this.disconnected();
		}
		this.fire('disconnected');

		let time, dod = BaseComponent.destroyOnDisconnect;
		if (dod) {
			time = typeof dod === 'number' ? doc : 300;
			setTimeout(() => {
				if (this.DOMSTATE === 'disconnected') {
					this.destroy();
				}
			}, time);
		}
	}

	attributeChangedCallback (attrName, oldVal, newVal) {
		if (!this.isSettingAttribute) {
			plugin('preAttributeChanged', this, attrName, newVal, oldVal);
			if (this.attributeChanged) {
				this.attributeChanged(attrName, newVal, oldVal);
			}
		}
	}

	destroy () {
		this.fire('destroy');
		privates[this._uid].handleList.forEach(function (handle) {
			handle.remove();
		});
		destroy(this);
	}

	fire (eventName, eventDetail, bubbles) {
		return on.fire(this, eventName, eventDetail, bubbles);
	}

	emit (eventName, value) {
		return on.emit(this, eventName, value);
	}

	on (node, eventName, selector, callback) {
		return this.registerHandle(
			typeof node !== 'string' ? // no node is supplied
				on(node, eventName, selector, callback) :
				on(this, node, eventName, selector));
	}

	once (node, eventName, selector, callback) {
		return this.registerHandle(
			typeof node !== 'string' ? // no node is supplied
				on.once(node, eventName, selector, callback) :
				on.once(this, node, eventName, selector, callback));
	}

	attr (key, value, toggle) {
		this.isSettingAttribute = true;
		const add = toggle === undefined ? true : !!toggle;
		if (add) {
			this.setAttribute(key, value);
		} else {
			this.removeAttribute(key);
		}
		this.isSettingAttribute = false;
	}

	registerHandle (handle) {
		privates[this._uid].handleList.push(handle);
		return handle;
	}

	get DOMSTATE () {
		return privates[this._uid].DOMSTATE;
	}

	static set destroyOnDisconnect (value) {
		privates['destroyOnDisconnect'] = value;
	}

	static get destroyOnDisconnect () {
		return privates['destroyOnDisconnect'];
	}

	static clone (template) {
		if (template.content && template.content.children) {
			return document.importNode(template.content, true);
		}
		const frag = document.createDocumentFragment();
		const cloneNode = document.createElement('div');
		cloneNode.innerHTML = template.innerHTML;

		while (cloneNode.children.length) {
			frag.appendChild(cloneNode.children[0]);
		}
		return frag;
	}

	static addPlugin (plug) {
		let i, order = plug.order || 100;
		if (!plugins.length) {
			plugins.push(plug);
		}
		else if (plugins.length === 1) {
			if (plugins[0].order <= order) {
				plugins.push(plug);
			}
			else {
				plugins.unshift(plug);
			}
		}
		else if (plugins[0].order > order) {
			plugins.unshift(plug);
		}
		else {

			for (i = 1; i < plugins.length; i++) {
				if (order === plugins[i - 1].order || (order > plugins[i - 1].order && order < plugins[i].order)) {
					plugins.splice(i, 0, plug);
					return;
				}
			}
			// was not inserted...
			plugins.push(plug);
		}
	}
}

let
	privates = {},
	plugins = [];

function plugin (method, node, a, b, c) {
	plugins.forEach(function (plug) {
		if (plug[method]) {
			plug[method](node, a, b, c);
		}
	});
}

function onCheckDomReady () {
	if (this.DOMSTATE !== 'connected' || privates[this._uid].domReadyFired) {
		return;
	}

	let
		count = 0,
		children = getChildCustomNodes(this),
		ourDomReady = onSelfDomReady.bind(this);

	function addReady () {
		count++;
		if (count === children.length) {
			ourDomReady();
		}
	}

	// If no children, we're good - leaf node. Commence with onDomReady
	//
	if (!children.length) {
		ourDomReady();
	}
	else {
		// else, wait for all children to fire their `ready` events
		//
		children.forEach(function (child) {
			// check if child is already ready
			// also check for connected - this handles moving a node from another node
			// NOPE, that failed. removed for now child.DOMSTATE === 'connected'
			if (child.DOMSTATE === 'domready') {
				addReady();
			}
			// if not, wait for event
			child.on('domready', addReady);
		});
	}
}

function onSelfDomReady () {
	privates[this._uid].DOMSTATE = 'domready';
	// domReady should only ever fire once
	privates[this._uid].domReadyFired = true;
	plugin('preDomReady', this);
	// call this.domReady first, so that the component
	// can finish initializing before firing any
	// subsequent events
	if (this.domReady) {
		this.domReady();
		this.domReady = function () {};
	}

	// allow component to fire this event
	// domReady() will still be called
	if (!this.fireOwnDomready) {
		this.fire('domready');
	}

	plugin('postDomReady', this);
}

function getChildCustomNodes (node) {
	// collect any children that are custom nodes
	// used to check if their dom is ready before
	// determining if this is ready
	let i, nodes = [];
	for (i = 0; i < node.children.length; i++) {
		if (node.children[i].nodeName.indexOf('-') > -1) {
			nodes.push(node.children[i]);
		}
	}
	return nodes;
}

function nextTick (cb) {
	requestAnimationFrame(cb);
}

const uids = {};
function uid (type = 'uid') {
	if (uids[type] === undefined) {
		uids[type] = 0;
	}
	const id = type + '-' + (uids[type] + 1);
	uids[type]++;
	return id;
}

const destroyer = document.createElement('div');
function destroy (node) {
	if (node) {
		destroyer.appendChild(node);
		destroyer.innerHTML = '';
	}
}

function makeGlobalListeners (name, eventName) {
	window[name] = function (nodeOrNodes, callback) {
		function handleDomReady (node, cb) {
			function onReady () {
				cb(node);
				node.removeEventListener(eventName, onReady);
			}

			if (node.DOMSTATE === eventName || node.DOMSTATE === 'domready') {
				cb(node);
			}
			else {
				node.addEventListener(eventName, onReady);
			}
		}

		if (!Array.isArray(nodeOrNodes)) {
			handleDomReady(nodeOrNodes, callback);
			return;
		}

		let count = 0;

		function onArrayNodeReady () {
			count++;
			if (count === nodeOrNodes.length) {
				callback(nodeOrNodes);
			}
		}

		for (let i = 0; i < nodeOrNodes.length; i++) {
			handleDomReady(nodeOrNodes[i], onArrayNodeReady);
		}
	};
}

makeGlobalListeners('onDomReady', 'domready');
makeGlobalListeners('onConnected', 'connected');

module.exports = BaseComponent;
},{"@clubajax/on":"@clubajax/on"}],2:[function(require,module,exports){
const BaseComponent = require('./BaseComponent');

function setBoolean (node, prop) {
	let propValue;
	Object.defineProperty(node, prop, {
		enumerable: true,
		configurable: true,
		get () {
			const att = this.getAttribute(prop);
			return (att !== undefined && att !== null && att !== 'false' && att !== false);
		},
		set (value) {
			this.isSettingAttribute = true;
			if (value) {
				this.setAttribute(prop, '');
			} else {
				this.removeAttribute(prop);
			}
			if (this.attributeChanged) {
				this.attributeChanged(prop, value);
			}
			const fn = this[onify(prop)];
			if (fn) {
				const eventName = this.connectedProps ? 'onConnected' : 'onDomReady';
				window[eventName](this, () => {

					if (value !== undefined && propValue !== value) {
						value = fn.call(this, value) || value;
					}
					propValue = value;
				});
			}

			this.isSettingAttribute = false;
		}
	});
}

function setProperty (node, prop) {
	let propValue;
	Object.defineProperty(node, prop, {
		enumerable: true,
		configurable: true,
		get () {
			return propValue !== undefined ? propValue : normalize(this.getAttribute(prop));
		},
		set (value) {
			this.isSettingAttribute = true;
			this.setAttribute(prop, value);
			if (this.attributeChanged) {
				this.attributeChanged(prop, value);
			}
			const fn = this[onify(prop)];
			if(fn){
				const eventName = this.connectedProps ? 'onConnected' : 'onDomReady';
				window[eventName](this, () => {
					if(value !== undefined){
						propValue = value;
					}

					value = fn.call(this, value) || value;
				});
			}
			this.isSettingAttribute = false;
		}
	});
}

function setObject (node, prop) {
	Object.defineProperty(node, prop, {
		enumerable: true,
		configurable: true,
		get () {
			return this['__' + prop];
		},
		set (value) {
			this['__' + prop] = value;
		}
	});
}

function setProperties (node) {
	let props = node.props || node.properties;
	if (props) {
		props.forEach(function (prop) {
			if (prop === 'disabled') {
				setBoolean(node, prop);
			}
			else {
				setProperty(node, prop);
			}
		});
	}
}

function setBooleans (node) {
	let props = node.bools || node.booleans;
	if (props) {
		props.forEach(function (prop) {
			setBoolean(node, prop);
		});
	}
}

function setObjects (node) {
	let props = node.objects;
	if (props) {
		props.forEach(function (prop) {
			setObject(node, prop);
		});
	}
}

function cap (name) {
	return name.substring(0,1).toUpperCase() + name.substring(1);
}

function onify (name) {
	return 'on' + name.split('-').map(word => cap(word)).join('');
}

function isBool (node, name) {
	return (node.bools || node.booleans || []).indexOf(name) > -1;
}

function boolNorm (value) {
	if(value === ''){
		return true;
	}
	return normalize(value);
}

function propNorm (value) {
	return normalize(value);
}

function normalize(val) {
	if (typeof val === 'string') {
		val = val.trim();
		if (val === 'false') {
			return false;
		} else if (val === 'null') {
			return null;
		} else if (val === 'true') {
			return true;
		}
		// finds strings that start with numbers, but are not numbers:
		// '1team' '123 Street', '1-2-3', etc
		if (('' + val).replace(/-?\d*\.?\d*/, '').length) {
			return val;
		}
	}
	if (!isNaN(parseFloat(val))) {
		return parseFloat(val);
	}
	return val;
}

BaseComponent.addPlugin({
	name: 'properties',
	order: 10,
	init: function (node) {
		setProperties(node);
		setBooleans(node);
	},
	preAttributeChanged: function (node, name, value) {
		if (node.isSettingAttribute) {
			return false;
		}
		if(isBool(node, name)){
			value = boolNorm(value);
			node[name] = !!value;
			if(!value){
				node[name] = false;
				node.isSettingAttribute = true;
				node.removeAttribute(name);
				node.isSettingAttribute = false;
			} else {
				node[name] = true;
			}
			return;
		}

		node[name] = propNorm(value);
	}
});
},{"./BaseComponent":1}],3:[function(require,module,exports){
const BaseComponent = require('./BaseComponent');

function assignRefs (node) {

    [...node.querySelectorAll('[ref]')].forEach(function (child) {
        let name = child.getAttribute('ref');
		child.removeAttribute('ref');
        node[name] = child;
    });
}

function assignEvents (node) {
    // <div on="click:onClick">
	[...node.querySelectorAll('[on]')].forEach(function (child, i, children) {
		if(child === node){
			return;
		}
		let
            keyValue = child.getAttribute('on'),
            event = keyValue.split(':')[0].trim(),
            method = keyValue.split(':')[1].trim();
		// remove, so parent does not try to use it
		child.removeAttribute('on');

        node.on(child, event, function (e) {
            node[method](e)
        })
    });
}

BaseComponent.addPlugin({
    name: 'refs',
    order: 30,
    preConnected: function (node) {
        assignRefs(node);
        assignEvents(node);
    }
});
},{"./BaseComponent":1}],4:[function(require,module,exports){
const BaseComponent  = require('./BaseComponent');

const lightNodes = {};
const inserted = {};

function insert (node) {
    if(inserted[node._uid] || !hasTemplate(node)){
        return;
    }
    collectLightNodes(node);
    insertTemplate(node);
    inserted[node._uid] = true;
}

function collectLightNodes(node){
    lightNodes[node._uid] = lightNodes[node._uid] || [];
    while(node.childNodes.length){
        lightNodes[node._uid].push(node.removeChild(node.childNodes[0]));
    }
}

function hasTemplate (node) {
	return node.templateString || node.templateId;
}

function insertTemplateChain (node) {
    const templates = node.getTemplateChain();
    templates.reverse().forEach(function (template) {
        getContainer(node).appendChild(BaseComponent.clone(template));
    });
    insertChildren(node);
}

function insertTemplate (node) {
    if(node.nestedTemplate){
        insertTemplateChain(node);
        return;
    }
    const templateNode = node.getTemplateNode();

    if(templateNode) {
        node.appendChild(BaseComponent.clone(templateNode));
    }
    insertChildren(node);
}

function getContainer (node) {
    const containers = node.querySelectorAll('[ref="container"]');
    if(!containers || !containers.length){
        return node;
    }
    return containers[containers.length - 1];
}

function insertChildren (node) {
    let i;
	const container = getContainer(node);
	const children = lightNodes[node._uid];

    if(container && children && children.length){
        for(i = 0; i < children.length; i++){
            container.appendChild(children[i]);
        }
    }
}

function toDom (html){
	const node = document.createElement('div');
	node.innerHTML = html;
	return node.firstChild;
}

BaseComponent.prototype.getLightNodes = function () {
    return lightNodes[this._uid];
};

BaseComponent.prototype.getTemplateNode = function () {
    // caching causes different classes to pull the same template - wat?
    //if(!this.templateNode) {
	if (this.templateId) {
		this.templateNode = document.getElementById(this.templateId.replace('#',''));
	}
	else if (this.templateString) {
		this.templateNode = toDom('<template>' + this.templateString + '</template>');
	}
    //}
    return this.templateNode;
};

BaseComponent.prototype.getTemplateChain = function () {

    let
        context = this,
        templates = [],
        template;

    // walk the prototype chain; Babel doesn't allow using
    // `super` since we are outside of the Class
    while(context){
        context = Object.getPrototypeOf(context);
        if(!context){ break; }
        // skip prototypes without a template
        // (else it will pull an inherited template and cause duplicates)
        if(context.hasOwnProperty('templateString') || context.hasOwnProperty('templateId')) {
            template = context.getTemplateNode();
            if (template) {
                templates.push(template);
            }
        }
    }
    return templates;
};

BaseComponent.addPlugin({
    name: 'template',
    order: 20,
    preConnected: function (node) {
        insert(node);
    }
});
},{"./BaseComponent":1}],"@clubajax/base-component":[function(require,module,exports){
module.exports = require('@clubajax/base-component/src/BaseComponent');
require('@clubajax/base-component/src/template');
require('@clubajax/base-component/src/properties');
require('@clubajax/base-component/src/refs');
},{"@clubajax/base-component/src/BaseComponent":1,"@clubajax/base-component/src/properties":2,"@clubajax/base-component/src/refs":3,"@clubajax/base-component/src/template":4}],"@clubajax/custom-elements-polyfill":[function(require,module,exports){
(function () {
if(window['force-no-ce-shim']){
	return;
}
var supportsV1 = 'customElements' in window;
var nativeShimBase64 = "ZnVuY3Rpb24gbmF0aXZlU2hpbSgpeygoKT0+eyd1c2Ugc3RyaWN0JztpZighd2luZG93LmN1c3RvbUVsZW1lbnRzKXJldHVybjtjb25zdCBhPXdpbmRvdy5IVE1MRWxlbWVudCxiPXdpbmRvdy5jdXN0b21FbGVtZW50cy5kZWZpbmUsYz13aW5kb3cuY3VzdG9tRWxlbWVudHMuZ2V0LGQ9bmV3IE1hcCxlPW5ldyBNYXA7bGV0IGY9ITEsZz0hMTt3aW5kb3cuSFRNTEVsZW1lbnQ9ZnVuY3Rpb24oKXtpZighZil7Y29uc3Qgaj1kLmdldCh0aGlzLmNvbnN0cnVjdG9yKSxrPWMuY2FsbCh3aW5kb3cuY3VzdG9tRWxlbWVudHMsaik7Zz0hMDtjb25zdCBsPW5ldyBrO3JldHVybiBsfWY9ITE7fSx3aW5kb3cuSFRNTEVsZW1lbnQucHJvdG90eXBlPWEucHJvdG90eXBlO09iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3csJ2N1c3RvbUVsZW1lbnRzJyx7dmFsdWU6d2luZG93LmN1c3RvbUVsZW1lbnRzLGNvbmZpZ3VyYWJsZTohMCx3cml0YWJsZTohMH0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuY3VzdG9tRWxlbWVudHMsJ2RlZmluZScse3ZhbHVlOihqLGspPT57Y29uc3QgbD1rLnByb3RvdHlwZSxtPWNsYXNzIGV4dGVuZHMgYXtjb25zdHJ1Y3Rvcigpe3N1cGVyKCksT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsbCksZ3x8KGY9ITAsay5jYWxsKHRoaXMpKSxnPSExO319LG49bS5wcm90b3R5cGU7bS5vYnNlcnZlZEF0dHJpYnV0ZXM9ay5vYnNlcnZlZEF0dHJpYnV0ZXMsbi5jb25uZWN0ZWRDYWxsYmFjaz1sLmNvbm5lY3RlZENhbGxiYWNrLG4uZGlzY29ubmVjdGVkQ2FsbGJhY2s9bC5kaXNjb25uZWN0ZWRDYWxsYmFjayxuLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjaz1sLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayxuLmFkb3B0ZWRDYWxsYmFjaz1sLmFkb3B0ZWRDYWxsYmFjayxkLnNldChrLGopLGUuc2V0KGosayksYi5jYWxsKHdpbmRvdy5jdXN0b21FbGVtZW50cyxqLG0pO30sY29uZmlndXJhYmxlOiEwLHdyaXRhYmxlOiEwfSksT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5jdXN0b21FbGVtZW50cywnZ2V0Jyx7dmFsdWU6KGopPT5lLmdldChqKSxjb25maWd1cmFibGU6ITAsd3JpdGFibGU6ITB9KTt9KSgpO30=";

if(supportsV1 && !window['force-ce-shim']){
if(!window['no-native-shim']) {
eval(window.atob(nativeShimBase64));
nativeShim();
}
}else{
customElements();
}

function customElements() {
(function(){
// @license Polymer Project Authors. http://polymer.github.io/LICENSE.txt
'use strict';var g=new function(){};var aa=new Set("annotation-xml color-profile font-face font-face-src font-face-uri font-face-format font-face-name missing-glyph".split(" "));function k(b){var a=aa.has(b);b=/^[a-z][.0-9_a-z]*-[\-.0-9_a-z]*$/.test(b);return!a&&b}function l(b){var a=b.isConnected;if(void 0!==a)return a;for(;b&&!(b.__CE_isImportDocument||b instanceof Document);)b=b.parentNode||(window.ShadowRoot&&b instanceof ShadowRoot?b.host:void 0);return!(!b||!(b.__CE_isImportDocument||b instanceof Document))}
function m(b,a){for(;a&&a!==b&&!a.nextSibling;)a=a.parentNode;return a&&a!==b?a.nextSibling:null}
function n(b,a,e){e=e?e:new Set;for(var c=b;c;){if(c.nodeType===Node.ELEMENT_NODE){var d=c;a(d);var h=d.localName;if("link"===h&&"import"===d.getAttribute("rel")){c=d.import;if(c instanceof Node&&!e.has(c))for(e.add(c),c=c.firstChild;c;c=c.nextSibling)n(c,a,e);c=m(b,d);continue}else if("template"===h){c=m(b,d);continue}if(d=d.__CE_shadowRoot)for(d=d.firstChild;d;d=d.nextSibling)n(d,a,e)}c=c.firstChild?c.firstChild:m(b,c)}}function q(b,a,e){b[a]=e};function r(){this.a=new Map;this.f=new Map;this.c=[];this.b=!1}function ba(b,a,e){b.a.set(a,e);b.f.set(e.constructor,e)}function t(b,a){b.b=!0;b.c.push(a)}function v(b,a){b.b&&n(a,function(a){return w(b,a)})}function w(b,a){if(b.b&&!a.__CE_patched){a.__CE_patched=!0;for(var e=0;e<b.c.length;e++)b.c[e](a)}}function x(b,a){var e=[];n(a,function(b){return e.push(b)});for(a=0;a<e.length;a++){var c=e[a];1===c.__CE_state?b.connectedCallback(c):y(b,c)}}
function z(b,a){var e=[];n(a,function(b){return e.push(b)});for(a=0;a<e.length;a++){var c=e[a];1===c.__CE_state&&b.disconnectedCallback(c)}}
function A(b,a,e){e=e?e:new Set;var c=[];n(a,function(d){if("link"===d.localName&&"import"===d.getAttribute("rel")){var a=d.import;a instanceof Node&&"complete"===a.readyState?(a.__CE_isImportDocument=!0,a.__CE_hasRegistry=!0):d.addEventListener("load",function(){var a=d.import;a.__CE_documentLoadHandled||(a.__CE_documentLoadHandled=!0,a.__CE_isImportDocument=!0,a.__CE_hasRegistry=!0,new Set(e),e.delete(a),A(b,a,e))})}else c.push(d)},e);if(b.b)for(a=0;a<c.length;a++)w(b,c[a]);for(a=0;a<c.length;a++)y(b,
c[a])}
function y(b,a){if(void 0===a.__CE_state){var e=b.a.get(a.localName);if(e){e.constructionStack.push(a);var c=e.constructor;try{try{if(new c!==a)throw Error("The custom element constructor did not produce the element being upgraded.");}finally{e.constructionStack.pop()}}catch(f){throw a.__CE_state=2,f;}a.__CE_state=1;a.__CE_definition=e;if(e.attributeChangedCallback)for(e=e.observedAttributes,c=0;c<e.length;c++){var d=e[c],h=a.getAttribute(d);null!==h&&b.attributeChangedCallback(a,d,null,h,null)}l(a)&&b.connectedCallback(a)}}}
r.prototype.connectedCallback=function(b){var a=b.__CE_definition;a.connectedCallback&&a.connectedCallback.call(b)};r.prototype.disconnectedCallback=function(b){var a=b.__CE_definition;a.disconnectedCallback&&a.disconnectedCallback.call(b)};r.prototype.attributeChangedCallback=function(b,a,e,c,d){var h=b.__CE_definition;h.attributeChangedCallback&&-1<h.observedAttributes.indexOf(a)&&h.attributeChangedCallback.call(b,a,e,c,d)};function B(b,a){this.c=b;this.a=a;this.b=void 0;A(this.c,this.a);"loading"===this.a.readyState&&(this.b=new MutationObserver(this.f.bind(this)),this.b.observe(this.a,{childList:!0,subtree:!0}))}function C(b){b.b&&b.b.disconnect()}B.prototype.f=function(b){var a=this.a.readyState;"interactive"!==a&&"complete"!==a||C(this);for(a=0;a<b.length;a++)for(var e=b[a].addedNodes,c=0;c<e.length;c++)A(this.c,e[c])};function ca(){var b=this;this.b=this.a=void 0;this.c=new Promise(function(a){b.b=a;b.a&&a(b.a)})}function D(b){if(b.a)throw Error("Already resolved.");b.a=void 0;b.b&&b.b(void 0)};function E(b){this.f=!1;this.a=b;this.h=new Map;this.g=function(b){return b()};this.b=!1;this.c=[];this.j=new B(b,document)}
E.prototype.l=function(b,a){var e=this;if(!(a instanceof Function))throw new TypeError("Custom element constructors must be functions.");if(!k(b))throw new SyntaxError("The element name '"+b+"' is not valid.");if(this.a.a.get(b))throw Error("A custom element with name '"+b+"' has already been defined.");if(this.f)throw Error("A custom element is already being defined.");this.f=!0;var c,d,h,f,u;try{var p=function(b){var a=P[b];if(void 0!==a&&!(a instanceof Function))throw Error("The '"+b+"' callback must be a function.");
return a},P=a.prototype;if(!(P instanceof Object))throw new TypeError("The custom element constructor's prototype is not an object.");c=p("connectedCallback");d=p("disconnectedCallback");h=p("adoptedCallback");f=p("attributeChangedCallback");u=a.observedAttributes||[]}catch(va){return}finally{this.f=!1}ba(this.a,b,{localName:b,constructor:a,connectedCallback:c,disconnectedCallback:d,adoptedCallback:h,attributeChangedCallback:f,observedAttributes:u,constructionStack:[]});this.c.push(b);this.b||(this.b=
!0,this.g(function(){if(!1!==e.b)for(e.b=!1,A(e.a,document);0<e.c.length;){var b=e.c.shift();(b=e.h.get(b))&&D(b)}}))};E.prototype.get=function(b){if(b=this.a.a.get(b))return b.constructor};E.prototype.o=function(b){if(!k(b))return Promise.reject(new SyntaxError("'"+b+"' is not a valid custom element name."));var a=this.h.get(b);if(a)return a.c;a=new ca;this.h.set(b,a);this.a.a.get(b)&&-1===this.c.indexOf(b)&&D(a);return a.c};E.prototype.m=function(b){C(this.j);var a=this.g;this.g=function(e){return b(function(){return a(e)})}};
window.CustomElementRegistry=E;E.prototype.define=E.prototype.l;E.prototype.get=E.prototype.get;E.prototype.whenDefined=E.prototype.o;E.prototype.polyfillWrapFlushCallback=E.prototype.m;var F=window.Document.prototype.createElement,da=window.Document.prototype.createElementNS,ea=window.Document.prototype.importNode,fa=window.Document.prototype.prepend,ga=window.Document.prototype.append,G=window.Node.prototype.cloneNode,H=window.Node.prototype.appendChild,I=window.Node.prototype.insertBefore,J=window.Node.prototype.removeChild,K=window.Node.prototype.replaceChild,L=Object.getOwnPropertyDescriptor(window.Node.prototype,"textContent"),M=window.Element.prototype.attachShadow,N=Object.getOwnPropertyDescriptor(window.Element.prototype,
"innerHTML"),O=window.Element.prototype.getAttribute,Q=window.Element.prototype.setAttribute,R=window.Element.prototype.removeAttribute,S=window.Element.prototype.getAttributeNS,T=window.Element.prototype.setAttributeNS,U=window.Element.prototype.removeAttributeNS,V=window.Element.prototype.insertAdjacentElement,ha=window.Element.prototype.prepend,ia=window.Element.prototype.append,ja=window.Element.prototype.before,ka=window.Element.prototype.after,la=window.Element.prototype.replaceWith,ma=window.Element.prototype.remove,
na=window.HTMLElement,W=Object.getOwnPropertyDescriptor(window.HTMLElement.prototype,"innerHTML"),X=window.HTMLElement.prototype.insertAdjacentElement;function oa(){var b=Y;window.HTMLElement=function(){function a(){var a=this.constructor,c=b.f.get(a);if(!c)throw Error("The custom element being constructed was not registered with `customElements`.");var d=c.constructionStack;if(!d.length)return d=F.call(document,c.localName),Object.setPrototypeOf(d,a.prototype),d.__CE_state=1,d.__CE_definition=c,w(b,d),d;var c=d.length-1,h=d[c];if(h===g)throw Error("The HTMLElement constructor was either called reentrantly for this constructor or called multiple times.");
d[c]=g;Object.setPrototypeOf(h,a.prototype);w(b,h);return h}a.prototype=na.prototype;return a}()};function pa(b,a,e){a.prepend=function(a){for(var d=[],c=0;c<arguments.length;++c)d[c-0]=arguments[c];c=d.filter(function(b){return b instanceof Node&&l(b)});e.i.apply(this,d);for(var f=0;f<c.length;f++)z(b,c[f]);if(l(this))for(c=0;c<d.length;c++)f=d[c],f instanceof Element&&x(b,f)};a.append=function(a){for(var d=[],c=0;c<arguments.length;++c)d[c-0]=arguments[c];c=d.filter(function(b){return b instanceof Node&&l(b)});e.append.apply(this,d);for(var f=0;f<c.length;f++)z(b,c[f]);if(l(this))for(c=0;c<
d.length;c++)f=d[c],f instanceof Element&&x(b,f)}};function qa(){var b=Y;q(Document.prototype,"createElement",function(a){if(this.__CE_hasRegistry){var e=b.a.get(a);if(e)return new e.constructor}a=F.call(this,a);w(b,a);return a});q(Document.prototype,"importNode",function(a,e){a=ea.call(this,a,e);this.__CE_hasRegistry?A(b,a):v(b,a);return a});q(Document.prototype,"createElementNS",function(a,e){if(this.__CE_hasRegistry&&(null===a||"http://www.w3.org/1999/xhtml"===a)){var c=b.a.get(e);if(c)return new c.constructor}a=da.call(this,a,e);w(b,a);return a});
pa(b,Document.prototype,{i:fa,append:ga})};function ra(){var b=Y;function a(a,c){Object.defineProperty(a,"textContent",{enumerable:c.enumerable,configurable:!0,get:c.get,set:function(a){if(this.nodeType===Node.TEXT_NODE)c.set.call(this,a);else{var d=void 0;if(this.firstChild){var e=this.childNodes,u=e.length;if(0<u&&l(this))for(var d=Array(u),p=0;p<u;p++)d[p]=e[p]}c.set.call(this,a);if(d)for(a=0;a<d.length;a++)z(b,d[a])}}})}q(Node.prototype,"insertBefore",function(a,c){if(a instanceof DocumentFragment){var d=Array.prototype.slice.apply(a.childNodes);
a=I.call(this,a,c);if(l(this))for(c=0;c<d.length;c++)x(b,d[c]);return a}d=l(a);c=I.call(this,a,c);d&&z(b,a);l(this)&&x(b,a);return c});q(Node.prototype,"appendChild",function(a){if(a instanceof DocumentFragment){var c=Array.prototype.slice.apply(a.childNodes);a=H.call(this,a);if(l(this))for(var d=0;d<c.length;d++)x(b,c[d]);return a}c=l(a);d=H.call(this,a);c&&z(b,a);l(this)&&x(b,a);return d});q(Node.prototype,"cloneNode",function(a){a=G.call(this,a);this.ownerDocument.__CE_hasRegistry?A(b,a):v(b,a);
return a});q(Node.prototype,"removeChild",function(a){var c=l(a),d=J.call(this,a);c&&z(b,a);return d});q(Node.prototype,"replaceChild",function(a,c){if(a instanceof DocumentFragment){var d=Array.prototype.slice.apply(a.childNodes);a=K.call(this,a,c);if(l(this))for(z(b,c),c=0;c<d.length;c++)x(b,d[c]);return a}var d=l(a),e=K.call(this,a,c),f=l(this);f&&z(b,c);d&&z(b,a);f&&x(b,a);return e});L&&L.get?a(Node.prototype,L):t(b,function(b){a(b,{enumerable:!0,configurable:!0,get:function(){for(var a=[],b=
0;b<this.childNodes.length;b++)a.push(this.childNodes[b].textContent);return a.join("")},set:function(a){for(;this.firstChild;)J.call(this,this.firstChild);H.call(this,document.createTextNode(a))}})})};function sa(b){var a=Element.prototype;a.before=function(a){for(var c=[],d=0;d<arguments.length;++d)c[d-0]=arguments[d];d=c.filter(function(a){return a instanceof Node&&l(a)});ja.apply(this,c);for(var e=0;e<d.length;e++)z(b,d[e]);if(l(this))for(d=0;d<c.length;d++)e=c[d],e instanceof Element&&x(b,e)};a.after=function(a){for(var c=[],d=0;d<arguments.length;++d)c[d-0]=arguments[d];d=c.filter(function(a){return a instanceof Node&&l(a)});ka.apply(this,c);for(var e=0;e<d.length;e++)z(b,d[e]);if(l(this))for(d=
0;d<c.length;d++)e=c[d],e instanceof Element&&x(b,e)};a.replaceWith=function(a){for(var c=[],d=0;d<arguments.length;++d)c[d-0]=arguments[d];var d=c.filter(function(a){return a instanceof Node&&l(a)}),e=l(this);la.apply(this,c);for(var f=0;f<d.length;f++)z(b,d[f]);if(e)for(z(b,this),d=0;d<c.length;d++)e=c[d],e instanceof Element&&x(b,e)};a.remove=function(){var a=l(this);ma.call(this);a&&z(b,this)}};function ta(){var b=Y;function a(a,c){Object.defineProperty(a,"innerHTML",{enumerable:c.enumerable,configurable:!0,get:c.get,set:function(a){var d=this,e=void 0;l(this)&&(e=[],n(this,function(a){a!==d&&e.push(a)}));c.set.call(this,a);if(e)for(var f=0;f<e.length;f++){var h=e[f];1===h.__CE_state&&b.disconnectedCallback(h)}this.ownerDocument.__CE_hasRegistry?A(b,this):v(b,this);return a}})}function e(a,c){q(a,"insertAdjacentElement",function(a,d){var e=l(d);a=c.call(this,a,d);e&&z(b,d);l(a)&&x(b,d);
return a})}M?q(Element.prototype,"attachShadow",function(a){return this.__CE_shadowRoot=a=M.call(this,a)}):console.warn("Custom Elements: `Element#attachShadow` was not patched.");if(N&&N.get)a(Element.prototype,N);else if(W&&W.get)a(HTMLElement.prototype,W);else{var c=F.call(document,"div");t(b,function(b){a(b,{enumerable:!0,configurable:!0,get:function(){return G.call(this,!0).innerHTML},set:function(a){var b="template"===this.localName?this.content:this;for(c.innerHTML=a;0<b.childNodes.length;)J.call(b,
b.childNodes[0]);for(;0<c.childNodes.length;)H.call(b,c.childNodes[0])}})})}q(Element.prototype,"setAttribute",function(a,c){if(1!==this.__CE_state)return Q.call(this,a,c);var d=O.call(this,a);Q.call(this,a,c);c=O.call(this,a);d!==c&&b.attributeChangedCallback(this,a,d,c,null)});q(Element.prototype,"setAttributeNS",function(a,c,e){if(1!==this.__CE_state)return T.call(this,a,c,e);var d=S.call(this,a,c);T.call(this,a,c,e);e=S.call(this,a,c);d!==e&&b.attributeChangedCallback(this,c,d,e,a)});q(Element.prototype,
"removeAttribute",function(a){if(1!==this.__CE_state)return R.call(this,a);var c=O.call(this,a);R.call(this,a);null!==c&&b.attributeChangedCallback(this,a,c,null,null)});q(Element.prototype,"removeAttributeNS",function(a,c){if(1!==this.__CE_state)return U.call(this,a,c);var d=S.call(this,a,c);U.call(this,a,c);var e=S.call(this,a,c);d!==e&&b.attributeChangedCallback(this,c,d,e,a)});X?e(HTMLElement.prototype,X):V?e(Element.prototype,V):console.warn("Custom Elements: `Element#insertAdjacentElement` was not patched.");
pa(b,Element.prototype,{i:ha,append:ia});sa(b)};
var Z=window.customElements;if(!Z||Z.forcePolyfill||"function"!=typeof Z.define||"function"!=typeof Z.get){var Y=new r;oa();qa();ra();ta();document.__CE_hasRegistry=!0;var ua=new E(Y);Object.defineProperty(window,"customElements",{configurable:!0,enumerable:!0,value:ua})};
}).call(self);
}
}());
},{}],"@clubajax/dom":[function(require,module,exports){
/* UMD.define */
(function (root, factory) {
	if (typeof customLoader === 'function') {
		customLoader(factory, 'dom');
	} else if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.returnExports = factory();
		window.dom = factory();
	}
}(this, function () {
	'use strict';
	var
		uids = {},
		destroyer = document.createElement('div');

	function isDimension (prop) {
		return !/opacity|index|flex|weight|^sdcsdcorder|tab|miter|group|zoom/i.test(prop)
	}

	function isNumber (value) {
		if (/\s/.test(value)) {
			return false;
		}
		return !isNaN(parseFloat(value));
	}

	function uid (type) {
		type = type || 'uid';
		if (uids[type] === undefined) {
			uids[type] = 0;
		}
		var id = type + '-' + (uids[type] + 1);
		uids[type]++;
		return id;
	}

	function isNode (item) {
		// safer test for custom elements in FF (with wc shim)
		// fragment is a special case
		return !!item && typeof item === 'object' && (typeof item.innerHTML === 'string' || item.nodeName === '#document-fragment');
	}

	function byId (item) {
		if (typeof item === 'string') {
			return document.getElementById(item);
		}
		return item;
	}

	function style (node, prop, value) {
		var key, computed, result;
		if (typeof prop === 'object') {
			// object setter
			Object.keys(prop).forEach(function (key) {
				style(node, key, prop[key]);
			});
			return null;
		} else if (value !== undefined) {
			// property setter
			if (typeof value === 'number' && isDimension(prop)) {
				value += 'px';
			}
			node.style[prop] = value;
		}

		// getter, if a simple style
		if (node.style[prop]) {
			result = node.style[prop];
			if (/px/.test(result)) {
				return parseFloat(result);
			}
			if (/%/.test(result)) {
				return parseFloat(result) * 0.01;
			}
			if (isNumber(result)) {
				return parseFloat(result);
			}
			return result;
		}

		// getter, computed
		computed = window.getComputedStyle(node);
		if (computed[prop]) {
			result = computed[prop];
			if (isNumber(result)) {
				return parseFloat(result);
			}
			return computed[prop];
		}
		return '';
	}

	function attr (node, prop, value) {
		var key;

		if (typeof prop === 'object') {

			var bools = {};
			var strings = {};
			var objects = {};
			var events = {};
			Object.keys(prop).forEach(function (key) {
				if (typeof prop[key] === 'boolean') {
					bools[key] = prop[key];
				} else if (typeof prop[key] === 'object') {
					objects[key] = prop[key];
				} else if (typeof prop[key] === 'function') {
					if (/on[A-Z]/.test(key)) {
						events[key] = prop[key];
					} else {
						console.warn('dom warning: function used with `onEvent` syntax');
					}
				} else {
					strings[key] = prop[key];
				}
			});

			// assigning properties in specific order of type, namely objects last
			Object.keys(bools).forEach(function (key) { attr(node, key, prop[key]); });
			Object.keys(strings).forEach(function (key) { attr(node, key, prop[key]); });
			Object.keys(events).forEach(function (key) { attr(node, key, prop[key]); });
			Object.keys(objects).forEach(function (key) { attr(node, key, prop[key]); });

			return null;
		}
		else if (value !== undefined) {
			if (prop === 'text' || prop === 'html' || prop === 'innerHTML') {
				// ignore, handled during creation
				return;
			}
			else if (prop === 'className' || prop === 'class') {
				dom.classList.add(node, value);
			}
			else if (prop === 'style') {
				style(node, value);
			}
			else if (prop === 'attr') {
				// back compat
				attr(node, value);
			}
			else if (typeof value === 'function') {
				attachEvent(node, prop, value);
			}
			else if (typeof value === 'object') {
				// object, like 'data'
				node[prop] = value;
			}
			else {
				if (value === false) {
					node.removeAttribute(prop);
				} else {
					node.setAttribute(prop, value);
				}
			}
		}

		return node.getAttribute(prop);
	}

	function attachEvent (node, prop, value) {
		var event = prop.replace('on', '').toLowerCase();
		node.addEventListener(event, value);

		var callback = function(mutationsList) {
			mutationsList.forEach(function (mutation) {
				for (var i = 0; i < mutation.removedNodes.length; i++) {
					var n = mutation.removedNodes[i];
					if (n === node) {
						node.removeEventListener(event, value);
						observer.disconnect();
						break;
					}
				}
			});
		};
		var observer = new MutationObserver(callback);
		observer.observe(node.parentNode || document.body, { childList: true });
	}

	function box (node) {
		if (node === window) {
			node = document.documentElement;
		}
		// node dimensions
		// returned object is immutable
		// add scroll positioning and convenience abbreviations
		var
			dimensions = byId(node).getBoundingClientRect();
		return {
			top: dimensions.top,
			right: dimensions.right,
			bottom: dimensions.bottom,
			left: dimensions.left,
			height: dimensions.height,
			h: dimensions.height,
			width: dimensions.width,
			w: dimensions.width,
			scrollY: window.scrollY,
			scrollX: window.scrollX,
			x: dimensions.left + window.pageXOffset,
			y: dimensions.top + window.pageYOffset
		};
	}

	function relBox (node, parentNode) {
		const parent = parentNode || node.parentNode;
		const pBox = box(parent);
		const bx = box(node);

		return {
			w: bx.w,
			h: bx.h,
			x: bx.left - pBox.left,
			y: bx.top - pBox.top
		};
	}

	function size (node, type) {
		if (node === window) {
			node = document.documentElement;
		}
		if (type === 'scroll') {
			return {
				w: node.scrollWidth,
				h: node.scrollHeight
			};
		}
		if (type === 'client') {
			return {
				w: node.clientWidth,
				h: node.clientHeight
			};
		}
		return {
			w: node.offsetWidth,
			h: node.offsetHeight
		};
	}

	function query (node, selector) {
		if (!selector) {
			selector = node;
			node = document;
		}
		return node.querySelector(selector);
	}

	function queryAll (node, selector) {
		if (!selector) {
			selector = node;
			node = document;
		}
		var nodes = node.querySelectorAll(selector);

		if (!nodes.length) {
			return [];
		}

		// convert to Array and return it
		return Array.prototype.slice.call(nodes);
	}

	function toDom (html, options, parent) {
		var node = dom('div', { html: html });
		parent = byId(parent || options);
		if (parent) {
			while (node.firstChild) {
				parent.appendChild(node.firstChild);
			}
			return node.firstChild;
		}
		if (html.indexOf('<') !== 0) {
			return node;
		}
		return node.firstChild;
	}

	function fromDom (node) {
		function getAttrs (node) {
			var att, i, attrs = {};
			for (i = 0; i < node.attributes.length; i++) {
				att = node.attributes[i];
				attrs[att.localName] = normalize(att.value === '' ? true : att.value);
			}
			return attrs;
		}

		function getText (node) {
			var i, t, text = '';
			for (i = 0; i < node.childNodes.length; i++) {
				t = node.childNodes[i];
				if (t.nodeType === 3 && t.textContent.trim()) {
					text += t.textContent.trim();
				}
			}
			return text;
		}

		var i, object = getAttrs(node);
		object.text = getText(node);
		object.children = [];
		if (node.children.length) {
			for (i = 0; i < node.children.length; i++) {
				object.children.push(fromDom(node.children[i]));
			}
		}
		return object;
	}

	function addChildren (node, children) {
		if (Array.isArray(children)) {
			for (var i = 0; i < children.length; i++) {
				if (children[i]) {
					if (typeof children[i] === 'string') {
						node.appendChild(toDom(children[i]));
					} else {
						node.appendChild(children[i]);
					}
				}
			}
		}
		else if (children) {
			node.appendChild(children);
		}
	}

	function addContent (node, options) {
		var html;
		if (options.html !== undefined || options.innerHTML !== undefined) {
			html = options.html || options.innerHTML || '';
			if (typeof html === 'object') {
				addChildren(node, html);
			} else {
				// careful assuming textContent -
				// misses some HTML, such as entities (&npsp;)
				node.innerHTML = html;
			}
		}
		if (options.text) {
			node.appendChild(document.createTextNode(options.text));
		}
		if (options.children) {
			addChildren(node, options.children);
		}
	}

	function dom (nodeType, options, parent, prepend) {
		options = options || {};

		// if first argument is a string and starts with <, pass to toDom()
		if (nodeType.indexOf('<') === 0) {
			return toDom(nodeType, options, parent);
		}

		var node = document.createElement(nodeType);

		parent = byId(parent);

		addContent(node, options);

		attr(node, options);

		if (parent && isNode(parent)) {
			if (prepend && parent.hasChildNodes()) {
				parent.insertBefore(node, parent.children[0]);
			} else {
				parent.appendChild(node);
			}
		}

		return node;
	}

	function insertAfter (refNode, node) {
		var sibling = refNode.nextElementSibling;
		if (!sibling) {
			refNode.parentNode.appendChild(node);
		} else {
			refNode.parentNode.insertBefore(node, sibling);
		}
		return sibling;
	}

	function destroy (node) {
		// destroys a node completely
		//
		if (node) {
			node.destroyed = true;
			destroyer.appendChild(node);
			destroyer.innerHTML = '';
		}
	}

	function clean (node, dispose) {
		//	Removes all child nodes
		//		dispose: destroy child nodes
		if (dispose) {
			while (node.children.length) {
				destroy(node.children[0]);
			}
			return;
		}
		while (node.children.length) {
			node.removeChild(node.children[0]);
		}
	}

	dom.frag = function (nodes) {
		var frag = document.createDocumentFragment();
		if (arguments.length > 1) {
			for (var i = 0; i < arguments.length; i++) {
				frag.appendChild(arguments[i]);
			}
		} else {
			if (Array.isArray(nodes)) {
				nodes.forEach(function (n) {
					frag.appendChild(n);
				});
			} else {
				frag.appendChild(nodes);
			}
		}
		return frag;
	};

	dom.classList = {
		// in addition to fixing IE11-toggle,
		// these methods also handle arrays
		remove: function (node, names) {
			toArray(names).forEach(function (name) {
				node.classList.remove(name);
			});
		},
		add: function (node, names) {
			toArray(names).forEach(function (name) {
				node.classList.add(name);
			});
		},
		contains: function (node, names) {
			return toArray(names).every(function (name) {
				return node.classList.contains(name);
			});
		},
		toggle: function (node, names, value) {
			names = toArray(names);
			if (typeof value === 'undefined') {
				// use standard functionality, supported by IE
				names.forEach(function (name) {
					node.classList.toggle(name, value);
				});
			}
			// IE11 does not support the second parameter
			else if (value) {
				names.forEach(function (name) {
					node.classList.add(name);
				});
			}
			else {
				names.forEach(function (name) {
					node.classList.remove(name);
				});
			}
		}
	};

	function toArray (names) {
		if (!names) {
			return [];
		}
		return names.split(' ').map(function (name) {
			return name.trim();
		}).filter(function (name) {
			return !!name;
		});
	}

	function normalize (val) {
		if (typeof val === 'string') {
			val = val.trim();
			if (val === 'false') {
				return false;
			} else if (val === 'null') {
				return null;
			} else if (val === 'true') {
				return true;
			}
			// finds strings that start with numbers, but are not numbers:
			// '2team' '123 Street', '1-2-3', etc
			if (('' + val).replace(/-?\d*\.?\d*/, '').length) {
				return val;
			}
		}
		if (!isNaN(parseFloat(val))) {
			return parseFloat(val);
		}
		return val;
	}

	dom.normalize = normalize;
	dom.clean = clean;
	dom.query = query;
	dom.queryAll = queryAll;
	dom.byId = byId;
	dom.attr = attr;
	dom.box = box;
	dom.style = style;
	dom.destroy = destroy;
	dom.uid = uid;
	dom.isNode = isNode;
	dom.toDom = toDom;
	dom.fromDom = fromDom;
	dom.insertAfter = insertAfter;
	dom.size = size;
	dom.relBox = relBox;

	return dom;
}));

},{}],"@clubajax/on":[function(require,module,exports){
(function (root, factory) {
	if (typeof customLoader === 'function') {
		customLoader(factory, 'on');
	} else if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.returnExports = window.on = factory();
	}
}(this, function () {
	'use strict';

	// main function

	function on (node, eventName, filter, handler) {
		// normalize parameters
		if (typeof node === 'string') {
			node = getNodeById(node);
		}

		// prepare a callback
		var callback = makeCallback(node, filter, handler);

		// functional event
		if (typeof eventName === 'function') {
			return eventName(node, callback);
		}

		// special case: keydown/keyup with a list of expected keys
		// TODO: consider replacing with an explicit event function:
		// var h = on(node, onKeyEvent('keyup', /Enter,Esc/), callback);
		var keyEvent = /^(keyup|keydown):(.+)$/.exec(eventName);
		if (keyEvent) {
			return onKeyEvent(keyEvent[1], new RegExp(keyEvent[2].split(',').join('|')))(node, callback);
		}

		// handle multiple event types, like: on(node, 'mouseup, mousedown', callback);
		if (/,/.test(eventName)) {
			return on.makeMultiHandle(eventName.split(',').map(function (name) {
				return name.trim();
			}).filter(function (name) {
				return name;
			}).map(function (name) {
				return on(node, name, callback);
			}));
		}

		// handle registered functional events
		if (Object.prototype.hasOwnProperty.call(on.events, eventName)) {
			return on.events[eventName](node, callback);
		}

		// special case: loading an image
		if (eventName === 'load' && node.tagName.toLowerCase() === 'img') {
			return onImageLoad(node, callback);
		}

		// special case: mousewheel
		if (eventName === 'wheel') {
			// pass through, but first curry callback to wheel events
			callback = normalizeWheelEvent(callback);
			if (!hasWheel) {
				// old Firefox, old IE, Chrome
				return on.makeMultiHandle([
					on(node, 'DOMMouseScroll', callback),
					on(node, 'mousewheel', callback)
				]);
			}
		}

		// special case: keyboard
		if (/^key/.test(eventName)) {
			callback = normalizeKeyEvent(callback);
		}

		// default case
		return on.onDomEvent(node, eventName, callback);
	}

	// registered functional events
	on.events = {
		// handle click and Enter
		button: function (node, callback) {
			return on.makeMultiHandle([
				on(node, 'click', callback),
				on(node, 'keyup:Enter', callback)
			]);
		},

		// custom - used for popups 'n stuff
		clickoff: function (node, callback) {
			// important note!
			// starts paused
			//
			var bHandle = on(node.ownerDocument.documentElement, 'click', function (e) {
				var target = e.target;
				if (target.nodeType !== 1) {
					target = target.parentNode;
				}
				if (target && !node.contains(target)) {
					callback(e);
				}
			});

			var handle = {
				state: 'resumed',
				resume: function () {
					setTimeout(function () {
						bHandle.resume();
					}, 100);
					this.state = 'resumed';
				},
				pause: function () {
					bHandle.pause();
					this.state = 'paused';
				},
				remove: function () {
					bHandle.remove();
					this.state = 'removed';
				}
			};
			handle.pause();

			return handle;
		}
	};

	// internal event handlers

	function onDomEvent (node, eventName, callback) {
		node.addEventListener(eventName, callback, false);
		return {
			remove: function () {
				node.removeEventListener(eventName, callback, false);
				node = callback = null;
				this.remove = this.pause = this.resume = function () {};
			},
			pause: function () {
				node.removeEventListener(eventName, callback, false);
			},
			resume: function () {
				node.addEventListener(eventName, callback, false);
			}
		};
	}

	function onImageLoad (node, callback) {
		var handle = on.makeMultiHandle([
			on.onDomEvent(node, 'load', onImageLoad),
			on(node, 'error', callback)
		]);

		return handle;

		function onImageLoad (e) {
			var interval = setInterval(function () {
				if (node.naturalWidth || node.naturalHeight) {
					clearInterval(interval);
					e.width  = e.naturalWidth  = node.naturalWidth;
					e.height = e.naturalHeight = node.naturalHeight;
					callback(e);
				}
			}, 100);
			handle.remove();
		}
	}

	function onKeyEvent (keyEventName, re) {
		return function onKeyHandler (node, callback) {
			return on(node, keyEventName, function onKey (e) {
				if (re.test(e.key)) {
					callback(e);
				}
			});
		};
	}

	// internal utilities

	var hasWheel = (function hasWheelTest () {
		var
			isIE = navigator.userAgent.indexOf('Trident') > -1,
			div = document.createElement('div');
		return "onwheel" in div || "wheel" in div ||
			(isIE && document.implementation.hasFeature("Events.wheel", "3.0")); // IE feature detection
	})();

	var matches;
	['matches', 'matchesSelector', 'webkit', 'moz', 'ms', 'o'].some(function (name) {
		if (name.length < 7) { // prefix
			name += 'MatchesSelector';
		}
		if (Element.prototype[name]) {
			matches = name;
			return true;
		}
		return false;
	});

	function closest (element, selector, parent) {
		while (element) {
			if (element[on.matches] && element[on.matches](selector)) {
				return element;
			}
			if (element === parent) {
				break;
			}
			element = element.parentElement;
		}
		return null;
	}

	var INVALID_PROPS = {
		isTrusted: 1
	};
	function mix (object, value) {
		if (!value) {
			return object;
		}
		if (typeof value === 'object') {
			for(var key in value){
				if (!INVALID_PROPS[key]) {
					object[key] = value[key];
				}
			}
		} else {
			object.value = value;
		}
		return object;
	}

	var ieKeys = {
		//a: 'TEST',
		Up: 'ArrowUp',
		Down: 'ArrowDown',
		Left: 'ArrowLeft',
		Right: 'ArrowRight',
		Esc: 'Escape',
		Spacebar: ' ',
		Win: 'Command'
	};

	function normalizeKeyEvent (callback) {
		// IE uses old spec
		return function normalizeKeys (e) {
			if (ieKeys[e.key]) {
				var fakeEvent = mix({}, e);
				fakeEvent.key = ieKeys[e.key];
				callback(fakeEvent);
			} else {
				callback(e);
			}
		}
	}

	var
		FACTOR = navigator.userAgent.indexOf('Windows') > -1 ? 10 : 0.1,
		XLR8 = 0,
		mouseWheelHandle;

	function normalizeWheelEvent (callback) {
		// normalizes all browsers' events to a standard:
		// delta, wheelY, wheelX
		// also adds acceleration and deceleration to make
		// Mac and Windows behave similarly
		return function normalizeWheel (e) {
			XLR8 += FACTOR;
			var
				deltaY = Math.max(-1, Math.min(1, (e.wheelDeltaY || e.deltaY))),
				deltaX = Math.max(-10, Math.min(10, (e.wheelDeltaX || e.deltaX)));

			deltaY = deltaY <= 0 ? deltaY - XLR8 : deltaY + XLR8;

			e.delta  = deltaY;
			e.wheelY = deltaY;
			e.wheelX = deltaX;

			clearTimeout(mouseWheelHandle);
			mouseWheelHandle = setTimeout(function () {
				XLR8 = 0;
			}, 300);
			callback(e);
		};
	}

	function closestFilter (element, selector) {
		return function (e) {
			return on.closest(e.target, selector, element);
		};
	}

	function makeMultiHandle (handles) {
		return {
			state: 'resumed',
			remove: function () {
				handles.forEach(function (h) {
					// allow for a simple function in the list
					if (h.remove) {
						h.remove();
					} else if (typeof h === 'function') {
						h();
					}
				});
				handles = [];
				this.remove = this.pause = this.resume = function () {};
				this.state = 'removed';
			},
			pause: function () {
				handles.forEach(function (h) {
					if (h.pause) {
						h.pause();
					}
				});
				this.state = 'paused';
			},
			resume: function () {
				handles.forEach(function (h) {
					if (h.resume) {
						h.resume();
					}
				});
				this.state = 'resumed';
			}
		};
	}

	function getNodeById (id) {
		var node = document.getElementById(id);
		if (!node) {
			console.error('`on` Could not find:', id);
		}
		return node;
	}

	function makeCallback (node, filter, handler) {
		if (filter && handler) {
			if (typeof filter === 'string') {
				filter = closestFilter(node, filter);
			}
			return function (e) {
				var result = filter(e);
				if (result) {
					e.filteredTarget = result;
					handler(e, result);
				}
			};
		}
		return filter || handler;
	}

	function getDoc (node) {
		return node === document || node === window ? document : node.ownerDocument;
	}

	// public functions

	on.once = function (node, eventName, filter, callback) {
		var h;
		if (filter && callback) {
			h = on(node, eventName, filter, function once () {
				callback.apply(window, arguments);
				h.remove();
			});
		} else {
			h = on(node, eventName, function once () {
				filter.apply(window, arguments);
				h.remove();
			});
		}
		return h;
	};

	on.emit = function (node, eventName, value) {
		node = typeof node === 'string' ? getNodeById(node) : node;
		var event = getDoc(node).createEvent('HTMLEvents');
		event.initEvent(eventName, true, true); // event type, bubbling, cancelable
		return node.dispatchEvent(mix(event, value));
	};

	on.fire = function (node, eventName, eventDetail, bubbles) {
		node = typeof node === 'string' ? getNodeById(node) : node;
		var event = getDoc(node).createEvent('CustomEvent');
		event.initCustomEvent(eventName, !!bubbles, true, eventDetail); // event type, bubbling, cancelable, value
		return node.dispatchEvent(event);
	};

	// TODO: DEPRECATED
	on.isAlphaNumeric = function (str) {
		return /^[0-9a-z]$/i.test(str);
	};

	on.makeMultiHandle = makeMultiHandle;
	on.onDomEvent = onDomEvent; // use directly to prevent possible definition loops
	on.closest = closest;
	on.matches = matches;

	return on;
}));

},{}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQGNsdWJhamF4L2Jhc2UtY29tcG9uZW50L3NyYy9CYXNlQ29tcG9uZW50LmpzIiwibm9kZV9tb2R1bGVzL0BjbHViYWpheC9iYXNlLWNvbXBvbmVudC9zcmMvcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy9AY2x1YmFqYXgvYmFzZS1jb21wb25lbnQvc3JjL3JlZnMuanMiLCJub2RlX21vZHVsZXMvQGNsdWJhamF4L2Jhc2UtY29tcG9uZW50L3NyYy90ZW1wbGF0ZS5qcyIsIkBjbHViYWpheC9iYXNlLWNvbXBvbmVudCIsIkBjbHViYWpheC9jdXN0b20tZWxlbWVudHMtcG9seWZpbGwiLCJAY2x1YmFqYXgvZG9tIiwiQGNsdWJhamF4L29uIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImNvbnN0IG9uID0gcmVxdWlyZSgnQGNsdWJhamF4L29uJyk7XG5cbmNsYXNzIEJhc2VDb21wb25lbnQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuX3VpZCA9IHVpZCh0aGlzLmxvY2FsTmFtZSk7XG5cdFx0cHJpdmF0ZXNbdGhpcy5fdWlkXSA9IHsgRE9NU1RBVEU6ICdjcmVhdGVkJyB9O1xuXHRcdHByaXZhdGVzW3RoaXMuX3VpZF0uaGFuZGxlTGlzdCA9IFtdO1xuXHRcdHBsdWdpbignaW5pdCcsIHRoaXMpO1xuXHR9XG5cblx0Y29ubmVjdGVkQ2FsbGJhY2sgKCkge1xuXHRcdHByaXZhdGVzW3RoaXMuX3VpZF0uRE9NU1RBVEUgPSBwcml2YXRlc1t0aGlzLl91aWRdLmRvbVJlYWR5RmlyZWQgPyAnZG9tcmVhZHknIDogJ2Nvbm5lY3RlZCc7XG5cdFx0cGx1Z2luKCdwcmVDb25uZWN0ZWQnLCB0aGlzKTtcblx0XHRuZXh0VGljayhvbkNoZWNrRG9tUmVhZHkuYmluZCh0aGlzKSk7XG5cdFx0aWYgKHRoaXMuY29ubmVjdGVkKSB7XG5cdFx0XHR0aGlzLmNvbm5lY3RlZCgpO1xuXHRcdH1cblx0XHR0aGlzLmZpcmUoJ2Nvbm5lY3RlZCcpO1xuXHRcdHBsdWdpbigncG9zdENvbm5lY3RlZCcsIHRoaXMpO1xuXHR9XG5cblx0b25Db25uZWN0ZWQgKGNhbGxiYWNrKSB7XG5cdFx0aWYgKHRoaXMuRE9NU1RBVEUgPT09ICdjb25uZWN0ZWQnIHx8IHRoaXMuRE9NU1RBVEUgPT09ICdkb21yZWFkeScpIHtcblx0XHRcdGNhbGxiYWNrKHRoaXMpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLm9uY2UoJ2Nvbm5lY3RlZCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKHRoaXMpO1xuXHRcdH0pO1xuXHR9XG5cblx0b25Eb21SZWFkeSAoY2FsbGJhY2spIHtcblx0XHRpZiAodGhpcy5ET01TVEFURSA9PT0gJ2RvbXJlYWR5Jykge1xuXHRcdFx0Y2FsbGJhY2sodGhpcyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMub25jZSgnZG9tcmVhZHknLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjayh0aGlzKTtcblx0XHR9KTtcblx0fVxuXG5cdGRpc2Nvbm5lY3RlZENhbGxiYWNrICgpIHtcblx0XHRwcml2YXRlc1t0aGlzLl91aWRdLkRPTVNUQVRFID0gJ2Rpc2Nvbm5lY3RlZCc7XG5cdFx0cGx1Z2luKCdwcmVEaXNjb25uZWN0ZWQnLCB0aGlzKTtcblx0XHRpZiAodGhpcy5kaXNjb25uZWN0ZWQpIHtcblx0XHRcdHRoaXMuZGlzY29ubmVjdGVkKCk7XG5cdFx0fVxuXHRcdHRoaXMuZmlyZSgnZGlzY29ubmVjdGVkJyk7XG5cblx0XHRsZXQgdGltZSwgZG9kID0gQmFzZUNvbXBvbmVudC5kZXN0cm95T25EaXNjb25uZWN0O1xuXHRcdGlmIChkb2QpIHtcblx0XHRcdHRpbWUgPSB0eXBlb2YgZG9kID09PSAnbnVtYmVyJyA/IGRvYyA6IDMwMDtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRpZiAodGhpcy5ET01TVEFURSA9PT0gJ2Rpc2Nvbm5lY3RlZCcpIHtcblx0XHRcdFx0XHR0aGlzLmRlc3Ryb3koKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgdGltZSk7XG5cdFx0fVxuXHR9XG5cblx0YXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrIChhdHRyTmFtZSwgb2xkVmFsLCBuZXdWYWwpIHtcblx0XHRpZiAoIXRoaXMuaXNTZXR0aW5nQXR0cmlidXRlKSB7XG5cdFx0XHRwbHVnaW4oJ3ByZUF0dHJpYnV0ZUNoYW5nZWQnLCB0aGlzLCBhdHRyTmFtZSwgbmV3VmFsLCBvbGRWYWwpO1xuXHRcdFx0aWYgKHRoaXMuYXR0cmlidXRlQ2hhbmdlZCkge1xuXHRcdFx0XHR0aGlzLmF0dHJpYnV0ZUNoYW5nZWQoYXR0ck5hbWUsIG5ld1ZhbCwgb2xkVmFsKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRkZXN0cm95ICgpIHtcblx0XHR0aGlzLmZpcmUoJ2Rlc3Ryb3knKTtcblx0XHRwcml2YXRlc1t0aGlzLl91aWRdLmhhbmRsZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoaGFuZGxlKSB7XG5cdFx0XHRoYW5kbGUucmVtb3ZlKCk7XG5cdFx0fSk7XG5cdFx0ZGVzdHJveSh0aGlzKTtcblx0fVxuXG5cdGZpcmUgKGV2ZW50TmFtZSwgZXZlbnREZXRhaWwsIGJ1YmJsZXMpIHtcblx0XHRyZXR1cm4gb24uZmlyZSh0aGlzLCBldmVudE5hbWUsIGV2ZW50RGV0YWlsLCBidWJibGVzKTtcblx0fVxuXG5cdGVtaXQgKGV2ZW50TmFtZSwgdmFsdWUpIHtcblx0XHRyZXR1cm4gb24uZW1pdCh0aGlzLCBldmVudE5hbWUsIHZhbHVlKTtcblx0fVxuXG5cdG9uIChub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykge1xuXHRcdHJldHVybiB0aGlzLnJlZ2lzdGVySGFuZGxlKFxuXHRcdFx0dHlwZW9mIG5vZGUgIT09ICdzdHJpbmcnID8gLy8gbm8gbm9kZSBpcyBzdXBwbGllZFxuXHRcdFx0XHRvbihub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykgOlxuXHRcdFx0XHRvbih0aGlzLCBub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yKSk7XG5cdH1cblxuXHRvbmNlIChub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykge1xuXHRcdHJldHVybiB0aGlzLnJlZ2lzdGVySGFuZGxlKFxuXHRcdFx0dHlwZW9mIG5vZGUgIT09ICdzdHJpbmcnID8gLy8gbm8gbm9kZSBpcyBzdXBwbGllZFxuXHRcdFx0XHRvbi5vbmNlKG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSA6XG5cdFx0XHRcdG9uLm9uY2UodGhpcywgbm9kZSwgZXZlbnROYW1lLCBzZWxlY3RvciwgY2FsbGJhY2spKTtcblx0fVxuXG5cdGF0dHIgKGtleSwgdmFsdWUsIHRvZ2dsZSkge1xuXHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gdHJ1ZTtcblx0XHRjb25zdCBhZGQgPSB0b2dnbGUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiAhIXRvZ2dsZTtcblx0XHRpZiAoYWRkKSB7XG5cdFx0XHR0aGlzLnNldEF0dHJpYnV0ZShrZXksIHZhbHVlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5yZW1vdmVBdHRyaWJ1dGUoa2V5KTtcblx0XHR9XG5cdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0fVxuXG5cdHJlZ2lzdGVySGFuZGxlIChoYW5kbGUpIHtcblx0XHRwcml2YXRlc1t0aGlzLl91aWRdLmhhbmRsZUxpc3QucHVzaChoYW5kbGUpO1xuXHRcdHJldHVybiBoYW5kbGU7XG5cdH1cblxuXHRnZXQgRE9NU1RBVEUgKCkge1xuXHRcdHJldHVybiBwcml2YXRlc1t0aGlzLl91aWRdLkRPTVNUQVRFO1xuXHR9XG5cblx0c3RhdGljIHNldCBkZXN0cm95T25EaXNjb25uZWN0ICh2YWx1ZSkge1xuXHRcdHByaXZhdGVzWydkZXN0cm95T25EaXNjb25uZWN0J10gPSB2YWx1ZTtcblx0fVxuXG5cdHN0YXRpYyBnZXQgZGVzdHJveU9uRGlzY29ubmVjdCAoKSB7XG5cdFx0cmV0dXJuIHByaXZhdGVzWydkZXN0cm95T25EaXNjb25uZWN0J107XG5cdH1cblxuXHRzdGF0aWMgY2xvbmUgKHRlbXBsYXRlKSB7XG5cdFx0aWYgKHRlbXBsYXRlLmNvbnRlbnQgJiYgdGVtcGxhdGUuY29udGVudC5jaGlsZHJlbikge1xuXHRcdFx0cmV0dXJuIGRvY3VtZW50LmltcG9ydE5vZGUodGVtcGxhdGUuY29udGVudCwgdHJ1ZSk7XG5cdFx0fVxuXHRcdGNvbnN0IGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdFx0Y29uc3QgY2xvbmVOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Y2xvbmVOb2RlLmlubmVySFRNTCA9IHRlbXBsYXRlLmlubmVySFRNTDtcblxuXHRcdHdoaWxlIChjbG9uZU5vZGUuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHRmcmFnLmFwcGVuZENoaWxkKGNsb25lTm9kZS5jaGlsZHJlblswXSk7XG5cdFx0fVxuXHRcdHJldHVybiBmcmFnO1xuXHR9XG5cblx0c3RhdGljIGFkZFBsdWdpbiAocGx1Zykge1xuXHRcdGxldCBpLCBvcmRlciA9IHBsdWcub3JkZXIgfHwgMTAwO1xuXHRcdGlmICghcGx1Z2lucy5sZW5ndGgpIHtcblx0XHRcdHBsdWdpbnMucHVzaChwbHVnKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAocGx1Z2lucy5sZW5ndGggPT09IDEpIHtcblx0XHRcdGlmIChwbHVnaW5zWzBdLm9yZGVyIDw9IG9yZGVyKSB7XG5cdFx0XHRcdHBsdWdpbnMucHVzaChwbHVnKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRwbHVnaW5zLnVuc2hpZnQocGx1Zyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHBsdWdpbnNbMF0ub3JkZXIgPiBvcmRlcikge1xuXHRcdFx0cGx1Z2lucy51bnNoaWZ0KHBsdWcpO1xuXHRcdH1cblx0XHRlbHNlIHtcblxuXHRcdFx0Zm9yIChpID0gMTsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKG9yZGVyID09PSBwbHVnaW5zW2kgLSAxXS5vcmRlciB8fCAob3JkZXIgPiBwbHVnaW5zW2kgLSAxXS5vcmRlciAmJiBvcmRlciA8IHBsdWdpbnNbaV0ub3JkZXIpKSB7XG5cdFx0XHRcdFx0cGx1Z2lucy5zcGxpY2UoaSwgMCwgcGx1Zyk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHQvLyB3YXMgbm90IGluc2VydGVkLi4uXG5cdFx0XHRwbHVnaW5zLnB1c2gocGx1Zyk7XG5cdFx0fVxuXHR9XG59XG5cbmxldFxuXHRwcml2YXRlcyA9IHt9LFxuXHRwbHVnaW5zID0gW107XG5cbmZ1bmN0aW9uIHBsdWdpbiAobWV0aG9kLCBub2RlLCBhLCBiLCBjKSB7XG5cdHBsdWdpbnMuZm9yRWFjaChmdW5jdGlvbiAocGx1Zykge1xuXHRcdGlmIChwbHVnW21ldGhvZF0pIHtcblx0XHRcdHBsdWdbbWV0aG9kXShub2RlLCBhLCBiLCBjKTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBvbkNoZWNrRG9tUmVhZHkgKCkge1xuXHRpZiAodGhpcy5ET01TVEFURSAhPT0gJ2Nvbm5lY3RlZCcgfHwgcHJpdmF0ZXNbdGhpcy5fdWlkXS5kb21SZWFkeUZpcmVkKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0bGV0XG5cdFx0Y291bnQgPSAwLFxuXHRcdGNoaWxkcmVuID0gZ2V0Q2hpbGRDdXN0b21Ob2Rlcyh0aGlzKSxcblx0XHRvdXJEb21SZWFkeSA9IG9uU2VsZkRvbVJlYWR5LmJpbmQodGhpcyk7XG5cblx0ZnVuY3Rpb24gYWRkUmVhZHkgKCkge1xuXHRcdGNvdW50Kys7XG5cdFx0aWYgKGNvdW50ID09PSBjaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdG91ckRvbVJlYWR5KCk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gSWYgbm8gY2hpbGRyZW4sIHdlJ3JlIGdvb2QgLSBsZWFmIG5vZGUuIENvbW1lbmNlIHdpdGggb25Eb21SZWFkeVxuXHQvL1xuXHRpZiAoIWNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdG91ckRvbVJlYWR5KCk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ly8gZWxzZSwgd2FpdCBmb3IgYWxsIGNoaWxkcmVuIHRvIGZpcmUgdGhlaXIgYHJlYWR5YCBldmVudHNcblx0XHQvL1xuXHRcdGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG5cdFx0XHQvLyBjaGVjayBpZiBjaGlsZCBpcyBhbHJlYWR5IHJlYWR5XG5cdFx0XHQvLyBhbHNvIGNoZWNrIGZvciBjb25uZWN0ZWQgLSB0aGlzIGhhbmRsZXMgbW92aW5nIGEgbm9kZSBmcm9tIGFub3RoZXIgbm9kZVxuXHRcdFx0Ly8gTk9QRSwgdGhhdCBmYWlsZWQuIHJlbW92ZWQgZm9yIG5vdyBjaGlsZC5ET01TVEFURSA9PT0gJ2Nvbm5lY3RlZCdcblx0XHRcdGlmIChjaGlsZC5ET01TVEFURSA9PT0gJ2RvbXJlYWR5Jykge1xuXHRcdFx0XHRhZGRSZWFkeSgpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gaWYgbm90LCB3YWl0IGZvciBldmVudFxuXHRcdFx0Y2hpbGQub24oJ2RvbXJlYWR5JywgYWRkUmVhZHkpO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG9uU2VsZkRvbVJlYWR5ICgpIHtcblx0cHJpdmF0ZXNbdGhpcy5fdWlkXS5ET01TVEFURSA9ICdkb21yZWFkeSc7XG5cdC8vIGRvbVJlYWR5IHNob3VsZCBvbmx5IGV2ZXIgZmlyZSBvbmNlXG5cdHByaXZhdGVzW3RoaXMuX3VpZF0uZG9tUmVhZHlGaXJlZCA9IHRydWU7XG5cdHBsdWdpbigncHJlRG9tUmVhZHknLCB0aGlzKTtcblx0Ly8gY2FsbCB0aGlzLmRvbVJlYWR5IGZpcnN0LCBzbyB0aGF0IHRoZSBjb21wb25lbnRcblx0Ly8gY2FuIGZpbmlzaCBpbml0aWFsaXppbmcgYmVmb3JlIGZpcmluZyBhbnlcblx0Ly8gc3Vic2VxdWVudCBldmVudHNcblx0aWYgKHRoaXMuZG9tUmVhZHkpIHtcblx0XHR0aGlzLmRvbVJlYWR5KCk7XG5cdFx0dGhpcy5kb21SZWFkeSA9IGZ1bmN0aW9uICgpIHt9O1xuXHR9XG5cblx0Ly8gYWxsb3cgY29tcG9uZW50IHRvIGZpcmUgdGhpcyBldmVudFxuXHQvLyBkb21SZWFkeSgpIHdpbGwgc3RpbGwgYmUgY2FsbGVkXG5cdGlmICghdGhpcy5maXJlT3duRG9tcmVhZHkpIHtcblx0XHR0aGlzLmZpcmUoJ2RvbXJlYWR5Jyk7XG5cdH1cblxuXHRwbHVnaW4oJ3Bvc3REb21SZWFkeScsIHRoaXMpO1xufVxuXG5mdW5jdGlvbiBnZXRDaGlsZEN1c3RvbU5vZGVzIChub2RlKSB7XG5cdC8vIGNvbGxlY3QgYW55IGNoaWxkcmVuIHRoYXQgYXJlIGN1c3RvbSBub2Rlc1xuXHQvLyB1c2VkIHRvIGNoZWNrIGlmIHRoZWlyIGRvbSBpcyByZWFkeSBiZWZvcmVcblx0Ly8gZGV0ZXJtaW5pbmcgaWYgdGhpcyBpcyByZWFkeVxuXHRsZXQgaSwgbm9kZXMgPSBbXTtcblx0Zm9yIChpID0gMDsgaSA8IG5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRpZiAobm9kZS5jaGlsZHJlbltpXS5ub2RlTmFtZS5pbmRleE9mKCctJykgPiAtMSkge1xuXHRcdFx0bm9kZXMucHVzaChub2RlLmNoaWxkcmVuW2ldKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIG5vZGVzO1xufVxuXG5mdW5jdGlvbiBuZXh0VGljayAoY2IpIHtcblx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNiKTtcbn1cblxuY29uc3QgdWlkcyA9IHt9O1xuZnVuY3Rpb24gdWlkICh0eXBlID0gJ3VpZCcpIHtcblx0aWYgKHVpZHNbdHlwZV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdHVpZHNbdHlwZV0gPSAwO1xuXHR9XG5cdGNvbnN0IGlkID0gdHlwZSArICctJyArICh1aWRzW3R5cGVdICsgMSk7XG5cdHVpZHNbdHlwZV0rKztcblx0cmV0dXJuIGlkO1xufVxuXG5jb25zdCBkZXN0cm95ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbmZ1bmN0aW9uIGRlc3Ryb3kgKG5vZGUpIHtcblx0aWYgKG5vZGUpIHtcblx0XHRkZXN0cm95ZXIuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0ZGVzdHJveWVyLmlubmVySFRNTCA9ICcnO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1ha2VHbG9iYWxMaXN0ZW5lcnMgKG5hbWUsIGV2ZW50TmFtZSkge1xuXHR3aW5kb3dbbmFtZV0gPSBmdW5jdGlvbiAobm9kZU9yTm9kZXMsIGNhbGxiYWNrKSB7XG5cdFx0ZnVuY3Rpb24gaGFuZGxlRG9tUmVhZHkgKG5vZGUsIGNiKSB7XG5cdFx0XHRmdW5jdGlvbiBvblJlYWR5ICgpIHtcblx0XHRcdFx0Y2Iobm9kZSk7XG5cdFx0XHRcdG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIG9uUmVhZHkpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobm9kZS5ET01TVEFURSA9PT0gZXZlbnROYW1lIHx8IG5vZGUuRE9NU1RBVEUgPT09ICdkb21yZWFkeScpIHtcblx0XHRcdFx0Y2Iobm9kZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgb25SZWFkeSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KG5vZGVPck5vZGVzKSkge1xuXHRcdFx0aGFuZGxlRG9tUmVhZHkobm9kZU9yTm9kZXMsIGNhbGxiYWNrKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRsZXQgY291bnQgPSAwO1xuXG5cdFx0ZnVuY3Rpb24gb25BcnJheU5vZGVSZWFkeSAoKSB7XG5cdFx0XHRjb3VudCsrO1xuXHRcdFx0aWYgKGNvdW50ID09PSBub2RlT3JOb2Rlcy5sZW5ndGgpIHtcblx0XHRcdFx0Y2FsbGJhY2sobm9kZU9yTm9kZXMpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZU9yTm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGhhbmRsZURvbVJlYWR5KG5vZGVPck5vZGVzW2ldLCBvbkFycmF5Tm9kZVJlYWR5KTtcblx0XHR9XG5cdH07XG59XG5cbm1ha2VHbG9iYWxMaXN0ZW5lcnMoJ29uRG9tUmVhZHknLCAnZG9tcmVhZHknKTtcbm1ha2VHbG9iYWxMaXN0ZW5lcnMoJ29uQ29ubmVjdGVkJywgJ2Nvbm5lY3RlZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VDb21wb25lbnQ7IiwiY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJy4vQmFzZUNvbXBvbmVudCcpO1xuXG5mdW5jdGlvbiBzZXRCb29sZWFuIChub2RlLCBwcm9wKSB7XG5cdGxldCBwcm9wVmFsdWU7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBwcm9wLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0Z2V0ICgpIHtcblx0XHRcdGNvbnN0IGF0dCA9IHRoaXMuZ2V0QXR0cmlidXRlKHByb3ApO1xuXHRcdFx0cmV0dXJuIChhdHQgIT09IHVuZGVmaW5lZCAmJiBhdHQgIT09IG51bGwgJiYgYXR0ICE9PSAnZmFsc2UnICYmIGF0dCAhPT0gZmFsc2UpO1xuXHRcdH0sXG5cdFx0c2V0ICh2YWx1ZSkge1xuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSB0cnVlO1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdHRoaXMuc2V0QXR0cmlidXRlKHByb3AsICcnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucmVtb3ZlQXR0cmlidXRlKHByb3ApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuYXR0cmlidXRlQ2hhbmdlZCkge1xuXHRcdFx0XHR0aGlzLmF0dHJpYnV0ZUNoYW5nZWQocHJvcCwgdmFsdWUpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZm4gPSB0aGlzW29uaWZ5KHByb3ApXTtcblx0XHRcdGlmIChmbikge1xuXHRcdFx0XHRjb25zdCBldmVudE5hbWUgPSB0aGlzLmNvbm5lY3RlZFByb3BzID8gJ29uQ29ubmVjdGVkJyA6ICdvbkRvbVJlYWR5Jztcblx0XHRcdFx0d2luZG93W2V2ZW50TmFtZV0odGhpcywgKCkgPT4ge1xuXG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgcHJvcFZhbHVlICE9PSB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0dmFsdWUgPSBmbi5jYWxsKHRoaXMsIHZhbHVlKSB8fCB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cHJvcFZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldFByb3BlcnR5IChub2RlLCBwcm9wKSB7XG5cdGxldCBwcm9wVmFsdWU7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBwcm9wLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0Z2V0ICgpIHtcblx0XHRcdHJldHVybiBwcm9wVmFsdWUgIT09IHVuZGVmaW5lZCA/IHByb3BWYWx1ZSA6IG5vcm1hbGl6ZSh0aGlzLmdldEF0dHJpYnV0ZShwcm9wKSk7XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHR0aGlzLnNldEF0dHJpYnV0ZShwcm9wLCB2YWx1ZSk7XG5cdFx0XHRpZiAodGhpcy5hdHRyaWJ1dGVDaGFuZ2VkKSB7XG5cdFx0XHRcdHRoaXMuYXR0cmlidXRlQ2hhbmdlZChwcm9wLCB2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBmbiA9IHRoaXNbb25pZnkocHJvcCldO1xuXHRcdFx0aWYoZm4pe1xuXHRcdFx0XHRjb25zdCBldmVudE5hbWUgPSB0aGlzLmNvbm5lY3RlZFByb3BzID8gJ29uQ29ubmVjdGVkJyA6ICdvbkRvbVJlYWR5Jztcblx0XHRcdFx0d2luZG93W2V2ZW50TmFtZV0odGhpcywgKCkgPT4ge1xuXHRcdFx0XHRcdGlmKHZhbHVlICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdFx0cHJvcFZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dmFsdWUgPSBmbi5jYWxsKHRoaXMsIHZhbHVlKSB8fCB2YWx1ZTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldE9iamVjdCAobm9kZSwgcHJvcCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gdGhpc1snX18nICsgcHJvcF07XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzWydfXycgKyBwcm9wXSA9IHZhbHVlO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldFByb3BlcnRpZXMgKG5vZGUpIHtcblx0bGV0IHByb3BzID0gbm9kZS5wcm9wcyB8fCBub2RlLnByb3BlcnRpZXM7XG5cdGlmIChwcm9wcykge1xuXHRcdHByb3BzLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdGlmIChwcm9wID09PSAnZGlzYWJsZWQnKSB7XG5cdFx0XHRcdHNldEJvb2xlYW4obm9kZSwgcHJvcCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0c2V0UHJvcGVydHkobm9kZSwgcHJvcCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2V0Qm9vbGVhbnMgKG5vZGUpIHtcblx0bGV0IHByb3BzID0gbm9kZS5ib29scyB8fCBub2RlLmJvb2xlYW5zO1xuXHRpZiAocHJvcHMpIHtcblx0XHRwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRzZXRCb29sZWFuKG5vZGUsIHByb3ApO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNldE9iamVjdHMgKG5vZGUpIHtcblx0bGV0IHByb3BzID0gbm9kZS5vYmplY3RzO1xuXHRpZiAocHJvcHMpIHtcblx0XHRwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRzZXRPYmplY3Qobm9kZSwgcHJvcCk7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY2FwIChuYW1lKSB7XG5cdHJldHVybiBuYW1lLnN1YnN0cmluZygwLDEpLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcbn1cblxuZnVuY3Rpb24gb25pZnkgKG5hbWUpIHtcblx0cmV0dXJuICdvbicgKyBuYW1lLnNwbGl0KCctJykubWFwKHdvcmQgPT4gY2FwKHdvcmQpKS5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gaXNCb29sIChub2RlLCBuYW1lKSB7XG5cdHJldHVybiAobm9kZS5ib29scyB8fCBub2RlLmJvb2xlYW5zIHx8IFtdKS5pbmRleE9mKG5hbWUpID4gLTE7XG59XG5cbmZ1bmN0aW9uIGJvb2xOb3JtICh2YWx1ZSkge1xuXHRpZih2YWx1ZSA9PT0gJycpe1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdHJldHVybiBub3JtYWxpemUodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBwcm9wTm9ybSAodmFsdWUpIHtcblx0cmV0dXJuIG5vcm1hbGl6ZSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZSh2YWwpIHtcblx0aWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG5cdFx0dmFsID0gdmFsLnRyaW0oKTtcblx0XHRpZiAodmFsID09PSAnZmFsc2UnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSBlbHNlIGlmICh2YWwgPT09ICdudWxsJykge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSBlbHNlIGlmICh2YWwgPT09ICd0cnVlJykge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdC8vIGZpbmRzIHN0cmluZ3MgdGhhdCBzdGFydCB3aXRoIG51bWJlcnMsIGJ1dCBhcmUgbm90IG51bWJlcnM6XG5cdFx0Ly8gJzF0ZWFtJyAnMTIzIFN0cmVldCcsICcxLTItMycsIGV0Y1xuXHRcdGlmICgoJycgKyB2YWwpLnJlcGxhY2UoLy0/XFxkKlxcLj9cXGQqLywgJycpLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIHZhbDtcblx0XHR9XG5cdH1cblx0aWYgKCFpc05hTihwYXJzZUZsb2F0KHZhbCkpKSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodmFsKTtcblx0fVxuXHRyZXR1cm4gdmFsO1xufVxuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG5cdG5hbWU6ICdwcm9wZXJ0aWVzJyxcblx0b3JkZXI6IDEwLFxuXHRpbml0OiBmdW5jdGlvbiAobm9kZSkge1xuXHRcdHNldFByb3BlcnRpZXMobm9kZSk7XG5cdFx0c2V0Qm9vbGVhbnMobm9kZSk7XG5cdH0sXG5cdHByZUF0dHJpYnV0ZUNoYW5nZWQ6IGZ1bmN0aW9uIChub2RlLCBuYW1lLCB2YWx1ZSkge1xuXHRcdGlmIChub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRpZihpc0Jvb2wobm9kZSwgbmFtZSkpe1xuXHRcdFx0dmFsdWUgPSBib29sTm9ybSh2YWx1ZSk7XG5cdFx0XHRub2RlW25hbWVdID0gISF2YWx1ZTtcblx0XHRcdGlmKCF2YWx1ZSl7XG5cdFx0XHRcdG5vZGVbbmFtZV0gPSBmYWxzZTtcblx0XHRcdFx0bm9kZS5pc1NldHRpbmdBdHRyaWJ1dGUgPSB0cnVlO1xuXHRcdFx0XHRub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcblx0XHRcdFx0bm9kZS5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG5vZGVbbmFtZV0gPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdG5vZGVbbmFtZV0gPSBwcm9wTm9ybSh2YWx1ZSk7XG5cdH1cbn0pOyIsImNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCcuL0Jhc2VDb21wb25lbnQnKTtcblxuZnVuY3Rpb24gYXNzaWduUmVmcyAobm9kZSkge1xuXG4gICAgWy4uLm5vZGUucXVlcnlTZWxlY3RvckFsbCgnW3JlZl0nKV0uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgbGV0IG5hbWUgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ3JlZicpO1xuXHRcdGNoaWxkLnJlbW92ZUF0dHJpYnV0ZSgncmVmJyk7XG4gICAgICAgIG5vZGVbbmFtZV0gPSBjaGlsZDtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYXNzaWduRXZlbnRzIChub2RlKSB7XG4gICAgLy8gPGRpdiBvbj1cImNsaWNrOm9uQ2xpY2tcIj5cblx0Wy4uLm5vZGUucXVlcnlTZWxlY3RvckFsbCgnW29uXScpXS5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCwgaSwgY2hpbGRyZW4pIHtcblx0XHRpZihjaGlsZCA9PT0gbm9kZSl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGxldFxuICAgICAgICAgICAga2V5VmFsdWUgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ29uJyksXG4gICAgICAgICAgICBldmVudCA9IGtleVZhbHVlLnNwbGl0KCc6JylbMF0udHJpbSgpLFxuICAgICAgICAgICAgbWV0aG9kID0ga2V5VmFsdWUuc3BsaXQoJzonKVsxXS50cmltKCk7XG5cdFx0Ly8gcmVtb3ZlLCBzbyBwYXJlbnQgZG9lcyBub3QgdHJ5IHRvIHVzZSBpdFxuXHRcdGNoaWxkLnJlbW92ZUF0dHJpYnV0ZSgnb24nKTtcblxuICAgICAgICBub2RlLm9uKGNoaWxkLCBldmVudCwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIG5vZGVbbWV0aG9kXShlKVxuICAgICAgICB9KVxuICAgIH0pO1xufVxuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ3JlZnMnLFxuICAgIG9yZGVyOiAzMCxcbiAgICBwcmVDb25uZWN0ZWQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGFzc2lnblJlZnMobm9kZSk7XG4gICAgICAgIGFzc2lnbkV2ZW50cyhub2RlKTtcbiAgICB9XG59KTsiLCJjb25zdCBCYXNlQ29tcG9uZW50ICA9IHJlcXVpcmUoJy4vQmFzZUNvbXBvbmVudCcpO1xuXG5jb25zdCBsaWdodE5vZGVzID0ge307XG5jb25zdCBpbnNlcnRlZCA9IHt9O1xuXG5mdW5jdGlvbiBpbnNlcnQgKG5vZGUpIHtcbiAgICBpZihpbnNlcnRlZFtub2RlLl91aWRdIHx8ICFoYXNUZW1wbGF0ZShub2RlKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29sbGVjdExpZ2h0Tm9kZXMobm9kZSk7XG4gICAgaW5zZXJ0VGVtcGxhdGUobm9kZSk7XG4gICAgaW5zZXJ0ZWRbbm9kZS5fdWlkXSA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RMaWdodE5vZGVzKG5vZGUpe1xuICAgIGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSB8fCBbXTtcbiAgICB3aGlsZShub2RlLmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgbGlnaHROb2Rlc1tub2RlLl91aWRdLnB1c2gobm9kZS5yZW1vdmVDaGlsZChub2RlLmNoaWxkTm9kZXNbMF0pKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlIChub2RlKSB7XG5cdHJldHVybiBub2RlLnRlbXBsYXRlU3RyaW5nIHx8IG5vZGUudGVtcGxhdGVJZDtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGVDaGFpbiAobm9kZSkge1xuICAgIGNvbnN0IHRlbXBsYXRlcyA9IG5vZGUuZ2V0VGVtcGxhdGVDaGFpbigpO1xuICAgIHRlbXBsYXRlcy5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbiAodGVtcGxhdGUpIHtcbiAgICAgICAgZ2V0Q29udGFpbmVyKG5vZGUpLmFwcGVuZENoaWxkKEJhc2VDb21wb25lbnQuY2xvbmUodGVtcGxhdGUpKTtcbiAgICB9KTtcbiAgICBpbnNlcnRDaGlsZHJlbihub2RlKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGUgKG5vZGUpIHtcbiAgICBpZihub2RlLm5lc3RlZFRlbXBsYXRlKXtcbiAgICAgICAgaW5zZXJ0VGVtcGxhdGVDaGFpbihub2RlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZU5vZGUgPSBub2RlLmdldFRlbXBsYXRlTm9kZSgpO1xuXG4gICAgaWYodGVtcGxhdGVOb2RlKSB7XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoQmFzZUNvbXBvbmVudC5jbG9uZSh0ZW1wbGF0ZU5vZGUpKTtcbiAgICB9XG4gICAgaW5zZXJ0Q2hpbGRyZW4obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGdldENvbnRhaW5lciAobm9kZSkge1xuICAgIGNvbnN0IGNvbnRhaW5lcnMgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tyZWY9XCJjb250YWluZXJcIl0nKTtcbiAgICBpZighY29udGFpbmVycyB8fCAhY29udGFpbmVycy5sZW5ndGgpe1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcnNbY29udGFpbmVycy5sZW5ndGggLSAxXTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Q2hpbGRyZW4gKG5vZGUpIHtcbiAgICBsZXQgaTtcblx0Y29uc3QgY29udGFpbmVyID0gZ2V0Q29udGFpbmVyKG5vZGUpO1xuXHRjb25zdCBjaGlsZHJlbiA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXTtcblxuICAgIGlmKGNvbnRhaW5lciAmJiBjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpe1xuICAgICAgICBmb3IoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY2hpbGRyZW5baV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b0RvbSAoaHRtbCl7XG5cdGNvbnN0IG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0bm9kZS5pbm5lckhUTUwgPSBodG1sO1xuXHRyZXR1cm4gbm9kZS5maXJzdENoaWxkO1xufVxuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRMaWdodE5vZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBsaWdodE5vZGVzW3RoaXMuX3VpZF07XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZU5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY2FjaGluZyBjYXVzZXMgZGlmZmVyZW50IGNsYXNzZXMgdG8gcHVsbCB0aGUgc2FtZSB0ZW1wbGF0ZSAtIHdhdD9cbiAgICAvL2lmKCF0aGlzLnRlbXBsYXRlTm9kZSkge1xuXHRpZiAodGhpcy50ZW1wbGF0ZUlkKSB7XG5cdFx0dGhpcy50ZW1wbGF0ZU5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLnRlbXBsYXRlSWQucmVwbGFjZSgnIycsJycpKTtcblx0fVxuXHRlbHNlIGlmICh0aGlzLnRlbXBsYXRlU3RyaW5nKSB7XG5cdFx0dGhpcy50ZW1wbGF0ZU5vZGUgPSB0b0RvbSgnPHRlbXBsYXRlPicgKyB0aGlzLnRlbXBsYXRlU3RyaW5nICsgJzwvdGVtcGxhdGU+Jyk7XG5cdH1cbiAgICAvL31cbiAgICByZXR1cm4gdGhpcy50ZW1wbGF0ZU5vZGU7XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZUNoYWluID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0XG4gICAgICAgIGNvbnRleHQgPSB0aGlzLFxuICAgICAgICB0ZW1wbGF0ZXMgPSBbXSxcbiAgICAgICAgdGVtcGxhdGU7XG5cbiAgICAvLyB3YWxrIHRoZSBwcm90b3R5cGUgY2hhaW47IEJhYmVsIGRvZXNuJ3QgYWxsb3cgdXNpbmdcbiAgICAvLyBgc3VwZXJgIHNpbmNlIHdlIGFyZSBvdXRzaWRlIG9mIHRoZSBDbGFzc1xuICAgIHdoaWxlKGNvbnRleHQpe1xuICAgICAgICBjb250ZXh0ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbnRleHQpO1xuICAgICAgICBpZighY29udGV4dCl7IGJyZWFrOyB9XG4gICAgICAgIC8vIHNraXAgcHJvdG90eXBlcyB3aXRob3V0IGEgdGVtcGxhdGVcbiAgICAgICAgLy8gKGVsc2UgaXQgd2lsbCBwdWxsIGFuIGluaGVyaXRlZCB0ZW1wbGF0ZSBhbmQgY2F1c2UgZHVwbGljYXRlcylcbiAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eSgndGVtcGxhdGVTdHJpbmcnKSB8fCBjb250ZXh0Lmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZUlkJykpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gY29udGV4dC5nZXRUZW1wbGF0ZU5vZGUoKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGVtcGxhdGVzO1xufTtcblxuQmFzZUNvbXBvbmVudC5hZGRQbHVnaW4oe1xuICAgIG5hbWU6ICd0ZW1wbGF0ZScsXG4gICAgb3JkZXI6IDIwLFxuICAgIHByZUNvbm5lY3RlZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaW5zZXJ0KG5vZGUpO1xuICAgIH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnQGNsdWJhamF4L2Jhc2UtY29tcG9uZW50L3NyYy9CYXNlQ29tcG9uZW50Jyk7XG5yZXF1aXJlKCdAY2x1YmFqYXgvYmFzZS1jb21wb25lbnQvc3JjL3RlbXBsYXRlJyk7XG5yZXF1aXJlKCdAY2x1YmFqYXgvYmFzZS1jb21wb25lbnQvc3JjL3Byb3BlcnRpZXMnKTtcbnJlcXVpcmUoJ0BjbHViYWpheC9iYXNlLWNvbXBvbmVudC9zcmMvcmVmcycpOyIsIihmdW5jdGlvbiAoKSB7XG5pZih3aW5kb3dbJ2ZvcmNlLW5vLWNlLXNoaW0nXSl7XG5cdHJldHVybjtcbn1cbnZhciBzdXBwb3J0c1YxID0gJ2N1c3RvbUVsZW1lbnRzJyBpbiB3aW5kb3c7XG52YXIgbmF0aXZlU2hpbUJhc2U2NCA9IFwiWm5WdVkzUnBiMjRnYm1GMGFYWmxVMmhwYlNncGV5Z29LVDArZXlkMWMyVWdjM1J5YVdOMEp6dHBaaWdoZDJsdVpHOTNMbU4xYzNSdmJVVnNaVzFsYm5SektYSmxkSFZ5Ymp0amIyNXpkQ0JoUFhkcGJtUnZkeTVJVkUxTVJXeGxiV1Z1ZEN4aVBYZHBibVJ2ZHk1amRYTjBiMjFGYkdWdFpXNTBjeTVrWldacGJtVXNZejEzYVc1a2IzY3VZM1Z6ZEc5dFJXeGxiV1Z1ZEhNdVoyVjBMR1E5Ym1WM0lFMWhjQ3hsUFc1bGR5Qk5ZWEE3YkdWMElHWTlJVEVzWnowaE1UdDNhVzVrYjNjdVNGUk5URVZzWlcxbGJuUTlablZ1WTNScGIyNG9LWHRwWmlnaFppbDdZMjl1YzNRZ2FqMWtMbWRsZENoMGFHbHpMbU52Ym5OMGNuVmpkRzl5S1N4clBXTXVZMkZzYkNoM2FXNWtiM2N1WTNWemRHOXRSV3hsYldWdWRITXNhaWs3WnowaE1EdGpiMjV6ZENCc1BXNWxkeUJyTzNKbGRIVnliaUJzZldZOUlURTdmU3gzYVc1a2IzY3VTRlJOVEVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsUFdFdWNISnZkRzkwZVhCbE8wOWlhbVZqZEM1a1pXWnBibVZRY205d1pYSjBlU2gzYVc1a2IzY3NKMk4xYzNSdmJVVnNaVzFsYm5Sekp5eDdkbUZzZFdVNmQybHVaRzkzTG1OMWMzUnZiVVZzWlcxbGJuUnpMR052Ym1acFozVnlZV0pzWlRvaE1DeDNjbWwwWVdKc1pUb2hNSDBwTEU5aWFtVmpkQzVrWldacGJtVlFjbTl3WlhKMGVTaDNhVzVrYjNjdVkzVnpkRzl0Uld4bGJXVnVkSE1zSjJSbFptbHVaU2NzZTNaaGJIVmxPaWhxTEdzcFBUNTdZMjl1YzNRZ2JEMXJMbkJ5YjNSdmRIbHdaU3h0UFdOc1lYTnpJR1Y0ZEdWdVpITWdZWHRqYjI1emRISjFZM1J2Y2lncGUzTjFjR1Z5S0Nrc1QySnFaV04wTG5ObGRGQnliM1J2ZEhsd1pVOW1LSFJvYVhNc2JDa3NaM3g4S0dZOUlUQXNheTVqWVd4c0tIUm9hWE1wS1N4blBTRXhPMzE5TEc0OWJTNXdjbTkwYjNSNWNHVTdiUzV2WW5ObGNuWmxaRUYwZEhKcFluVjBaWE05YXk1dlluTmxjblpsWkVGMGRISnBZblYwWlhNc2JpNWpiMjV1WldOMFpXUkRZV3hzWW1GamF6MXNMbU52Ym01bFkzUmxaRU5oYkd4aVlXTnJMRzR1WkdselkyOXVibVZqZEdWa1EyRnNiR0poWTJzOWJDNWthWE5qYjI1dVpXTjBaV1JEWVd4c1ltRmpheXh1TG1GMGRISnBZblYwWlVOb1lXNW5aV1JEWVd4c1ltRmphejFzTG1GMGRISnBZblYwWlVOb1lXNW5aV1JEWVd4c1ltRmpheXh1TG1Ga2IzQjBaV1JEWVd4c1ltRmphejFzTG1Ga2IzQjBaV1JEWVd4c1ltRmpheXhrTG5ObGRDaHJMR29wTEdVdWMyVjBLR29zYXlrc1lpNWpZV3hzS0hkcGJtUnZkeTVqZFhOMGIyMUZiR1Z0Wlc1MGN5eHFMRzBwTzMwc1kyOXVabWxuZFhKaFlteGxPaUV3TEhkeWFYUmhZbXhsT2lFd2ZTa3NUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblI1S0hkcGJtUnZkeTVqZFhOMGIyMUZiR1Z0Wlc1MGN5d25aMlYwSnl4N2RtRnNkV1U2S0dvcFBUNWxMbWRsZENocUtTeGpiMjVtYVdkMWNtRmliR1U2SVRBc2QzSnBkR0ZpYkdVNklUQjlLVHQ5S1NncE8zMD1cIjtcblxuaWYoc3VwcG9ydHNWMSAmJiAhd2luZG93Wydmb3JjZS1jZS1zaGltJ10pe1xuaWYoIXdpbmRvd1snbm8tbmF0aXZlLXNoaW0nXSkge1xuZXZhbCh3aW5kb3cuYXRvYihuYXRpdmVTaGltQmFzZTY0KSk7XG5uYXRpdmVTaGltKCk7XG59XG59ZWxzZXtcbmN1c3RvbUVsZW1lbnRzKCk7XG59XG5cbmZ1bmN0aW9uIGN1c3RvbUVsZW1lbnRzKCkge1xuKGZ1bmN0aW9uKCl7XG4vLyBAbGljZW5zZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4ndXNlIHN0cmljdCc7dmFyIGc9bmV3IGZ1bmN0aW9uKCl7fTt2YXIgYWE9bmV3IFNldChcImFubm90YXRpb24teG1sIGNvbG9yLXByb2ZpbGUgZm9udC1mYWNlIGZvbnQtZmFjZS1zcmMgZm9udC1mYWNlLXVyaSBmb250LWZhY2UtZm9ybWF0IGZvbnQtZmFjZS1uYW1lIG1pc3NpbmctZ2x5cGhcIi5zcGxpdChcIiBcIikpO2Z1bmN0aW9uIGsoYil7dmFyIGE9YWEuaGFzKGIpO2I9L15bYS16XVsuMC05X2Etel0qLVtcXC0uMC05X2Etel0qJC8udGVzdChiKTtyZXR1cm4hYSYmYn1mdW5jdGlvbiBsKGIpe3ZhciBhPWIuaXNDb25uZWN0ZWQ7aWYodm9pZCAwIT09YSlyZXR1cm4gYTtmb3IoO2ImJiEoYi5fX0NFX2lzSW1wb3J0RG9jdW1lbnR8fGIgaW5zdGFuY2VvZiBEb2N1bWVudCk7KWI9Yi5wYXJlbnROb2RlfHwod2luZG93LlNoYWRvd1Jvb3QmJmIgaW5zdGFuY2VvZiBTaGFkb3dSb290P2IuaG9zdDp2b2lkIDApO3JldHVybiEoIWJ8fCEoYi5fX0NFX2lzSW1wb3J0RG9jdW1lbnR8fGIgaW5zdGFuY2VvZiBEb2N1bWVudCkpfVxuZnVuY3Rpb24gbShiLGEpe2Zvcig7YSYmYSE9PWImJiFhLm5leHRTaWJsaW5nOylhPWEucGFyZW50Tm9kZTtyZXR1cm4gYSYmYSE9PWI/YS5uZXh0U2libGluZzpudWxsfVxuZnVuY3Rpb24gbihiLGEsZSl7ZT1lP2U6bmV3IFNldDtmb3IodmFyIGM9YjtjOyl7aWYoYy5ub2RlVHlwZT09PU5vZGUuRUxFTUVOVF9OT0RFKXt2YXIgZD1jO2EoZCk7dmFyIGg9ZC5sb2NhbE5hbWU7aWYoXCJsaW5rXCI9PT1oJiZcImltcG9ydFwiPT09ZC5nZXRBdHRyaWJ1dGUoXCJyZWxcIikpe2M9ZC5pbXBvcnQ7aWYoYyBpbnN0YW5jZW9mIE5vZGUmJiFlLmhhcyhjKSlmb3IoZS5hZGQoYyksYz1jLmZpcnN0Q2hpbGQ7YztjPWMubmV4dFNpYmxpbmcpbihjLGEsZSk7Yz1tKGIsZCk7Y29udGludWV9ZWxzZSBpZihcInRlbXBsYXRlXCI9PT1oKXtjPW0oYixkKTtjb250aW51ZX1pZihkPWQuX19DRV9zaGFkb3dSb290KWZvcihkPWQuZmlyc3RDaGlsZDtkO2Q9ZC5uZXh0U2libGluZyluKGQsYSxlKX1jPWMuZmlyc3RDaGlsZD9jLmZpcnN0Q2hpbGQ6bShiLGMpfX1mdW5jdGlvbiBxKGIsYSxlKXtiW2FdPWV9O2Z1bmN0aW9uIHIoKXt0aGlzLmE9bmV3IE1hcDt0aGlzLmY9bmV3IE1hcDt0aGlzLmM9W107dGhpcy5iPSExfWZ1bmN0aW9uIGJhKGIsYSxlKXtiLmEuc2V0KGEsZSk7Yi5mLnNldChlLmNvbnN0cnVjdG9yLGUpfWZ1bmN0aW9uIHQoYixhKXtiLmI9ITA7Yi5jLnB1c2goYSl9ZnVuY3Rpb24gdihiLGEpe2IuYiYmbihhLGZ1bmN0aW9uKGEpe3JldHVybiB3KGIsYSl9KX1mdW5jdGlvbiB3KGIsYSl7aWYoYi5iJiYhYS5fX0NFX3BhdGNoZWQpe2EuX19DRV9wYXRjaGVkPSEwO2Zvcih2YXIgZT0wO2U8Yi5jLmxlbmd0aDtlKyspYi5jW2VdKGEpfX1mdW5jdGlvbiB4KGIsYSl7dmFyIGU9W107bihhLGZ1bmN0aW9uKGIpe3JldHVybiBlLnB1c2goYil9KTtmb3IoYT0wO2E8ZS5sZW5ndGg7YSsrKXt2YXIgYz1lW2FdOzE9PT1jLl9fQ0Vfc3RhdGU/Yi5jb25uZWN0ZWRDYWxsYmFjayhjKTp5KGIsYyl9fVxuZnVuY3Rpb24geihiLGEpe3ZhciBlPVtdO24oYSxmdW5jdGlvbihiKXtyZXR1cm4gZS5wdXNoKGIpfSk7Zm9yKGE9MDthPGUubGVuZ3RoO2ErKyl7dmFyIGM9ZVthXTsxPT09Yy5fX0NFX3N0YXRlJiZiLmRpc2Nvbm5lY3RlZENhbGxiYWNrKGMpfX1cbmZ1bmN0aW9uIEEoYixhLGUpe2U9ZT9lOm5ldyBTZXQ7dmFyIGM9W107bihhLGZ1bmN0aW9uKGQpe2lmKFwibGlua1wiPT09ZC5sb2NhbE5hbWUmJlwiaW1wb3J0XCI9PT1kLmdldEF0dHJpYnV0ZShcInJlbFwiKSl7dmFyIGE9ZC5pbXBvcnQ7YSBpbnN0YW5jZW9mIE5vZGUmJlwiY29tcGxldGVcIj09PWEucmVhZHlTdGF0ZT8oYS5fX0NFX2lzSW1wb3J0RG9jdW1lbnQ9ITAsYS5fX0NFX2hhc1JlZ2lzdHJ5PSEwKTpkLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsZnVuY3Rpb24oKXt2YXIgYT1kLmltcG9ydDthLl9fQ0VfZG9jdW1lbnRMb2FkSGFuZGxlZHx8KGEuX19DRV9kb2N1bWVudExvYWRIYW5kbGVkPSEwLGEuX19DRV9pc0ltcG9ydERvY3VtZW50PSEwLGEuX19DRV9oYXNSZWdpc3RyeT0hMCxuZXcgU2V0KGUpLGUuZGVsZXRlKGEpLEEoYixhLGUpKX0pfWVsc2UgYy5wdXNoKGQpfSxlKTtpZihiLmIpZm9yKGE9MDthPGMubGVuZ3RoO2ErKyl3KGIsY1thXSk7Zm9yKGE9MDthPGMubGVuZ3RoO2ErKyl5KGIsXG5jW2FdKX1cbmZ1bmN0aW9uIHkoYixhKXtpZih2b2lkIDA9PT1hLl9fQ0Vfc3RhdGUpe3ZhciBlPWIuYS5nZXQoYS5sb2NhbE5hbWUpO2lmKGUpe2UuY29uc3RydWN0aW9uU3RhY2sucHVzaChhKTt2YXIgYz1lLmNvbnN0cnVjdG9yO3RyeXt0cnl7aWYobmV3IGMhPT1hKXRocm93IEVycm9yKFwiVGhlIGN1c3RvbSBlbGVtZW50IGNvbnN0cnVjdG9yIGRpZCBub3QgcHJvZHVjZSB0aGUgZWxlbWVudCBiZWluZyB1cGdyYWRlZC5cIik7fWZpbmFsbHl7ZS5jb25zdHJ1Y3Rpb25TdGFjay5wb3AoKX19Y2F0Y2goZil7dGhyb3cgYS5fX0NFX3N0YXRlPTIsZjt9YS5fX0NFX3N0YXRlPTE7YS5fX0NFX2RlZmluaXRpb249ZTtpZihlLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjaylmb3IoZT1lLm9ic2VydmVkQXR0cmlidXRlcyxjPTA7YzxlLmxlbmd0aDtjKyspe3ZhciBkPWVbY10saD1hLmdldEF0dHJpYnV0ZShkKTtudWxsIT09aCYmYi5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2soYSxkLG51bGwsaCxudWxsKX1sKGEpJiZiLmNvbm5lY3RlZENhbGxiYWNrKGEpfX19XG5yLnByb3RvdHlwZS5jb25uZWN0ZWRDYWxsYmFjaz1mdW5jdGlvbihiKXt2YXIgYT1iLl9fQ0VfZGVmaW5pdGlvbjthLmNvbm5lY3RlZENhbGxiYWNrJiZhLmNvbm5lY3RlZENhbGxiYWNrLmNhbGwoYil9O3IucHJvdG90eXBlLmRpc2Nvbm5lY3RlZENhbGxiYWNrPWZ1bmN0aW9uKGIpe3ZhciBhPWIuX19DRV9kZWZpbml0aW9uO2EuZGlzY29ubmVjdGVkQ2FsbGJhY2smJmEuZGlzY29ubmVjdGVkQ2FsbGJhY2suY2FsbChiKX07ci5wcm90b3R5cGUuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrPWZ1bmN0aW9uKGIsYSxlLGMsZCl7dmFyIGg9Yi5fX0NFX2RlZmluaXRpb247aC5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2smJi0xPGgub2JzZXJ2ZWRBdHRyaWJ1dGVzLmluZGV4T2YoYSkmJmguYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrLmNhbGwoYixhLGUsYyxkKX07ZnVuY3Rpb24gQihiLGEpe3RoaXMuYz1iO3RoaXMuYT1hO3RoaXMuYj12b2lkIDA7QSh0aGlzLmMsdGhpcy5hKTtcImxvYWRpbmdcIj09PXRoaXMuYS5yZWFkeVN0YXRlJiYodGhpcy5iPW5ldyBNdXRhdGlvbk9ic2VydmVyKHRoaXMuZi5iaW5kKHRoaXMpKSx0aGlzLmIub2JzZXJ2ZSh0aGlzLmEse2NoaWxkTGlzdDohMCxzdWJ0cmVlOiEwfSkpfWZ1bmN0aW9uIEMoYil7Yi5iJiZiLmIuZGlzY29ubmVjdCgpfUIucHJvdG90eXBlLmY9ZnVuY3Rpb24oYil7dmFyIGE9dGhpcy5hLnJlYWR5U3RhdGU7XCJpbnRlcmFjdGl2ZVwiIT09YSYmXCJjb21wbGV0ZVwiIT09YXx8Qyh0aGlzKTtmb3IoYT0wO2E8Yi5sZW5ndGg7YSsrKWZvcih2YXIgZT1iW2FdLmFkZGVkTm9kZXMsYz0wO2M8ZS5sZW5ndGg7YysrKUEodGhpcy5jLGVbY10pfTtmdW5jdGlvbiBjYSgpe3ZhciBiPXRoaXM7dGhpcy5iPXRoaXMuYT12b2lkIDA7dGhpcy5jPW5ldyBQcm9taXNlKGZ1bmN0aW9uKGEpe2IuYj1hO2IuYSYmYShiLmEpfSl9ZnVuY3Rpb24gRChiKXtpZihiLmEpdGhyb3cgRXJyb3IoXCJBbHJlYWR5IHJlc29sdmVkLlwiKTtiLmE9dm9pZCAwO2IuYiYmYi5iKHZvaWQgMCl9O2Z1bmN0aW9uIEUoYil7dGhpcy5mPSExO3RoaXMuYT1iO3RoaXMuaD1uZXcgTWFwO3RoaXMuZz1mdW5jdGlvbihiKXtyZXR1cm4gYigpfTt0aGlzLmI9ITE7dGhpcy5jPVtdO3RoaXMuaj1uZXcgQihiLGRvY3VtZW50KX1cbkUucHJvdG90eXBlLmw9ZnVuY3Rpb24oYixhKXt2YXIgZT10aGlzO2lmKCEoYSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ3VzdG9tIGVsZW1lbnQgY29uc3RydWN0b3JzIG11c3QgYmUgZnVuY3Rpb25zLlwiKTtpZighayhiKSl0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJUaGUgZWxlbWVudCBuYW1lICdcIitiK1wiJyBpcyBub3QgdmFsaWQuXCIpO2lmKHRoaXMuYS5hLmdldChiKSl0aHJvdyBFcnJvcihcIkEgY3VzdG9tIGVsZW1lbnQgd2l0aCBuYW1lICdcIitiK1wiJyBoYXMgYWxyZWFkeSBiZWVuIGRlZmluZWQuXCIpO2lmKHRoaXMuZil0aHJvdyBFcnJvcihcIkEgY3VzdG9tIGVsZW1lbnQgaXMgYWxyZWFkeSBiZWluZyBkZWZpbmVkLlwiKTt0aGlzLmY9ITA7dmFyIGMsZCxoLGYsdTt0cnl7dmFyIHA9ZnVuY3Rpb24oYil7dmFyIGE9UFtiXTtpZih2b2lkIDAhPT1hJiYhKGEgaW5zdGFuY2VvZiBGdW5jdGlvbikpdGhyb3cgRXJyb3IoXCJUaGUgJ1wiK2IrXCInIGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbi5cIik7XG5yZXR1cm4gYX0sUD1hLnByb3RvdHlwZTtpZighKFAgaW5zdGFuY2VvZiBPYmplY3QpKXRocm93IG5ldyBUeXBlRXJyb3IoXCJUaGUgY3VzdG9tIGVsZW1lbnQgY29uc3RydWN0b3IncyBwcm90b3R5cGUgaXMgbm90IGFuIG9iamVjdC5cIik7Yz1wKFwiY29ubmVjdGVkQ2FsbGJhY2tcIik7ZD1wKFwiZGlzY29ubmVjdGVkQ2FsbGJhY2tcIik7aD1wKFwiYWRvcHRlZENhbGxiYWNrXCIpO2Y9cChcImF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFja1wiKTt1PWEub2JzZXJ2ZWRBdHRyaWJ1dGVzfHxbXX1jYXRjaCh2YSl7cmV0dXJufWZpbmFsbHl7dGhpcy5mPSExfWJhKHRoaXMuYSxiLHtsb2NhbE5hbWU6Yixjb25zdHJ1Y3RvcjphLGNvbm5lY3RlZENhbGxiYWNrOmMsZGlzY29ubmVjdGVkQ2FsbGJhY2s6ZCxhZG9wdGVkQ2FsbGJhY2s6aCxhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2s6ZixvYnNlcnZlZEF0dHJpYnV0ZXM6dSxjb25zdHJ1Y3Rpb25TdGFjazpbXX0pO3RoaXMuYy5wdXNoKGIpO3RoaXMuYnx8KHRoaXMuYj1cbiEwLHRoaXMuZyhmdW5jdGlvbigpe2lmKCExIT09ZS5iKWZvcihlLmI9ITEsQShlLmEsZG9jdW1lbnQpOzA8ZS5jLmxlbmd0aDspe3ZhciBiPWUuYy5zaGlmdCgpOyhiPWUuaC5nZXQoYikpJiZEKGIpfX0pKX07RS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKGIpe2lmKGI9dGhpcy5hLmEuZ2V0KGIpKXJldHVybiBiLmNvbnN0cnVjdG9yfTtFLnByb3RvdHlwZS5vPWZ1bmN0aW9uKGIpe2lmKCFrKGIpKXJldHVybiBQcm9taXNlLnJlamVjdChuZXcgU3ludGF4RXJyb3IoXCInXCIrYitcIicgaXMgbm90IGEgdmFsaWQgY3VzdG9tIGVsZW1lbnQgbmFtZS5cIikpO3ZhciBhPXRoaXMuaC5nZXQoYik7aWYoYSlyZXR1cm4gYS5jO2E9bmV3IGNhO3RoaXMuaC5zZXQoYixhKTt0aGlzLmEuYS5nZXQoYikmJi0xPT09dGhpcy5jLmluZGV4T2YoYikmJkQoYSk7cmV0dXJuIGEuY307RS5wcm90b3R5cGUubT1mdW5jdGlvbihiKXtDKHRoaXMuaik7dmFyIGE9dGhpcy5nO3RoaXMuZz1mdW5jdGlvbihlKXtyZXR1cm4gYihmdW5jdGlvbigpe3JldHVybiBhKGUpfSl9fTtcbndpbmRvdy5DdXN0b21FbGVtZW50UmVnaXN0cnk9RTtFLnByb3RvdHlwZS5kZWZpbmU9RS5wcm90b3R5cGUubDtFLnByb3RvdHlwZS5nZXQ9RS5wcm90b3R5cGUuZ2V0O0UucHJvdG90eXBlLndoZW5EZWZpbmVkPUUucHJvdG90eXBlLm87RS5wcm90b3R5cGUucG9seWZpbGxXcmFwRmx1c2hDYWxsYmFjaz1FLnByb3RvdHlwZS5tO3ZhciBGPXdpbmRvdy5Eb2N1bWVudC5wcm90b3R5cGUuY3JlYXRlRWxlbWVudCxkYT13aW5kb3cuRG9jdW1lbnQucHJvdG90eXBlLmNyZWF0ZUVsZW1lbnROUyxlYT13aW5kb3cuRG9jdW1lbnQucHJvdG90eXBlLmltcG9ydE5vZGUsZmE9d2luZG93LkRvY3VtZW50LnByb3RvdHlwZS5wcmVwZW5kLGdhPXdpbmRvdy5Eb2N1bWVudC5wcm90b3R5cGUuYXBwZW5kLEc9d2luZG93Lk5vZGUucHJvdG90eXBlLmNsb25lTm9kZSxIPXdpbmRvdy5Ob2RlLnByb3RvdHlwZS5hcHBlbmRDaGlsZCxJPXdpbmRvdy5Ob2RlLnByb3RvdHlwZS5pbnNlcnRCZWZvcmUsSj13aW5kb3cuTm9kZS5wcm90b3R5cGUucmVtb3ZlQ2hpbGQsSz13aW5kb3cuTm9kZS5wcm90b3R5cGUucmVwbGFjZUNoaWxkLEw9T2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih3aW5kb3cuTm9kZS5wcm90b3R5cGUsXCJ0ZXh0Q29udGVudFwiKSxNPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5hdHRhY2hTaGFkb3csTj1PYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHdpbmRvdy5FbGVtZW50LnByb3RvdHlwZSxcblwiaW5uZXJIVE1MXCIpLE89d2luZG93LkVsZW1lbnQucHJvdG90eXBlLmdldEF0dHJpYnV0ZSxRPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5zZXRBdHRyaWJ1dGUsUj13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUucmVtb3ZlQXR0cmlidXRlLFM9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLmdldEF0dHJpYnV0ZU5TLFQ9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLnNldEF0dHJpYnV0ZU5TLFU9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLnJlbW92ZUF0dHJpYnV0ZU5TLFY9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLmluc2VydEFkamFjZW50RWxlbWVudCxoYT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUucHJlcGVuZCxpYT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUuYXBwZW5kLGphPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5iZWZvcmUsa2E9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLmFmdGVyLGxhPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5yZXBsYWNlV2l0aCxtYT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUucmVtb3ZlLFxubmE9d2luZG93LkhUTUxFbGVtZW50LFc9T2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih3aW5kb3cuSFRNTEVsZW1lbnQucHJvdG90eXBlLFwiaW5uZXJIVE1MXCIpLFg9d2luZG93LkhUTUxFbGVtZW50LnByb3RvdHlwZS5pbnNlcnRBZGphY2VudEVsZW1lbnQ7ZnVuY3Rpb24gb2EoKXt2YXIgYj1ZO3dpbmRvdy5IVE1MRWxlbWVudD1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoKXt2YXIgYT10aGlzLmNvbnN0cnVjdG9yLGM9Yi5mLmdldChhKTtpZighYyl0aHJvdyBFcnJvcihcIlRoZSBjdXN0b20gZWxlbWVudCBiZWluZyBjb25zdHJ1Y3RlZCB3YXMgbm90IHJlZ2lzdGVyZWQgd2l0aCBgY3VzdG9tRWxlbWVudHNgLlwiKTt2YXIgZD1jLmNvbnN0cnVjdGlvblN0YWNrO2lmKCFkLmxlbmd0aClyZXR1cm4gZD1GLmNhbGwoZG9jdW1lbnQsYy5sb2NhbE5hbWUpLE9iamVjdC5zZXRQcm90b3R5cGVPZihkLGEucHJvdG90eXBlKSxkLl9fQ0Vfc3RhdGU9MSxkLl9fQ0VfZGVmaW5pdGlvbj1jLHcoYixkKSxkO3ZhciBjPWQubGVuZ3RoLTEsaD1kW2NdO2lmKGg9PT1nKXRocm93IEVycm9yKFwiVGhlIEhUTUxFbGVtZW50IGNvbnN0cnVjdG9yIHdhcyBlaXRoZXIgY2FsbGVkIHJlZW50cmFudGx5IGZvciB0aGlzIGNvbnN0cnVjdG9yIG9yIGNhbGxlZCBtdWx0aXBsZSB0aW1lcy5cIik7XG5kW2NdPWc7T2JqZWN0LnNldFByb3RvdHlwZU9mKGgsYS5wcm90b3R5cGUpO3coYixoKTtyZXR1cm4gaH1hLnByb3RvdHlwZT1uYS5wcm90b3R5cGU7cmV0dXJuIGF9KCl9O2Z1bmN0aW9uIHBhKGIsYSxlKXthLnByZXBlbmQ9ZnVuY3Rpb24oYSl7Zm9yKHZhciBkPVtdLGM9MDtjPGFyZ3VtZW50cy5sZW5ndGg7KytjKWRbYy0wXT1hcmd1bWVudHNbY107Yz1kLmZpbHRlcihmdW5jdGlvbihiKXtyZXR1cm4gYiBpbnN0YW5jZW9mIE5vZGUmJmwoYil9KTtlLmkuYXBwbHkodGhpcyxkKTtmb3IodmFyIGY9MDtmPGMubGVuZ3RoO2YrKyl6KGIsY1tmXSk7aWYobCh0aGlzKSlmb3IoYz0wO2M8ZC5sZW5ndGg7YysrKWY9ZFtjXSxmIGluc3RhbmNlb2YgRWxlbWVudCYmeChiLGYpfTthLmFwcGVuZD1mdW5jdGlvbihhKXtmb3IodmFyIGQ9W10sYz0wO2M8YXJndW1lbnRzLmxlbmd0aDsrK2MpZFtjLTBdPWFyZ3VtZW50c1tjXTtjPWQuZmlsdGVyKGZ1bmN0aW9uKGIpe3JldHVybiBiIGluc3RhbmNlb2YgTm9kZSYmbChiKX0pO2UuYXBwZW5kLmFwcGx5KHRoaXMsZCk7Zm9yKHZhciBmPTA7ZjxjLmxlbmd0aDtmKyspeihiLGNbZl0pO2lmKGwodGhpcykpZm9yKGM9MDtjPFxuZC5sZW5ndGg7YysrKWY9ZFtjXSxmIGluc3RhbmNlb2YgRWxlbWVudCYmeChiLGYpfX07ZnVuY3Rpb24gcWEoKXt2YXIgYj1ZO3EoRG9jdW1lbnQucHJvdG90eXBlLFwiY3JlYXRlRWxlbWVudFwiLGZ1bmN0aW9uKGEpe2lmKHRoaXMuX19DRV9oYXNSZWdpc3RyeSl7dmFyIGU9Yi5hLmdldChhKTtpZihlKXJldHVybiBuZXcgZS5jb25zdHJ1Y3Rvcn1hPUYuY2FsbCh0aGlzLGEpO3coYixhKTtyZXR1cm4gYX0pO3EoRG9jdW1lbnQucHJvdG90eXBlLFwiaW1wb3J0Tm9kZVwiLGZ1bmN0aW9uKGEsZSl7YT1lYS5jYWxsKHRoaXMsYSxlKTt0aGlzLl9fQ0VfaGFzUmVnaXN0cnk/QShiLGEpOnYoYixhKTtyZXR1cm4gYX0pO3EoRG9jdW1lbnQucHJvdG90eXBlLFwiY3JlYXRlRWxlbWVudE5TXCIsZnVuY3Rpb24oYSxlKXtpZih0aGlzLl9fQ0VfaGFzUmVnaXN0cnkmJihudWxsPT09YXx8XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI9PT1hKSl7dmFyIGM9Yi5hLmdldChlKTtpZihjKXJldHVybiBuZXcgYy5jb25zdHJ1Y3Rvcn1hPWRhLmNhbGwodGhpcyxhLGUpO3coYixhKTtyZXR1cm4gYX0pO1xucGEoYixEb2N1bWVudC5wcm90b3R5cGUse2k6ZmEsYXBwZW5kOmdhfSl9O2Z1bmN0aW9uIHJhKCl7dmFyIGI9WTtmdW5jdGlvbiBhKGEsYyl7T2JqZWN0LmRlZmluZVByb3BlcnR5KGEsXCJ0ZXh0Q29udGVudFwiLHtlbnVtZXJhYmxlOmMuZW51bWVyYWJsZSxjb25maWd1cmFibGU6ITAsZ2V0OmMuZ2V0LHNldDpmdW5jdGlvbihhKXtpZih0aGlzLm5vZGVUeXBlPT09Tm9kZS5URVhUX05PREUpYy5zZXQuY2FsbCh0aGlzLGEpO2Vsc2V7dmFyIGQ9dm9pZCAwO2lmKHRoaXMuZmlyc3RDaGlsZCl7dmFyIGU9dGhpcy5jaGlsZE5vZGVzLHU9ZS5sZW5ndGg7aWYoMDx1JiZsKHRoaXMpKWZvcih2YXIgZD1BcnJheSh1KSxwPTA7cDx1O3ArKylkW3BdPWVbcF19Yy5zZXQuY2FsbCh0aGlzLGEpO2lmKGQpZm9yKGE9MDthPGQubGVuZ3RoO2ErKyl6KGIsZFthXSl9fX0pfXEoTm9kZS5wcm90b3R5cGUsXCJpbnNlcnRCZWZvcmVcIixmdW5jdGlvbihhLGMpe2lmKGEgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KXt2YXIgZD1BcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoYS5jaGlsZE5vZGVzKTtcbmE9SS5jYWxsKHRoaXMsYSxjKTtpZihsKHRoaXMpKWZvcihjPTA7YzxkLmxlbmd0aDtjKyspeChiLGRbY10pO3JldHVybiBhfWQ9bChhKTtjPUkuY2FsbCh0aGlzLGEsYyk7ZCYmeihiLGEpO2wodGhpcykmJngoYixhKTtyZXR1cm4gY30pO3EoTm9kZS5wcm90b3R5cGUsXCJhcHBlbmRDaGlsZFwiLGZ1bmN0aW9uKGEpe2lmKGEgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KXt2YXIgYz1BcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoYS5jaGlsZE5vZGVzKTthPUguY2FsbCh0aGlzLGEpO2lmKGwodGhpcykpZm9yKHZhciBkPTA7ZDxjLmxlbmd0aDtkKyspeChiLGNbZF0pO3JldHVybiBhfWM9bChhKTtkPUguY2FsbCh0aGlzLGEpO2MmJnooYixhKTtsKHRoaXMpJiZ4KGIsYSk7cmV0dXJuIGR9KTtxKE5vZGUucHJvdG90eXBlLFwiY2xvbmVOb2RlXCIsZnVuY3Rpb24oYSl7YT1HLmNhbGwodGhpcyxhKTt0aGlzLm93bmVyRG9jdW1lbnQuX19DRV9oYXNSZWdpc3RyeT9BKGIsYSk6dihiLGEpO1xucmV0dXJuIGF9KTtxKE5vZGUucHJvdG90eXBlLFwicmVtb3ZlQ2hpbGRcIixmdW5jdGlvbihhKXt2YXIgYz1sKGEpLGQ9Si5jYWxsKHRoaXMsYSk7YyYmeihiLGEpO3JldHVybiBkfSk7cShOb2RlLnByb3RvdHlwZSxcInJlcGxhY2VDaGlsZFwiLGZ1bmN0aW9uKGEsYyl7aWYoYSBpbnN0YW5jZW9mIERvY3VtZW50RnJhZ21lbnQpe3ZhciBkPUFycmF5LnByb3RvdHlwZS5zbGljZS5hcHBseShhLmNoaWxkTm9kZXMpO2E9Sy5jYWxsKHRoaXMsYSxjKTtpZihsKHRoaXMpKWZvcih6KGIsYyksYz0wO2M8ZC5sZW5ndGg7YysrKXgoYixkW2NdKTtyZXR1cm4gYX12YXIgZD1sKGEpLGU9Sy5jYWxsKHRoaXMsYSxjKSxmPWwodGhpcyk7ZiYmeihiLGMpO2QmJnooYixhKTtmJiZ4KGIsYSk7cmV0dXJuIGV9KTtMJiZMLmdldD9hKE5vZGUucHJvdG90eXBlLEwpOnQoYixmdW5jdGlvbihiKXthKGIse2VudW1lcmFibGU6ITAsY29uZmlndXJhYmxlOiEwLGdldDpmdW5jdGlvbigpe2Zvcih2YXIgYT1bXSxiPVxuMDtiPHRoaXMuY2hpbGROb2Rlcy5sZW5ndGg7YisrKWEucHVzaCh0aGlzLmNoaWxkTm9kZXNbYl0udGV4dENvbnRlbnQpO3JldHVybiBhLmpvaW4oXCJcIil9LHNldDpmdW5jdGlvbihhKXtmb3IoO3RoaXMuZmlyc3RDaGlsZDspSi5jYWxsKHRoaXMsdGhpcy5maXJzdENoaWxkKTtILmNhbGwodGhpcyxkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShhKSl9fSl9KX07ZnVuY3Rpb24gc2EoYil7dmFyIGE9RWxlbWVudC5wcm90b3R5cGU7YS5iZWZvcmU9ZnVuY3Rpb24oYSl7Zm9yKHZhciBjPVtdLGQ9MDtkPGFyZ3VtZW50cy5sZW5ndGg7KytkKWNbZC0wXT1hcmd1bWVudHNbZF07ZD1jLmZpbHRlcihmdW5jdGlvbihhKXtyZXR1cm4gYSBpbnN0YW5jZW9mIE5vZGUmJmwoYSl9KTtqYS5hcHBseSh0aGlzLGMpO2Zvcih2YXIgZT0wO2U8ZC5sZW5ndGg7ZSsrKXooYixkW2VdKTtpZihsKHRoaXMpKWZvcihkPTA7ZDxjLmxlbmd0aDtkKyspZT1jW2RdLGUgaW5zdGFuY2VvZiBFbGVtZW50JiZ4KGIsZSl9O2EuYWZ0ZXI9ZnVuY3Rpb24oYSl7Zm9yKHZhciBjPVtdLGQ9MDtkPGFyZ3VtZW50cy5sZW5ndGg7KytkKWNbZC0wXT1hcmd1bWVudHNbZF07ZD1jLmZpbHRlcihmdW5jdGlvbihhKXtyZXR1cm4gYSBpbnN0YW5jZW9mIE5vZGUmJmwoYSl9KTtrYS5hcHBseSh0aGlzLGMpO2Zvcih2YXIgZT0wO2U8ZC5sZW5ndGg7ZSsrKXooYixkW2VdKTtpZihsKHRoaXMpKWZvcihkPVxuMDtkPGMubGVuZ3RoO2QrKyllPWNbZF0sZSBpbnN0YW5jZW9mIEVsZW1lbnQmJngoYixlKX07YS5yZXBsYWNlV2l0aD1mdW5jdGlvbihhKXtmb3IodmFyIGM9W10sZD0wO2Q8YXJndW1lbnRzLmxlbmd0aDsrK2QpY1tkLTBdPWFyZ3VtZW50c1tkXTt2YXIgZD1jLmZpbHRlcihmdW5jdGlvbihhKXtyZXR1cm4gYSBpbnN0YW5jZW9mIE5vZGUmJmwoYSl9KSxlPWwodGhpcyk7bGEuYXBwbHkodGhpcyxjKTtmb3IodmFyIGY9MDtmPGQubGVuZ3RoO2YrKyl6KGIsZFtmXSk7aWYoZSlmb3IoeihiLHRoaXMpLGQ9MDtkPGMubGVuZ3RoO2QrKyllPWNbZF0sZSBpbnN0YW5jZW9mIEVsZW1lbnQmJngoYixlKX07YS5yZW1vdmU9ZnVuY3Rpb24oKXt2YXIgYT1sKHRoaXMpO21hLmNhbGwodGhpcyk7YSYmeihiLHRoaXMpfX07ZnVuY3Rpb24gdGEoKXt2YXIgYj1ZO2Z1bmN0aW9uIGEoYSxjKXtPYmplY3QuZGVmaW5lUHJvcGVydHkoYSxcImlubmVySFRNTFwiLHtlbnVtZXJhYmxlOmMuZW51bWVyYWJsZSxjb25maWd1cmFibGU6ITAsZ2V0OmMuZ2V0LHNldDpmdW5jdGlvbihhKXt2YXIgZD10aGlzLGU9dm9pZCAwO2wodGhpcykmJihlPVtdLG4odGhpcyxmdW5jdGlvbihhKXthIT09ZCYmZS5wdXNoKGEpfSkpO2Muc2V0LmNhbGwodGhpcyxhKTtpZihlKWZvcih2YXIgZj0wO2Y8ZS5sZW5ndGg7ZisrKXt2YXIgaD1lW2ZdOzE9PT1oLl9fQ0Vfc3RhdGUmJmIuZGlzY29ubmVjdGVkQ2FsbGJhY2soaCl9dGhpcy5vd25lckRvY3VtZW50Ll9fQ0VfaGFzUmVnaXN0cnk/QShiLHRoaXMpOnYoYix0aGlzKTtyZXR1cm4gYX19KX1mdW5jdGlvbiBlKGEsYyl7cShhLFwiaW5zZXJ0QWRqYWNlbnRFbGVtZW50XCIsZnVuY3Rpb24oYSxkKXt2YXIgZT1sKGQpO2E9Yy5jYWxsKHRoaXMsYSxkKTtlJiZ6KGIsZCk7bChhKSYmeChiLGQpO1xucmV0dXJuIGF9KX1NP3EoRWxlbWVudC5wcm90b3R5cGUsXCJhdHRhY2hTaGFkb3dcIixmdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5fX0NFX3NoYWRvd1Jvb3Q9YT1NLmNhbGwodGhpcyxhKX0pOmNvbnNvbGUud2FybihcIkN1c3RvbSBFbGVtZW50czogYEVsZW1lbnQjYXR0YWNoU2hhZG93YCB3YXMgbm90IHBhdGNoZWQuXCIpO2lmKE4mJk4uZ2V0KWEoRWxlbWVudC5wcm90b3R5cGUsTik7ZWxzZSBpZihXJiZXLmdldClhKEhUTUxFbGVtZW50LnByb3RvdHlwZSxXKTtlbHNle3ZhciBjPUYuY2FsbChkb2N1bWVudCxcImRpdlwiKTt0KGIsZnVuY3Rpb24oYil7YShiLHtlbnVtZXJhYmxlOiEwLGNvbmZpZ3VyYWJsZTohMCxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gRy5jYWxsKHRoaXMsITApLmlubmVySFRNTH0sc2V0OmZ1bmN0aW9uKGEpe3ZhciBiPVwidGVtcGxhdGVcIj09PXRoaXMubG9jYWxOYW1lP3RoaXMuY29udGVudDp0aGlzO2ZvcihjLmlubmVySFRNTD1hOzA8Yi5jaGlsZE5vZGVzLmxlbmd0aDspSi5jYWxsKGIsXG5iLmNoaWxkTm9kZXNbMF0pO2Zvcig7MDxjLmNoaWxkTm9kZXMubGVuZ3RoOylILmNhbGwoYixjLmNoaWxkTm9kZXNbMF0pfX0pfSl9cShFbGVtZW50LnByb3RvdHlwZSxcInNldEF0dHJpYnV0ZVwiLGZ1bmN0aW9uKGEsYyl7aWYoMSE9PXRoaXMuX19DRV9zdGF0ZSlyZXR1cm4gUS5jYWxsKHRoaXMsYSxjKTt2YXIgZD1PLmNhbGwodGhpcyxhKTtRLmNhbGwodGhpcyxhLGMpO2M9Ty5jYWxsKHRoaXMsYSk7ZCE9PWMmJmIuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKHRoaXMsYSxkLGMsbnVsbCl9KTtxKEVsZW1lbnQucHJvdG90eXBlLFwic2V0QXR0cmlidXRlTlNcIixmdW5jdGlvbihhLGMsZSl7aWYoMSE9PXRoaXMuX19DRV9zdGF0ZSlyZXR1cm4gVC5jYWxsKHRoaXMsYSxjLGUpO3ZhciBkPVMuY2FsbCh0aGlzLGEsYyk7VC5jYWxsKHRoaXMsYSxjLGUpO2U9Uy5jYWxsKHRoaXMsYSxjKTtkIT09ZSYmYi5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sodGhpcyxjLGQsZSxhKX0pO3EoRWxlbWVudC5wcm90b3R5cGUsXG5cInJlbW92ZUF0dHJpYnV0ZVwiLGZ1bmN0aW9uKGEpe2lmKDEhPT10aGlzLl9fQ0Vfc3RhdGUpcmV0dXJuIFIuY2FsbCh0aGlzLGEpO3ZhciBjPU8uY2FsbCh0aGlzLGEpO1IuY2FsbCh0aGlzLGEpO251bGwhPT1jJiZiLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayh0aGlzLGEsYyxudWxsLG51bGwpfSk7cShFbGVtZW50LnByb3RvdHlwZSxcInJlbW92ZUF0dHJpYnV0ZU5TXCIsZnVuY3Rpb24oYSxjKXtpZigxIT09dGhpcy5fX0NFX3N0YXRlKXJldHVybiBVLmNhbGwodGhpcyxhLGMpO3ZhciBkPVMuY2FsbCh0aGlzLGEsYyk7VS5jYWxsKHRoaXMsYSxjKTt2YXIgZT1TLmNhbGwodGhpcyxhLGMpO2QhPT1lJiZiLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayh0aGlzLGMsZCxlLGEpfSk7WD9lKEhUTUxFbGVtZW50LnByb3RvdHlwZSxYKTpWP2UoRWxlbWVudC5wcm90b3R5cGUsVik6Y29uc29sZS53YXJuKFwiQ3VzdG9tIEVsZW1lbnRzOiBgRWxlbWVudCNpbnNlcnRBZGphY2VudEVsZW1lbnRgIHdhcyBub3QgcGF0Y2hlZC5cIik7XG5wYShiLEVsZW1lbnQucHJvdG90eXBlLHtpOmhhLGFwcGVuZDppYX0pO3NhKGIpfTtcbnZhciBaPXdpbmRvdy5jdXN0b21FbGVtZW50cztpZighWnx8Wi5mb3JjZVBvbHlmaWxsfHxcImZ1bmN0aW9uXCIhPXR5cGVvZiBaLmRlZmluZXx8XCJmdW5jdGlvblwiIT10eXBlb2YgWi5nZXQpe3ZhciBZPW5ldyByO29hKCk7cWEoKTtyYSgpO3RhKCk7ZG9jdW1lbnQuX19DRV9oYXNSZWdpc3RyeT0hMDt2YXIgdWE9bmV3IEUoWSk7T2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdyxcImN1c3RvbUVsZW1lbnRzXCIse2NvbmZpZ3VyYWJsZTohMCxlbnVtZXJhYmxlOiEwLHZhbHVlOnVhfSl9O1xufSkuY2FsbChzZWxmKTtcbn1cbn0oKSk7IiwiLyogVU1ELmRlZmluZSAqL1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG5cdGlmICh0eXBlb2YgY3VzdG9tTG9hZGVyID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Y3VzdG9tTG9hZGVyKGZhY3RvcnksICdkb20nKTtcblx0fSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHR9IGVsc2Uge1xuXHRcdHJvb3QucmV0dXJuRXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0XHR3aW5kb3cuZG9tID0gZmFjdG9yeSgpO1xuXHR9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXJcblx0XHR1aWRzID0ge30sXG5cdFx0ZGVzdHJveWVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cblx0ZnVuY3Rpb24gaXNEaW1lbnNpb24gKHByb3ApIHtcblx0XHRyZXR1cm4gIS9vcGFjaXR5fGluZGV4fGZsZXh8d2VpZ2h0fF5zZGNzZGNvcmRlcnx0YWJ8bWl0ZXJ8Z3JvdXB8em9vbS9pLnRlc3QocHJvcClcblx0fVxuXG5cdGZ1bmN0aW9uIGlzTnVtYmVyICh2YWx1ZSkge1xuXHRcdGlmICgvXFxzLy50ZXN0KHZhbHVlKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gIWlzTmFOKHBhcnNlRmxvYXQodmFsdWUpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHVpZCAodHlwZSkge1xuXHRcdHR5cGUgPSB0eXBlIHx8ICd1aWQnO1xuXHRcdGlmICh1aWRzW3R5cGVdID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHVpZHNbdHlwZV0gPSAwO1xuXHRcdH1cblx0XHR2YXIgaWQgPSB0eXBlICsgJy0nICsgKHVpZHNbdHlwZV0gKyAxKTtcblx0XHR1aWRzW3R5cGVdKys7XG5cdFx0cmV0dXJuIGlkO1xuXHR9XG5cblx0ZnVuY3Rpb24gaXNOb2RlIChpdGVtKSB7XG5cdFx0Ly8gc2FmZXIgdGVzdCBmb3IgY3VzdG9tIGVsZW1lbnRzIGluIEZGICh3aXRoIHdjIHNoaW0pXG5cdFx0Ly8gZnJhZ21lbnQgaXMgYSBzcGVjaWFsIGNhc2Vcblx0XHRyZXR1cm4gISFpdGVtICYmIHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiAodHlwZW9mIGl0ZW0uaW5uZXJIVE1MID09PSAnc3RyaW5nJyB8fCBpdGVtLm5vZGVOYW1lID09PSAnI2RvY3VtZW50LWZyYWdtZW50Jyk7XG5cdH1cblxuXHRmdW5jdGlvbiBieUlkIChpdGVtKSB7XG5cdFx0aWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGl0ZW0pO1xuXHRcdH1cblx0XHRyZXR1cm4gaXRlbTtcblx0fVxuXG5cdGZ1bmN0aW9uIHN0eWxlIChub2RlLCBwcm9wLCB2YWx1ZSkge1xuXHRcdHZhciBrZXksIGNvbXB1dGVkLCByZXN1bHQ7XG5cdFx0aWYgKHR5cGVvZiBwcm9wID09PSAnb2JqZWN0Jykge1xuXHRcdFx0Ly8gb2JqZWN0IHNldHRlclxuXHRcdFx0T2JqZWN0LmtleXMocHJvcCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0XHRcdHN0eWxlKG5vZGUsIGtleSwgcHJvcFtrZXldKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSBlbHNlIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHQvLyBwcm9wZXJ0eSBzZXR0ZXJcblx0XHRcdGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIGlzRGltZW5zaW9uKHByb3ApKSB7XG5cdFx0XHRcdHZhbHVlICs9ICdweCc7XG5cdFx0XHR9XG5cdFx0XHRub2RlLnN0eWxlW3Byb3BdID0gdmFsdWU7XG5cdFx0fVxuXG5cdFx0Ly8gZ2V0dGVyLCBpZiBhIHNpbXBsZSBzdHlsZVxuXHRcdGlmIChub2RlLnN0eWxlW3Byb3BdKSB7XG5cdFx0XHRyZXN1bHQgPSBub2RlLnN0eWxlW3Byb3BdO1xuXHRcdFx0aWYgKC9weC8udGVzdChyZXN1bHQpKSB7XG5cdFx0XHRcdHJldHVybiBwYXJzZUZsb2F0KHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoLyUvLnRlc3QocmVzdWx0KSkge1xuXHRcdFx0XHRyZXR1cm4gcGFyc2VGbG9hdChyZXN1bHQpICogMC4wMTtcblx0XHRcdH1cblx0XHRcdGlmIChpc051bWJlcihyZXN1bHQpKSB7XG5cdFx0XHRcdHJldHVybiBwYXJzZUZsb2F0KHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblxuXHRcdC8vIGdldHRlciwgY29tcHV0ZWRcblx0XHRjb21wdXRlZCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKG5vZGUpO1xuXHRcdGlmIChjb21wdXRlZFtwcm9wXSkge1xuXHRcdFx0cmVzdWx0ID0gY29tcHV0ZWRbcHJvcF07XG5cdFx0XHRpZiAoaXNOdW1iZXIocmVzdWx0KSkge1xuXHRcdFx0XHRyZXR1cm4gcGFyc2VGbG9hdChyZXN1bHQpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGNvbXB1dGVkW3Byb3BdO1xuXHRcdH1cblx0XHRyZXR1cm4gJyc7XG5cdH1cblxuXHRmdW5jdGlvbiBhdHRyIChub2RlLCBwcm9wLCB2YWx1ZSkge1xuXHRcdHZhciBrZXk7XG5cblx0XHRpZiAodHlwZW9mIHByb3AgPT09ICdvYmplY3QnKSB7XG5cblx0XHRcdHZhciBib29scyA9IHt9O1xuXHRcdFx0dmFyIHN0cmluZ3MgPSB7fTtcblx0XHRcdHZhciBvYmplY3RzID0ge307XG5cdFx0XHR2YXIgZXZlbnRzID0ge307XG5cdFx0XHRPYmplY3Qua2V5cyhwcm9wKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBwcm9wW2tleV0gPT09ICdib29sZWFuJykge1xuXHRcdFx0XHRcdGJvb2xzW2tleV0gPSBwcm9wW2tleV07XG5cdFx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIHByb3Bba2V5XSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRvYmplY3RzW2tleV0gPSBwcm9wW2tleV07XG5cdFx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIHByb3Bba2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdGlmICgvb25bQS1aXS8udGVzdChrZXkpKSB7XG5cdFx0XHRcdFx0XHRldmVudHNba2V5XSA9IHByb3Bba2V5XTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKCdkb20gd2FybmluZzogZnVuY3Rpb24gdXNlZCB3aXRoIGBvbkV2ZW50YCBzeW50YXgnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c3RyaW5nc1trZXldID0gcHJvcFtrZXldO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gYXNzaWduaW5nIHByb3BlcnRpZXMgaW4gc3BlY2lmaWMgb3JkZXIgb2YgdHlwZSwgbmFtZWx5IG9iamVjdHMgbGFzdFxuXHRcdFx0T2JqZWN0LmtleXMoYm9vbHMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkgeyBhdHRyKG5vZGUsIGtleSwgcHJvcFtrZXldKTsgfSk7XG5cdFx0XHRPYmplY3Qua2V5cyhzdHJpbmdzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHsgYXR0cihub2RlLCBrZXksIHByb3Bba2V5XSk7IH0pO1xuXHRcdFx0T2JqZWN0LmtleXMoZXZlbnRzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHsgYXR0cihub2RlLCBrZXksIHByb3Bba2V5XSk7IH0pO1xuXHRcdFx0T2JqZWN0LmtleXMob2JqZWN0cykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7IGF0dHIobm9kZSwga2V5LCBwcm9wW2tleV0pOyB9KTtcblxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmIChwcm9wID09PSAndGV4dCcgfHwgcHJvcCA9PT0gJ2h0bWwnIHx8IHByb3AgPT09ICdpbm5lckhUTUwnKSB7XG5cdFx0XHRcdC8vIGlnbm9yZSwgaGFuZGxlZCBkdXJpbmcgY3JlYXRpb25cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAocHJvcCA9PT0gJ2NsYXNzTmFtZScgfHwgcHJvcCA9PT0gJ2NsYXNzJykge1xuXHRcdFx0XHRkb20uY2xhc3NMaXN0LmFkZChub2RlLCB2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChwcm9wID09PSAnc3R5bGUnKSB7XG5cdFx0XHRcdHN0eWxlKG5vZGUsIHZhbHVlKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHByb3AgPT09ICdhdHRyJykge1xuXHRcdFx0XHQvLyBiYWNrIGNvbXBhdFxuXHRcdFx0XHRhdHRyKG5vZGUsIHZhbHVlKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRhdHRhY2hFdmVudChub2RlLCBwcm9wLCB2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdC8vIG9iamVjdCwgbGlrZSAnZGF0YSdcblx0XHRcdFx0bm9kZVtwcm9wXSA9IHZhbHVlO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcblx0XHRcdFx0XHRub2RlLnJlbW92ZUF0dHJpYnV0ZShwcm9wKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRub2RlLnNldEF0dHJpYnV0ZShwcm9wLCB2YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gbm9kZS5nZXRBdHRyaWJ1dGUocHJvcCk7XG5cdH1cblxuXHRmdW5jdGlvbiBhdHRhY2hFdmVudCAobm9kZSwgcHJvcCwgdmFsdWUpIHtcblx0XHR2YXIgZXZlbnQgPSBwcm9wLnJlcGxhY2UoJ29uJywgJycpLnRvTG93ZXJDYXNlKCk7XG5cdFx0bm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCB2YWx1ZSk7XG5cblx0XHR2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbihtdXRhdGlvbnNMaXN0KSB7XG5cdFx0XHRtdXRhdGlvbnNMaXN0LmZvckVhY2goZnVuY3Rpb24gKG11dGF0aW9uKSB7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbXV0YXRpb24ucmVtb3ZlZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIG4gPSBtdXRhdGlvbi5yZW1vdmVkTm9kZXNbaV07XG5cdFx0XHRcdFx0aWYgKG4gPT09IG5vZGUpIHtcblx0XHRcdFx0XHRcdG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgdmFsdWUpO1xuXHRcdFx0XHRcdFx0b2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9O1xuXHRcdHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGNhbGxiYWNrKTtcblx0XHRvYnNlcnZlci5vYnNlcnZlKG5vZGUucGFyZW50Tm9kZSB8fCBkb2N1bWVudC5ib2R5LCB7IGNoaWxkTGlzdDogdHJ1ZSB9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGJveCAobm9kZSkge1xuXHRcdGlmIChub2RlID09PSB3aW5kb3cpIHtcblx0XHRcdG5vZGUgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cdFx0fVxuXHRcdC8vIG5vZGUgZGltZW5zaW9uc1xuXHRcdC8vIHJldHVybmVkIG9iamVjdCBpcyBpbW11dGFibGVcblx0XHQvLyBhZGQgc2Nyb2xsIHBvc2l0aW9uaW5nIGFuZCBjb252ZW5pZW5jZSBhYmJyZXZpYXRpb25zXG5cdFx0dmFyXG5cdFx0XHRkaW1lbnNpb25zID0gYnlJZChub2RlKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dG9wOiBkaW1lbnNpb25zLnRvcCxcblx0XHRcdHJpZ2h0OiBkaW1lbnNpb25zLnJpZ2h0LFxuXHRcdFx0Ym90dG9tOiBkaW1lbnNpb25zLmJvdHRvbSxcblx0XHRcdGxlZnQ6IGRpbWVuc2lvbnMubGVmdCxcblx0XHRcdGhlaWdodDogZGltZW5zaW9ucy5oZWlnaHQsXG5cdFx0XHRoOiBkaW1lbnNpb25zLmhlaWdodCxcblx0XHRcdHdpZHRoOiBkaW1lbnNpb25zLndpZHRoLFxuXHRcdFx0dzogZGltZW5zaW9ucy53aWR0aCxcblx0XHRcdHNjcm9sbFk6IHdpbmRvdy5zY3JvbGxZLFxuXHRcdFx0c2Nyb2xsWDogd2luZG93LnNjcm9sbFgsXG5cdFx0XHR4OiBkaW1lbnNpb25zLmxlZnQgKyB3aW5kb3cucGFnZVhPZmZzZXQsXG5cdFx0XHR5OiBkaW1lbnNpb25zLnRvcCArIHdpbmRvdy5wYWdlWU9mZnNldFxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiByZWxCb3ggKG5vZGUsIHBhcmVudE5vZGUpIHtcblx0XHRjb25zdCBwYXJlbnQgPSBwYXJlbnROb2RlIHx8IG5vZGUucGFyZW50Tm9kZTtcblx0XHRjb25zdCBwQm94ID0gYm94KHBhcmVudCk7XG5cdFx0Y29uc3QgYnggPSBib3gobm9kZSk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0dzogYngudyxcblx0XHRcdGg6IGJ4LmgsXG5cdFx0XHR4OiBieC5sZWZ0IC0gcEJveC5sZWZ0LFxuXHRcdFx0eTogYngudG9wIC0gcEJveC50b3Bcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gc2l6ZSAobm9kZSwgdHlwZSkge1xuXHRcdGlmIChub2RlID09PSB3aW5kb3cpIHtcblx0XHRcdG5vZGUgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cdFx0fVxuXHRcdGlmICh0eXBlID09PSAnc2Nyb2xsJykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dzogbm9kZS5zY3JvbGxXaWR0aCxcblx0XHRcdFx0aDogbm9kZS5zY3JvbGxIZWlnaHRcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmICh0eXBlID09PSAnY2xpZW50Jykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dzogbm9kZS5jbGllbnRXaWR0aCxcblx0XHRcdFx0aDogbm9kZS5jbGllbnRIZWlnaHRcblx0XHRcdH07XG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHR3OiBub2RlLm9mZnNldFdpZHRoLFxuXHRcdFx0aDogbm9kZS5vZmZzZXRIZWlnaHRcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gcXVlcnkgKG5vZGUsIHNlbGVjdG9yKSB7XG5cdFx0aWYgKCFzZWxlY3Rvcikge1xuXHRcdFx0c2VsZWN0b3IgPSBub2RlO1xuXHRcdFx0bm9kZSA9IGRvY3VtZW50O1xuXHRcdH1cblx0XHRyZXR1cm4gbm9kZS5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHF1ZXJ5QWxsIChub2RlLCBzZWxlY3Rvcikge1xuXHRcdGlmICghc2VsZWN0b3IpIHtcblx0XHRcdHNlbGVjdG9yID0gbm9kZTtcblx0XHRcdG5vZGUgPSBkb2N1bWVudDtcblx0XHR9XG5cdFx0dmFyIG5vZGVzID0gbm9kZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblxuXHRcdGlmICghbm9kZXMubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm4gW107XG5cdFx0fVxuXG5cdFx0Ly8gY29udmVydCB0byBBcnJheSBhbmQgcmV0dXJuIGl0XG5cdFx0cmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKG5vZGVzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHRvRG9tIChodG1sLCBvcHRpb25zLCBwYXJlbnQpIHtcblx0XHR2YXIgbm9kZSA9IGRvbSgnZGl2JywgeyBodG1sOiBodG1sIH0pO1xuXHRcdHBhcmVudCA9IGJ5SWQocGFyZW50IHx8IG9wdGlvbnMpO1xuXHRcdGlmIChwYXJlbnQpIHtcblx0XHRcdHdoaWxlIChub2RlLmZpcnN0Q2hpbGQpIHtcblx0XHRcdFx0cGFyZW50LmFwcGVuZENoaWxkKG5vZGUuZmlyc3RDaGlsZCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbm9kZS5maXJzdENoaWxkO1xuXHRcdH1cblx0XHRpZiAoaHRtbC5pbmRleE9mKCc8JykgIT09IDApIHtcblx0XHRcdHJldHVybiBub2RlO1xuXHRcdH1cblx0XHRyZXR1cm4gbm9kZS5maXJzdENoaWxkO1xuXHR9XG5cblx0ZnVuY3Rpb24gZnJvbURvbSAobm9kZSkge1xuXHRcdGZ1bmN0aW9uIGdldEF0dHJzIChub2RlKSB7XG5cdFx0XHR2YXIgYXR0LCBpLCBhdHRycyA9IHt9O1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IG5vZGUuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRhdHQgPSBub2RlLmF0dHJpYnV0ZXNbaV07XG5cdFx0XHRcdGF0dHJzW2F0dC5sb2NhbE5hbWVdID0gbm9ybWFsaXplKGF0dC52YWx1ZSA9PT0gJycgPyB0cnVlIDogYXR0LnZhbHVlKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBhdHRycztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRUZXh0IChub2RlKSB7XG5cdFx0XHR2YXIgaSwgdCwgdGV4dCA9ICcnO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IG5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR0ID0gbm9kZS5jaGlsZE5vZGVzW2ldO1xuXHRcdFx0XHRpZiAodC5ub2RlVHlwZSA9PT0gMyAmJiB0LnRleHRDb250ZW50LnRyaW0oKSkge1xuXHRcdFx0XHRcdHRleHQgKz0gdC50ZXh0Q29udGVudC50cmltKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0ZXh0O1xuXHRcdH1cblxuXHRcdHZhciBpLCBvYmplY3QgPSBnZXRBdHRycyhub2RlKTtcblx0XHRvYmplY3QudGV4dCA9IGdldFRleHQobm9kZSk7XG5cdFx0b2JqZWN0LmNoaWxkcmVuID0gW107XG5cdFx0aWYgKG5vZGUuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRvYmplY3QuY2hpbGRyZW4ucHVzaChmcm9tRG9tKG5vZGUuY2hpbGRyZW5baV0pKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG9iamVjdDtcblx0fVxuXG5cdGZ1bmN0aW9uIGFkZENoaWxkcmVuIChub2RlLCBjaGlsZHJlbikge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KGNoaWxkcmVuKSkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAoY2hpbGRyZW5baV0pIHtcblx0XHRcdFx0XHRpZiAodHlwZW9mIGNoaWxkcmVuW2ldID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRcdFx0bm9kZS5hcHBlbmRDaGlsZCh0b0RvbShjaGlsZHJlbltpXSkpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRub2RlLmFwcGVuZENoaWxkKGNoaWxkcmVuW2ldKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZSBpZiAoY2hpbGRyZW4pIHtcblx0XHRcdG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGRyZW4pO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGFkZENvbnRlbnQgKG5vZGUsIG9wdGlvbnMpIHtcblx0XHR2YXIgaHRtbDtcblx0XHRpZiAob3B0aW9ucy5odG1sICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5pbm5lckhUTUwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aHRtbCA9IG9wdGlvbnMuaHRtbCB8fCBvcHRpb25zLmlubmVySFRNTCB8fCAnJztcblx0XHRcdGlmICh0eXBlb2YgaHRtbCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0YWRkQ2hpbGRyZW4obm9kZSwgaHRtbCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBjYXJlZnVsIGFzc3VtaW5nIHRleHRDb250ZW50IC1cblx0XHRcdFx0Ly8gbWlzc2VzIHNvbWUgSFRNTCwgc3VjaCBhcyBlbnRpdGllcyAoJm5wc3A7KVxuXHRcdFx0XHRub2RlLmlubmVySFRNTCA9IGh0bWw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLnRleHQpIHtcblx0XHRcdG5vZGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUob3B0aW9ucy50ZXh0KSk7XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLmNoaWxkcmVuKSB7XG5cdFx0XHRhZGRDaGlsZHJlbihub2RlLCBvcHRpb25zLmNoaWxkcmVuKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBkb20gKG5vZGVUeXBlLCBvcHRpb25zLCBwYXJlbnQsIHByZXBlbmQpIHtcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdC8vIGlmIGZpcnN0IGFyZ3VtZW50IGlzIGEgc3RyaW5nIGFuZCBzdGFydHMgd2l0aCA8LCBwYXNzIHRvIHRvRG9tKClcblx0XHRpZiAobm9kZVR5cGUuaW5kZXhPZignPCcpID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gdG9Eb20obm9kZVR5cGUsIG9wdGlvbnMsIHBhcmVudCk7XG5cdFx0fVxuXG5cdFx0dmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVUeXBlKTtcblxuXHRcdHBhcmVudCA9IGJ5SWQocGFyZW50KTtcblxuXHRcdGFkZENvbnRlbnQobm9kZSwgb3B0aW9ucyk7XG5cblx0XHRhdHRyKG5vZGUsIG9wdGlvbnMpO1xuXG5cdFx0aWYgKHBhcmVudCAmJiBpc05vZGUocGFyZW50KSkge1xuXHRcdFx0aWYgKHByZXBlbmQgJiYgcGFyZW50Lmhhc0NoaWxkTm9kZXMoKSkge1xuXHRcdFx0XHRwYXJlbnQuaW5zZXJ0QmVmb3JlKG5vZGUsIHBhcmVudC5jaGlsZHJlblswXSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXJlbnQuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG5vZGU7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNlcnRBZnRlciAocmVmTm9kZSwgbm9kZSkge1xuXHRcdHZhciBzaWJsaW5nID0gcmVmTm9kZS5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0aWYgKCFzaWJsaW5nKSB7XG5cdFx0XHRyZWZOb2RlLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlZk5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgc2libGluZyk7XG5cdFx0fVxuXHRcdHJldHVybiBzaWJsaW5nO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGVzdHJveSAobm9kZSkge1xuXHRcdC8vIGRlc3Ryb3lzIGEgbm9kZSBjb21wbGV0ZWx5XG5cdFx0Ly9cblx0XHRpZiAobm9kZSkge1xuXHRcdFx0bm9kZS5kZXN0cm95ZWQgPSB0cnVlO1xuXHRcdFx0ZGVzdHJveWVyLmFwcGVuZENoaWxkKG5vZGUpO1xuXHRcdFx0ZGVzdHJveWVyLmlubmVySFRNTCA9ICcnO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGNsZWFuIChub2RlLCBkaXNwb3NlKSB7XG5cdFx0Ly9cdFJlbW92ZXMgYWxsIGNoaWxkIG5vZGVzXG5cdFx0Ly9cdFx0ZGlzcG9zZTogZGVzdHJveSBjaGlsZCBub2Rlc1xuXHRcdGlmIChkaXNwb3NlKSB7XG5cdFx0XHR3aGlsZSAobm9kZS5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdFx0ZGVzdHJveShub2RlLmNoaWxkcmVuWzBdKTtcblx0XHRcdH1cblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0d2hpbGUgKG5vZGUuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHRub2RlLnJlbW92ZUNoaWxkKG5vZGUuY2hpbGRyZW5bMF0pO1xuXHRcdH1cblx0fVxuXG5cdGRvbS5mcmFnID0gZnVuY3Rpb24gKG5vZGVzKSB7XG5cdFx0dmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRmcmFnLmFwcGVuZENoaWxkKGFyZ3VtZW50c1tpXSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChBcnJheS5pc0FycmF5KG5vZGVzKSkge1xuXHRcdFx0XHRub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChuKSB7XG5cdFx0XHRcdFx0ZnJhZy5hcHBlbmRDaGlsZChuKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmcmFnLmFwcGVuZENoaWxkKG5vZGVzKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZyYWc7XG5cdH07XG5cblx0ZG9tLmNsYXNzTGlzdCA9IHtcblx0XHQvLyBpbiBhZGRpdGlvbiB0byBmaXhpbmcgSUUxMS10b2dnbGUsXG5cdFx0Ly8gdGhlc2UgbWV0aG9kcyBhbHNvIGhhbmRsZSBhcnJheXNcblx0XHRyZW1vdmU6IGZ1bmN0aW9uIChub2RlLCBuYW1lcykge1xuXHRcdFx0dG9BcnJheShuYW1lcykuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuXHRcdFx0XHRub2RlLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdGFkZDogZnVuY3Rpb24gKG5vZGUsIG5hbWVzKSB7XG5cdFx0XHR0b0FycmF5KG5hbWVzKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRcdG5vZGUuY2xhc3NMaXN0LmFkZChuYW1lKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0Y29udGFpbnM6IGZ1bmN0aW9uIChub2RlLCBuYW1lcykge1xuXHRcdFx0cmV0dXJuIHRvQXJyYXkobmFtZXMpLmV2ZXJ5KGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRcdHJldHVybiBub2RlLmNsYXNzTGlzdC5jb250YWlucyhuYW1lKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0dG9nZ2xlOiBmdW5jdGlvbiAobm9kZSwgbmFtZXMsIHZhbHVlKSB7XG5cdFx0XHRuYW1lcyA9IHRvQXJyYXkobmFtZXMpO1xuXHRcdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0Ly8gdXNlIHN0YW5kYXJkIGZ1bmN0aW9uYWxpdHksIHN1cHBvcnRlZCBieSBJRVxuXHRcdFx0XHRuYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRcdFx0bm9kZS5jbGFzc0xpc3QudG9nZ2xlKG5hbWUsIHZhbHVlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBJRTExIGRvZXMgbm90IHN1cHBvcnQgdGhlIHNlY29uZCBwYXJhbWV0ZXJcblx0XHRcdGVsc2UgaWYgKHZhbHVlKSB7XG5cdFx0XHRcdG5hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRcdFx0XHRub2RlLmNsYXNzTGlzdC5hZGQobmFtZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdG5hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRcdFx0XHRub2RlLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHRmdW5jdGlvbiB0b0FycmF5IChuYW1lcykge1xuXHRcdGlmICghbmFtZXMpIHtcblx0XHRcdHJldHVybiBbXTtcblx0XHR9XG5cdFx0cmV0dXJuIG5hbWVzLnNwbGl0KCcgJykubWFwKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRyZXR1cm4gbmFtZS50cmltKCk7XG5cdFx0fSkuZmlsdGVyKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRyZXR1cm4gISFuYW1lO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gbm9ybWFsaXplICh2YWwpIHtcblx0XHRpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHZhbCA9IHZhbC50cmltKCk7XG5cdFx0XHRpZiAodmFsID09PSAnZmFsc2UnKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH0gZWxzZSBpZiAodmFsID09PSAnbnVsbCcpIHtcblx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHR9IGVsc2UgaWYgKHZhbCA9PT0gJ3RydWUnKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0Ly8gZmluZHMgc3RyaW5ncyB0aGF0IHN0YXJ0IHdpdGggbnVtYmVycywgYnV0IGFyZSBub3QgbnVtYmVyczpcblx0XHRcdC8vICcydGVhbScgJzEyMyBTdHJlZXQnLCAnMS0yLTMnLCBldGNcblx0XHRcdGlmICgoJycgKyB2YWwpLnJlcGxhY2UoLy0/XFxkKlxcLj9cXGQqLywgJycpLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdmFsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoIWlzTmFOKHBhcnNlRmxvYXQodmFsKSkpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KHZhbCk7XG5cdFx0fVxuXHRcdHJldHVybiB2YWw7XG5cdH1cblxuXHRkb20ubm9ybWFsaXplID0gbm9ybWFsaXplO1xuXHRkb20uY2xlYW4gPSBjbGVhbjtcblx0ZG9tLnF1ZXJ5ID0gcXVlcnk7XG5cdGRvbS5xdWVyeUFsbCA9IHF1ZXJ5QWxsO1xuXHRkb20uYnlJZCA9IGJ5SWQ7XG5cdGRvbS5hdHRyID0gYXR0cjtcblx0ZG9tLmJveCA9IGJveDtcblx0ZG9tLnN0eWxlID0gc3R5bGU7XG5cdGRvbS5kZXN0cm95ID0gZGVzdHJveTtcblx0ZG9tLnVpZCA9IHVpZDtcblx0ZG9tLmlzTm9kZSA9IGlzTm9kZTtcblx0ZG9tLnRvRG9tID0gdG9Eb207XG5cdGRvbS5mcm9tRG9tID0gZnJvbURvbTtcblx0ZG9tLmluc2VydEFmdGVyID0gaW5zZXJ0QWZ0ZXI7XG5cdGRvbS5zaXplID0gc2l6ZTtcblx0ZG9tLnJlbEJveCA9IHJlbEJveDtcblxuXHRyZXR1cm4gZG9tO1xufSkpO1xuIiwiKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG5cdGlmICh0eXBlb2YgY3VzdG9tTG9hZGVyID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Y3VzdG9tTG9hZGVyKGZhY3RvcnksICdvbicpO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdH0gZWxzZSB7XG5cdFx0cm9vdC5yZXR1cm5FeHBvcnRzID0gd2luZG93Lm9uID0gZmFjdG9yeSgpO1xuXHR9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdC8vIG1haW4gZnVuY3Rpb25cblxuXHRmdW5jdGlvbiBvbiAobm9kZSwgZXZlbnROYW1lLCBmaWx0ZXIsIGhhbmRsZXIpIHtcblx0XHQvLyBub3JtYWxpemUgcGFyYW1ldGVyc1xuXHRcdGlmICh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdG5vZGUgPSBnZXROb2RlQnlJZChub2RlKTtcblx0XHR9XG5cblx0XHQvLyBwcmVwYXJlIGEgY2FsbGJhY2tcblx0XHR2YXIgY2FsbGJhY2sgPSBtYWtlQ2FsbGJhY2sobm9kZSwgZmlsdGVyLCBoYW5kbGVyKTtcblxuXHRcdC8vIGZ1bmN0aW9uYWwgZXZlbnRcblx0XHRpZiAodHlwZW9mIGV2ZW50TmFtZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cmV0dXJuIGV2ZW50TmFtZShub2RlLCBjYWxsYmFjayk7XG5cdFx0fVxuXG5cdFx0Ly8gc3BlY2lhbCBjYXNlOiBrZXlkb3duL2tleXVwIHdpdGggYSBsaXN0IG9mIGV4cGVjdGVkIGtleXNcblx0XHQvLyBUT0RPOiBjb25zaWRlciByZXBsYWNpbmcgd2l0aCBhbiBleHBsaWNpdCBldmVudCBmdW5jdGlvbjpcblx0XHQvLyB2YXIgaCA9IG9uKG5vZGUsIG9uS2V5RXZlbnQoJ2tleXVwJywgL0VudGVyLEVzYy8pLCBjYWxsYmFjayk7XG5cdFx0dmFyIGtleUV2ZW50ID0gL14oa2V5dXB8a2V5ZG93bik6KC4rKSQvLmV4ZWMoZXZlbnROYW1lKTtcblx0XHRpZiAoa2V5RXZlbnQpIHtcblx0XHRcdHJldHVybiBvbktleUV2ZW50KGtleUV2ZW50WzFdLCBuZXcgUmVnRXhwKGtleUV2ZW50WzJdLnNwbGl0KCcsJykuam9pbignfCcpKSkobm9kZSwgY2FsbGJhY2spO1xuXHRcdH1cblxuXHRcdC8vIGhhbmRsZSBtdWx0aXBsZSBldmVudCB0eXBlcywgbGlrZTogb24obm9kZSwgJ21vdXNldXAsIG1vdXNlZG93bicsIGNhbGxiYWNrKTtcblx0XHRpZiAoLywvLnRlc3QoZXZlbnROYW1lKSkge1xuXHRcdFx0cmV0dXJuIG9uLm1ha2VNdWx0aUhhbmRsZShldmVudE5hbWUuc3BsaXQoJywnKS5tYXAoZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIG5hbWUudHJpbSgpO1xuXHRcdFx0fSkuZmlsdGVyKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRcdHJldHVybiBuYW1lO1xuXHRcdFx0fSkubWFwKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRcdHJldHVybiBvbihub2RlLCBuYW1lLCBjYWxsYmFjayk7XG5cdFx0XHR9KSk7XG5cdFx0fVxuXG5cdFx0Ly8gaGFuZGxlIHJlZ2lzdGVyZWQgZnVuY3Rpb25hbCBldmVudHNcblx0XHRpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9uLmV2ZW50cywgZXZlbnROYW1lKSkge1xuXHRcdFx0cmV0dXJuIG9uLmV2ZW50c1tldmVudE5hbWVdKG5vZGUsIGNhbGxiYWNrKTtcblx0XHR9XG5cblx0XHQvLyBzcGVjaWFsIGNhc2U6IGxvYWRpbmcgYW4gaW1hZ2Vcblx0XHRpZiAoZXZlbnROYW1lID09PSAnbG9hZCcgJiYgbm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdpbWcnKSB7XG5cdFx0XHRyZXR1cm4gb25JbWFnZUxvYWQobm9kZSwgY2FsbGJhY2spO1xuXHRcdH1cblxuXHRcdC8vIHNwZWNpYWwgY2FzZTogbW91c2V3aGVlbFxuXHRcdGlmIChldmVudE5hbWUgPT09ICd3aGVlbCcpIHtcblx0XHRcdC8vIHBhc3MgdGhyb3VnaCwgYnV0IGZpcnN0IGN1cnJ5IGNhbGxiYWNrIHRvIHdoZWVsIGV2ZW50c1xuXHRcdFx0Y2FsbGJhY2sgPSBub3JtYWxpemVXaGVlbEV2ZW50KGNhbGxiYWNrKTtcblx0XHRcdGlmICghaGFzV2hlZWwpIHtcblx0XHRcdFx0Ly8gb2xkIEZpcmVmb3gsIG9sZCBJRSwgQ2hyb21lXG5cdFx0XHRcdHJldHVybiBvbi5tYWtlTXVsdGlIYW5kbGUoW1xuXHRcdFx0XHRcdG9uKG5vZGUsICdET01Nb3VzZVNjcm9sbCcsIGNhbGxiYWNrKSxcblx0XHRcdFx0XHRvbihub2RlLCAnbW91c2V3aGVlbCcsIGNhbGxiYWNrKVxuXHRcdFx0XHRdKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzcGVjaWFsIGNhc2U6IGtleWJvYXJkXG5cdFx0aWYgKC9ea2V5Ly50ZXN0KGV2ZW50TmFtZSkpIHtcblx0XHRcdGNhbGxiYWNrID0gbm9ybWFsaXplS2V5RXZlbnQoY2FsbGJhY2spO1xuXHRcdH1cblxuXHRcdC8vIGRlZmF1bHQgY2FzZVxuXHRcdHJldHVybiBvbi5vbkRvbUV2ZW50KG5vZGUsIGV2ZW50TmFtZSwgY2FsbGJhY2spO1xuXHR9XG5cblx0Ly8gcmVnaXN0ZXJlZCBmdW5jdGlvbmFsIGV2ZW50c1xuXHRvbi5ldmVudHMgPSB7XG5cdFx0Ly8gaGFuZGxlIGNsaWNrIGFuZCBFbnRlclxuXHRcdGJ1dHRvbjogZnVuY3Rpb24gKG5vZGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRyZXR1cm4gb24ubWFrZU11bHRpSGFuZGxlKFtcblx0XHRcdFx0b24obm9kZSwgJ2NsaWNrJywgY2FsbGJhY2spLFxuXHRcdFx0XHRvbihub2RlLCAna2V5dXA6RW50ZXInLCBjYWxsYmFjaylcblx0XHRcdF0pO1xuXHRcdH0sXG5cblx0XHQvLyBjdXN0b20gLSB1c2VkIGZvciBwb3B1cHMgJ24gc3R1ZmZcblx0XHRjbGlja29mZjogZnVuY3Rpb24gKG5vZGUsIGNhbGxiYWNrKSB7XG5cdFx0XHQvLyBpbXBvcnRhbnQgbm90ZSFcblx0XHRcdC8vIHN0YXJ0cyBwYXVzZWRcblx0XHRcdC8vXG5cdFx0XHR2YXIgYkhhbmRsZSA9IG9uKG5vZGUub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsICdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSBlLnRhcmdldDtcblx0XHRcdFx0aWYgKHRhcmdldC5ub2RlVHlwZSAhPT0gMSkge1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0YXJnZXQgJiYgIW5vZGUuY29udGFpbnModGFyZ2V0KSkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0dmFyIGhhbmRsZSA9IHtcblx0XHRcdFx0c3RhdGU6ICdyZXN1bWVkJyxcblx0XHRcdFx0cmVzdW1lOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRiSGFuZGxlLnJlc3VtZSgpO1xuXHRcdFx0XHRcdH0sIDEwMCk7XG5cdFx0XHRcdFx0dGhpcy5zdGF0ZSA9ICdyZXN1bWVkJztcblx0XHRcdFx0fSxcblx0XHRcdFx0cGF1c2U6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRiSGFuZGxlLnBhdXNlKCk7XG5cdFx0XHRcdFx0dGhpcy5zdGF0ZSA9ICdwYXVzZWQnO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZW1vdmU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRiSGFuZGxlLnJlbW92ZSgpO1xuXHRcdFx0XHRcdHRoaXMuc3RhdGUgPSAncmVtb3ZlZCc7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRoYW5kbGUucGF1c2UoKTtcblxuXHRcdFx0cmV0dXJuIGhhbmRsZTtcblx0XHR9XG5cdH07XG5cblx0Ly8gaW50ZXJuYWwgZXZlbnQgaGFuZGxlcnNcblxuXHRmdW5jdGlvbiBvbkRvbUV2ZW50IChub2RlLCBldmVudE5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0bm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIGZhbHNlKTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBmYWxzZSk7XG5cdFx0XHRcdG5vZGUgPSBjYWxsYmFjayA9IG51bGw7XG5cdFx0XHRcdHRoaXMucmVtb3ZlID0gdGhpcy5wYXVzZSA9IHRoaXMucmVzdW1lID0gZnVuY3Rpb24gKCkge307XG5cdFx0XHR9LFxuXHRcdFx0cGF1c2U6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0bm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRyZXN1bWU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0bm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIGZhbHNlKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gb25JbWFnZUxvYWQgKG5vZGUsIGNhbGxiYWNrKSB7XG5cdFx0dmFyIGhhbmRsZSA9IG9uLm1ha2VNdWx0aUhhbmRsZShbXG5cdFx0XHRvbi5vbkRvbUV2ZW50KG5vZGUsICdsb2FkJywgb25JbWFnZUxvYWQpLFxuXHRcdFx0b24obm9kZSwgJ2Vycm9yJywgY2FsbGJhY2spXG5cdFx0XSk7XG5cblx0XHRyZXR1cm4gaGFuZGxlO1xuXG5cdFx0ZnVuY3Rpb24gb25JbWFnZUxvYWQgKGUpIHtcblx0XHRcdHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKG5vZGUubmF0dXJhbFdpZHRoIHx8IG5vZGUubmF0dXJhbEhlaWdodCkge1xuXHRcdFx0XHRcdGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuXHRcdFx0XHRcdGUud2lkdGggID0gZS5uYXR1cmFsV2lkdGggID0gbm9kZS5uYXR1cmFsV2lkdGg7XG5cdFx0XHRcdFx0ZS5oZWlnaHQgPSBlLm5hdHVyYWxIZWlnaHQgPSBub2RlLm5hdHVyYWxIZWlnaHQ7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIDEwMCk7XG5cdFx0XHRoYW5kbGUucmVtb3ZlKCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gb25LZXlFdmVudCAoa2V5RXZlbnROYW1lLCByZSkge1xuXHRcdHJldHVybiBmdW5jdGlvbiBvbktleUhhbmRsZXIgKG5vZGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRyZXR1cm4gb24obm9kZSwga2V5RXZlbnROYW1lLCBmdW5jdGlvbiBvbktleSAoZSkge1xuXHRcdFx0XHRpZiAocmUudGVzdChlLmtleSkpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fTtcblx0fVxuXG5cdC8vIGludGVybmFsIHV0aWxpdGllc1xuXG5cdHZhciBoYXNXaGVlbCA9IChmdW5jdGlvbiBoYXNXaGVlbFRlc3QgKCkge1xuXHRcdHZhclxuXHRcdFx0aXNJRSA9IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignVHJpZGVudCcpID4gLTEsXG5cdFx0XHRkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRyZXR1cm4gXCJvbndoZWVsXCIgaW4gZGl2IHx8IFwid2hlZWxcIiBpbiBkaXYgfHxcblx0XHRcdChpc0lFICYmIGRvY3VtZW50LmltcGxlbWVudGF0aW9uLmhhc0ZlYXR1cmUoXCJFdmVudHMud2hlZWxcIiwgXCIzLjBcIikpOyAvLyBJRSBmZWF0dXJlIGRldGVjdGlvblxuXHR9KSgpO1xuXG5cdHZhciBtYXRjaGVzO1xuXHRbJ21hdGNoZXMnLCAnbWF0Y2hlc1NlbGVjdG9yJywgJ3dlYmtpdCcsICdtb3onLCAnbXMnLCAnbyddLnNvbWUoZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRpZiAobmFtZS5sZW5ndGggPCA3KSB7IC8vIHByZWZpeFxuXHRcdFx0bmFtZSArPSAnTWF0Y2hlc1NlbGVjdG9yJztcblx0XHR9XG5cdFx0aWYgKEVsZW1lbnQucHJvdG90eXBlW25hbWVdKSB7XG5cdFx0XHRtYXRjaGVzID0gbmFtZTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNsb3Nlc3QgKGVsZW1lbnQsIHNlbGVjdG9yLCBwYXJlbnQpIHtcblx0XHR3aGlsZSAoZWxlbWVudCkge1xuXHRcdFx0aWYgKGVsZW1lbnRbb24ubWF0Y2hlc10gJiYgZWxlbWVudFtvbi5tYXRjaGVzXShzZWxlY3RvcikpIHtcblx0XHRcdFx0cmV0dXJuIGVsZW1lbnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZWxlbWVudCA9PT0gcGFyZW50KSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0ZWxlbWVudCA9IGVsZW1lbnQucGFyZW50RWxlbWVudDtcblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHR2YXIgSU5WQUxJRF9QUk9QUyA9IHtcblx0XHRpc1RydXN0ZWQ6IDFcblx0fTtcblx0ZnVuY3Rpb24gbWl4IChvYmplY3QsIHZhbHVlKSB7XG5cdFx0aWYgKCF2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIG9iamVjdDtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdGZvcih2YXIga2V5IGluIHZhbHVlKXtcblx0XHRcdFx0aWYgKCFJTlZBTElEX1BST1BTW2tleV0pIHtcblx0XHRcdFx0XHRvYmplY3Rba2V5XSA9IHZhbHVlW2tleV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0b2JqZWN0LnZhbHVlID0gdmFsdWU7XG5cdFx0fVxuXHRcdHJldHVybiBvYmplY3Q7XG5cdH1cblxuXHR2YXIgaWVLZXlzID0ge1xuXHRcdC8vYTogJ1RFU1QnLFxuXHRcdFVwOiAnQXJyb3dVcCcsXG5cdFx0RG93bjogJ0Fycm93RG93bicsXG5cdFx0TGVmdDogJ0Fycm93TGVmdCcsXG5cdFx0UmlnaHQ6ICdBcnJvd1JpZ2h0Jyxcblx0XHRFc2M6ICdFc2NhcGUnLFxuXHRcdFNwYWNlYmFyOiAnICcsXG5cdFx0V2luOiAnQ29tbWFuZCdcblx0fTtcblxuXHRmdW5jdGlvbiBub3JtYWxpemVLZXlFdmVudCAoY2FsbGJhY2spIHtcblx0XHQvLyBJRSB1c2VzIG9sZCBzcGVjXG5cdFx0cmV0dXJuIGZ1bmN0aW9uIG5vcm1hbGl6ZUtleXMgKGUpIHtcblx0XHRcdGlmIChpZUtleXNbZS5rZXldKSB7XG5cdFx0XHRcdHZhciBmYWtlRXZlbnQgPSBtaXgoe30sIGUpO1xuXHRcdFx0XHRmYWtlRXZlbnQua2V5ID0gaWVLZXlzW2Uua2V5XTtcblx0XHRcdFx0Y2FsbGJhY2soZmFrZUV2ZW50KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNhbGxiYWNrKGUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHZhclxuXHRcdEZBQ1RPUiA9IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignV2luZG93cycpID4gLTEgPyAxMCA6IDAuMSxcblx0XHRYTFI4ID0gMCxcblx0XHRtb3VzZVdoZWVsSGFuZGxlO1xuXG5cdGZ1bmN0aW9uIG5vcm1hbGl6ZVdoZWVsRXZlbnQgKGNhbGxiYWNrKSB7XG5cdFx0Ly8gbm9ybWFsaXplcyBhbGwgYnJvd3NlcnMnIGV2ZW50cyB0byBhIHN0YW5kYXJkOlxuXHRcdC8vIGRlbHRhLCB3aGVlbFksIHdoZWVsWFxuXHRcdC8vIGFsc28gYWRkcyBhY2NlbGVyYXRpb24gYW5kIGRlY2VsZXJhdGlvbiB0byBtYWtlXG5cdFx0Ly8gTWFjIGFuZCBXaW5kb3dzIGJlaGF2ZSBzaW1pbGFybHlcblx0XHRyZXR1cm4gZnVuY3Rpb24gbm9ybWFsaXplV2hlZWwgKGUpIHtcblx0XHRcdFhMUjggKz0gRkFDVE9SO1xuXHRcdFx0dmFyXG5cdFx0XHRcdGRlbHRhWSA9IE1hdGgubWF4KC0xLCBNYXRoLm1pbigxLCAoZS53aGVlbERlbHRhWSB8fCBlLmRlbHRhWSkpKSxcblx0XHRcdFx0ZGVsdGFYID0gTWF0aC5tYXgoLTEwLCBNYXRoLm1pbigxMCwgKGUud2hlZWxEZWx0YVggfHwgZS5kZWx0YVgpKSk7XG5cblx0XHRcdGRlbHRhWSA9IGRlbHRhWSA8PSAwID8gZGVsdGFZIC0gWExSOCA6IGRlbHRhWSArIFhMUjg7XG5cblx0XHRcdGUuZGVsdGEgID0gZGVsdGFZO1xuXHRcdFx0ZS53aGVlbFkgPSBkZWx0YVk7XG5cdFx0XHRlLndoZWVsWCA9IGRlbHRhWDtcblxuXHRcdFx0Y2xlYXJUaW1lb3V0KG1vdXNlV2hlZWxIYW5kbGUpO1xuXHRcdFx0bW91c2VXaGVlbEhhbmRsZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRYTFI4ID0gMDtcblx0XHRcdH0sIDMwMCk7XG5cdFx0XHRjYWxsYmFjayhlKTtcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY2xvc2VzdEZpbHRlciAoZWxlbWVudCwgc2VsZWN0b3IpIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24gKGUpIHtcblx0XHRcdHJldHVybiBvbi5jbG9zZXN0KGUudGFyZ2V0LCBzZWxlY3RvciwgZWxlbWVudCk7XG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIG1ha2VNdWx0aUhhbmRsZSAoaGFuZGxlcykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdGF0ZTogJ3Jlc3VtZWQnLFxuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGhhbmRsZXMuZm9yRWFjaChmdW5jdGlvbiAoaCkge1xuXHRcdFx0XHRcdC8vIGFsbG93IGZvciBhIHNpbXBsZSBmdW5jdGlvbiBpbiB0aGUgbGlzdFxuXHRcdFx0XHRcdGlmIChoLnJlbW92ZSkge1xuXHRcdFx0XHRcdFx0aC5yZW1vdmUoKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBoID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRoKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0aGFuZGxlcyA9IFtdO1xuXHRcdFx0XHR0aGlzLnJlbW92ZSA9IHRoaXMucGF1c2UgPSB0aGlzLnJlc3VtZSA9IGZ1bmN0aW9uICgpIHt9O1xuXHRcdFx0XHR0aGlzLnN0YXRlID0gJ3JlbW92ZWQnO1xuXHRcdFx0fSxcblx0XHRcdHBhdXNlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGhhbmRsZXMuZm9yRWFjaChmdW5jdGlvbiAoaCkge1xuXHRcdFx0XHRcdGlmIChoLnBhdXNlKSB7XG5cdFx0XHRcdFx0XHRoLnBhdXNlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0dGhpcy5zdGF0ZSA9ICdwYXVzZWQnO1xuXHRcdFx0fSxcblx0XHRcdHJlc3VtZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRoYW5kbGVzLmZvckVhY2goZnVuY3Rpb24gKGgpIHtcblx0XHRcdFx0XHRpZiAoaC5yZXN1bWUpIHtcblx0XHRcdFx0XHRcdGgucmVzdW1lKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0dGhpcy5zdGF0ZSA9ICdyZXN1bWVkJztcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0Tm9kZUJ5SWQgKGlkKSB7XG5cdFx0dmFyIG5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG5cdFx0aWYgKCFub2RlKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdgb25gIENvdWxkIG5vdCBmaW5kOicsIGlkKTtcblx0XHR9XG5cdFx0cmV0dXJuIG5vZGU7XG5cdH1cblxuXHRmdW5jdGlvbiBtYWtlQ2FsbGJhY2sgKG5vZGUsIGZpbHRlciwgaGFuZGxlcikge1xuXHRcdGlmIChmaWx0ZXIgJiYgaGFuZGxlcikge1xuXHRcdFx0aWYgKHR5cGVvZiBmaWx0ZXIgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdGZpbHRlciA9IGNsb3Nlc3RGaWx0ZXIobm9kZSwgZmlsdGVyKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHR2YXIgcmVzdWx0ID0gZmlsdGVyKGUpO1xuXHRcdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdFx0ZS5maWx0ZXJlZFRhcmdldCA9IHJlc3VsdDtcblx0XHRcdFx0XHRoYW5kbGVyKGUsIHJlc3VsdCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fVxuXHRcdHJldHVybiBmaWx0ZXIgfHwgaGFuZGxlcjtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldERvYyAobm9kZSkge1xuXHRcdHJldHVybiBub2RlID09PSBkb2N1bWVudCB8fCBub2RlID09PSB3aW5kb3cgPyBkb2N1bWVudCA6IG5vZGUub3duZXJEb2N1bWVudDtcblx0fVxuXG5cdC8vIHB1YmxpYyBmdW5jdGlvbnNcblxuXHRvbi5vbmNlID0gZnVuY3Rpb24gKG5vZGUsIGV2ZW50TmFtZSwgZmlsdGVyLCBjYWxsYmFjaykge1xuXHRcdHZhciBoO1xuXHRcdGlmIChmaWx0ZXIgJiYgY2FsbGJhY2spIHtcblx0XHRcdGggPSBvbihub2RlLCBldmVudE5hbWUsIGZpbHRlciwgZnVuY3Rpb24gb25jZSAoKSB7XG5cdFx0XHRcdGNhbGxiYWNrLmFwcGx5KHdpbmRvdywgYXJndW1lbnRzKTtcblx0XHRcdFx0aC5yZW1vdmUoKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRoID0gb24obm9kZSwgZXZlbnROYW1lLCBmdW5jdGlvbiBvbmNlICgpIHtcblx0XHRcdFx0ZmlsdGVyLmFwcGx5KHdpbmRvdywgYXJndW1lbnRzKTtcblx0XHRcdFx0aC5yZW1vdmUoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gaDtcblx0fTtcblxuXHRvbi5lbWl0ID0gZnVuY3Rpb24gKG5vZGUsIGV2ZW50TmFtZSwgdmFsdWUpIHtcblx0XHRub2RlID0gdHlwZW9mIG5vZGUgPT09ICdzdHJpbmcnID8gZ2V0Tm9kZUJ5SWQobm9kZSkgOiBub2RlO1xuXHRcdHZhciBldmVudCA9IGdldERvYyhub2RlKS5jcmVhdGVFdmVudCgnSFRNTEV2ZW50cycpO1xuXHRcdGV2ZW50LmluaXRFdmVudChldmVudE5hbWUsIHRydWUsIHRydWUpOyAvLyBldmVudCB0eXBlLCBidWJibGluZywgY2FuY2VsYWJsZVxuXHRcdHJldHVybiBub2RlLmRpc3BhdGNoRXZlbnQobWl4KGV2ZW50LCB2YWx1ZSkpO1xuXHR9O1xuXG5cdG9uLmZpcmUgPSBmdW5jdGlvbiAobm9kZSwgZXZlbnROYW1lLCBldmVudERldGFpbCwgYnViYmxlcykge1xuXHRcdG5vZGUgPSB0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycgPyBnZXROb2RlQnlJZChub2RlKSA6IG5vZGU7XG5cdFx0dmFyIGV2ZW50ID0gZ2V0RG9jKG5vZGUpLmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuXHRcdGV2ZW50LmluaXRDdXN0b21FdmVudChldmVudE5hbWUsICEhYnViYmxlcywgdHJ1ZSwgZXZlbnREZXRhaWwpOyAvLyBldmVudCB0eXBlLCBidWJibGluZywgY2FuY2VsYWJsZSwgdmFsdWVcblx0XHRyZXR1cm4gbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0fTtcblxuXHQvLyBUT0RPOiBERVBSRUNBVEVEXG5cdG9uLmlzQWxwaGFOdW1lcmljID0gZnVuY3Rpb24gKHN0cikge1xuXHRcdHJldHVybiAvXlswLTlhLXpdJC9pLnRlc3Qoc3RyKTtcblx0fTtcblxuXHRvbi5tYWtlTXVsdGlIYW5kbGUgPSBtYWtlTXVsdGlIYW5kbGU7XG5cdG9uLm9uRG9tRXZlbnQgPSBvbkRvbUV2ZW50OyAvLyB1c2UgZGlyZWN0bHkgdG8gcHJldmVudCBwb3NzaWJsZSBkZWZpbml0aW9uIGxvb3BzXG5cdG9uLmNsb3Nlc3QgPSBjbG9zZXN0O1xuXHRvbi5tYXRjaGVzID0gbWF0Y2hlcztcblxuXHRyZXR1cm4gb247XG59KSk7XG4iXX0=

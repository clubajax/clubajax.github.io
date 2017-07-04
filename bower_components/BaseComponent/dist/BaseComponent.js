(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(["on", "dom"], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node / CommonJS
        module.exports = factory(require('on'), require('dom'));
    } else {
        // Browser globals (root is window)
        root['BaseComponent'] = factory(root.on, root.dom);
    }
	}(this, function (on, dom) {
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BaseComponent = function (_HTMLElement) {
	_inherits(BaseComponent, _HTMLElement);

	function BaseComponent() {
		_classCallCheck(this, BaseComponent);

		var _this = _possibleConstructorReturn(this, (BaseComponent.__proto__ || Object.getPrototypeOf(BaseComponent)).call(this));

		_this._uid = dom.uid(_this.localName);
		privates[_this._uid] = { DOMSTATE: 'created' };
		privates[_this._uid].handleList = [];
		plugin('init', _this);
		return _this;
	}

	_createClass(BaseComponent, [{
		key: 'connectedCallback',
		value: function connectedCallback() {
			privates[this._uid].DOMSTATE = privates[this._uid].domReadyFired ? 'domready' : 'connected';
			plugin('preConnected', this);
			nextTick(onCheckDomReady.bind(this));
			if (this.connected) {
				this.connected();
			}
			this.fire('connected');
			plugin('postConnected', this);
		}
	}, {
		key: 'onConnected',
		value: function onConnected(callback) {
			var _this2 = this;

			if (this.DOMSTATE === 'connected' || this.DOMSTATE === 'domready') {
				callback(this);
				return;
			}
			this.once('connected', function () {
				callback(_this2);
			});
		}
	}, {
		key: 'onDomReady',
		value: function onDomReady(callback) {
			var _this3 = this;

			if (this.DOMSTATE === 'domready') {
				callback(this);
				return;
			}
			this.once('domready', function () {
				callback(_this3);
			});
		}
	}, {
		key: 'disconnectedCallback',
		value: function disconnectedCallback() {
			var _this4 = this;

			privates[this._uid].DOMSTATE = 'disconnected';
			plugin('preDisconnected', this);
			if (this.disconnected) {
				this.disconnected();
			}
			this.fire('disconnected');

			var time = void 0,
			    dod = BaseComponent.destroyOnDisconnect;
			if (dod) {
				time = typeof dod === 'number' ? doc : 300;
				setTimeout(function () {
					if (_this4.DOMSTATE === 'disconnected') {
						_this4.destroy();
					}
				}, time);
			}
		}
	}, {
		key: 'attributeChangedCallback',
		value: function attributeChangedCallback(attrName, oldVal, newVal) {
			plugin('preAttributeChanged', this, attrName, newVal, oldVal);
			if (this.attributeChanged) {
				this.attributeChanged(attrName, newVal, oldVal);
			}
		}
	}, {
		key: 'destroy',
		value: function destroy() {
			this.fire('destroy');
			privates[this._uid].handleList.forEach(function (handle) {
				handle.remove();
			});
			dom.destroy(this);
		}
	}, {
		key: 'fire',
		value: function fire(eventName, eventDetail, bubbles) {
			return on.fire(this, eventName, eventDetail, bubbles);
		}
	}, {
		key: 'emit',
		value: function emit(eventName, value) {
			return on.emit(this, eventName, value);
		}
	}, {
		key: 'on',
		value: function (_on) {
			function on(_x, _x2, _x3, _x4) {
				return _on.apply(this, arguments);
			}

			on.toString = function () {
				return _on.toString();
			};

			return on;
		}(function (node, eventName, selector, callback) {
			return this.registerHandle(typeof node !== 'string' ? // no node is supplied
			on(node, eventName, selector, callback) : on(this, node, eventName, selector));
		})
	}, {
		key: 'once',
		value: function once(node, eventName, selector, callback) {
			return this.registerHandle(typeof node !== 'string' ? // no node is supplied
			on.once(node, eventName, selector, callback) : on.once(this, node, eventName, selector, callback));
		}
	}, {
		key: 'attr',
		value: function attr(key, value, toggle) {
			this.isSettingAttribute = true;
			var add = toggle === undefined ? true : !!toggle;
			if (add) {
				this.setAttribute(key, value);
			} else {
				this.removeAttribute(key);
			}
			this.isSettingAttribute = false;
		}
	}, {
		key: 'registerHandle',
		value: function registerHandle(handle) {
			privates[this._uid].handleList.push(handle);
			return handle;
		}
	}, {
		key: 'DOMSTATE',
		get: function get() {
			return privates[this._uid].DOMSTATE;
		}
	}], [{
		key: 'clone',
		value: function clone(template) {
			if (template.content && template.content.children) {
				return document.importNode(template.content, true);
			}
			var frag = document.createDocumentFragment();
			var cloneNode = document.createElement('div');
			cloneNode.innerHTML = template.innerHTML;

			while (cloneNode.children.length) {
				frag.appendChild(cloneNode.children[0]);
			}
			return frag;
		}
	}, {
		key: 'addPlugin',
		value: function addPlugin(plug) {
			var i = void 0,
			    order = plug.order || 100;
			if (!plugins.length) {
				plugins.push(plug);
			} else if (plugins.length === 1) {
				if (plugins[0].order <= order) {
					plugins.push(plug);
				} else {
					plugins.unshift(plug);
				}
			} else if (plugins[0].order > order) {
				plugins.unshift(plug);
			} else {

				for (i = 1; i < plugins.length; i++) {
					if (order === plugins[i - 1].order || order > plugins[i - 1].order && order < plugins[i].order) {
						plugins.splice(i, 0, plug);
						return;
					}
				}
				// was not inserted...
				plugins.push(plug);
			}
		}
	}, {
		key: 'destroyOnDisconnect',
		set: function set(value) {
			privates['destroyOnDisconnect'] = value;
		},
		get: function get() {
			return privates['destroyOnDisconnect'];
		}
	}]);

	return BaseComponent;
}(HTMLElement);

var privates = {},
    plugins = [];

function plugin(method, node, a, b, c) {
	plugins.forEach(function (plug) {
		if (plug[method]) {
			plug[method](node, a, b, c);
		}
	});
}

function onCheckDomReady() {
	if (this.DOMSTATE !== 'connected' || privates[this._uid].domReadyFired) {
		return;
	}

	var count = 0,
	    children = getChildCustomNodes(this),
	    ourDomReady = onDomReady.bind(this);

	function addReady() {
		count++;
		if (count === children.length) {
			ourDomReady();
		}
	}

	// If no children, we're good - leaf node. Commence with onDomReady
	//
	if (!children.length) {
		ourDomReady();
	} else {
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

function onDomReady() {
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

	this.fire('domready');

	plugin('postDomReady', this);
}

function getChildCustomNodes(node) {
	// collect any children that are custom nodes
	// used to check if their dom is ready before
	// determining if this is ready
	var i = void 0,
	    nodes = [];
	for (i = 0; i < node.children.length; i++) {
		if (node.children[i].nodeName.indexOf('-') > -1) {
			nodes.push(node.children[i]);
		}
	}
	return nodes;
}

function nextTick(cb) {
	requestAnimationFrame(cb);
}

window.onDomReady = function (node, callback) {
	function onReady() {
		callback(node);
		node.removeEventListener('domready', onReady);
	}

	if (node.DOMSTATE === 'domready') {
		callback(node);
	} else {
		node.addEventListener('domready', onReady);
	}
};

	return BaseComponent;

}));
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const BaseComponent = require('./BaseComponent');

const r = /\{\{\w*}}/g;
const destroyer = document.createElement('div');

// FIXME: time current process
// Try a new one where meta data is created, instead of a template

function createCondition(name, value) {
    // FIXME name?
    value = value.replace(r, function (w) {
        w = w.replace('{{', '').replace('}}', '');
        return 'item["' + w + '"]';
    });
    //console.log('createCondition', name, value);
    return function (item) {
        return eval(value);
    };
}

function walkDom(node, refs) {

    let item = {
        node: node
    };

    refs.nodes.push(item);

    if (node.attributes) {
        for (let i = 0; i < node.attributes.length; i++) {
            let
                name = node.attributes[i].name,
                value = node.attributes[i].value;
            //console.log('  ', name, value);
            if (name === 'if') {
                item.conditional = createCondition(name, value);
            }
            else if (/\{\{/.test(value)) {
                // <div id="{{id}}">
                refs.attributes = refs.attributes || {};
                item.attributes = item.attributes || {};
                item.attributes[name] = value;
                // could be more than one??
                // same with node?
                refs.attributes[name] = node;
            }
        }
    }

    // should probably loop over childNodes and check text nodes for replacements
    //
    if (!node.children.length) {
        if (/\{\{/.test(node.innerHTML)) {
            // FIXME - innerHTML as value too naive
            let prop = node.innerHTML.replace('{{', '').replace('}}', '');
            item.text = item.text || {};
            item.text[prop] = node.innerHTML;
            refs[prop] = node;
        }
        return;
    }

    for (let i = 0; i < node.children.length; i++) {
        walkDom(node.children[i], refs);
    }
}

function updateItemTemplate(frag) {
    let refs = {
        nodes: []
    };
    walkDom(frag, refs);
    return refs;
}

function destroy (node) {
	if(node) {
		destroyer.appendChild(node);
		destroyer.innerHTML = '';
	}
}

BaseComponent.prototype.renderList = function (items, container, itemTemplate) {
    let
        frag = document.createDocumentFragment(),
        tmpl = itemTemplate || this.itemTemplate,
        refs = tmpl.itemRefs,
        clone,
        defer;

    function warn(name) {
        clearTimeout(defer);
        defer = setTimeout(function () {
            console.warn('Attempted to set attribute from non-existent item property:', name);
        }, 1);
    }

    items.forEach(function (item) {

        let
            ifCount = 0,
            deletions = [];

        refs.nodes.forEach(function (ref) {

            //
            // can't swap because the innerHTML is being changed
            // can't clone because then there is not a node reference
            //
            let
                value,
                node = ref.node,
                hasNode = true;
            if (ref.conditional) {
                if (!ref.conditional(item)) {
                    hasNode = false;
                    ifCount++;
                    // can't actually delete, because this is the original template
                    // instead, adding attribute to track node, to be deleted in clone
                    // then after, remove temporary attribute from template
                    ref.node.setAttribute('ifs', ifCount+'');
                    deletions.push('[ifs="'+ifCount+'"]');
                }
            }
            if (hasNode) {
                if (ref.attributes) {
                    Object.keys(ref.attributes).forEach(function (key) {
                        value = ref.attributes[key];
                        ref.node.setAttribute(key, item[key]);
                        //console.log('swap att', key, value, ref.node);
                    });
                }
                if (ref.text) {
                    Object.keys(ref.text).forEach(function (key) {
                        value = ref.text[key];
                        //console.log('swap text', key, item[key]);
                        node.innerHTML = value.replace(value, item[key])
                    });
                }
            }
        });

        clone = tmpl.cloneNode(true);

        deletions.forEach(function (del) {
            let node = clone.querySelector(del);
            if(node) {
                destroy(node);
                let tmplNode = tmpl.querySelector(del);
                tmplNode.removeAttribute('ifs');
            }
        });

        frag.appendChild(clone);
    });

    container.appendChild(frag);

    //items.forEach(function (item) {
    //    Object.keys(item).forEach(function (key) {
    //        if(refs[key]){
    //            refs[key].innerHTML = item[key];
    //        }
    //    });
    //    if(refs.attributes){
    //        Object.keys(refs.attributes).forEach(function (name) {
    //            let node = refs.attributes[name];
    //            if(item[name] !== undefined) {
    //                node.setAttribute(name, item[name]);
    //            }else{
    //                warn(name);
    //            }
    //        });
    //    }
    //
    //    clone = tmpl.cloneNode(true);
    //    frag.appendChild(clone);
    //});

    //container.appendChild(frag);
};

BaseComponent.addPlugin({
    name: 'item-template',
    order: 40,
    preDomReady: function (node) {
        node.itemTemplate = node.querySelector('template');
        if (node.itemTemplate) {
            node.itemTemplate.parentNode.removeChild(node.itemTemplate);
            node.itemTemplate = BaseComponent.clone(node.itemTemplate);
            node.itemTemplate.itemRefs = updateItemTemplate(node.itemTemplate);
        }
    }
});

module.exports = {
	'item-template': true
};
},{"./BaseComponent":"BaseComponent"}],2:[function(require,module,exports){
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
},{"./BaseComponent":"BaseComponent"}],3:[function(require,module,exports){
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
},{"./BaseComponent":"BaseComponent"}],4:[function(require,module,exports){
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
},{"./BaseComponent":"BaseComponent"}],5:[function(require,module,exports){
window['no-native-shim'] = true;
require('@clubajax/custom-elements-polyfill');
window.on = require('@clubajax/on');
window.dom = require('@clubajax/dom');


},{"@clubajax/custom-elements-polyfill":"@clubajax/custom-elements-polyfill","@clubajax/dom":"@clubajax/dom","@clubajax/on":"@clubajax/on"}],6:[function(require,module,exports){
const BaseComponent  = require('../../src/BaseComponent');
const properties = require('../../src/properties');
const template = require('../../src/template');
const refs = require('../../src/refs');
const itemTemplate = require('../../src/item-template');
window.rand = require('randomizer');

class TestProps extends BaseComponent {

	constructor(...args) {
		super();
		// this.connectedProps = true;
	}

    static get observedAttributes() { return ['min', 'max', 'foo', 'bar', 'nbc', 'cbs', 'disabled', 'readonly', 'tabindex', 'my-complex-prop']; }
    get props () { return ['foo', 'bar', 'tabindex', 'min', 'max', 'my-complex-prop']; }
    get bools () { return ['nbc', 'cbs', 'disabled', 'readonly']; }

    onFoo () {
		on.fire(document, 'foo-called');
	}

	onNbc () {
		on.fire(document, 'nbc-called');
	}

    attributeChanged (name, value) {
        this[name + '-changed'] = dom.normalize(value) || value !== null;
	}
}
customElements.define('test-props', TestProps);


class TestNewProps extends BaseComponent {

	constructor(...args) {
		super();
		console.log('NEW!');
		//this.setProps(['foo']);
	}

	getProps () {
		return ['foo']
	}

	// static get observedAttributes() {
	// 	debugger
	// 	return ['nbc']
	// }

	attributeChanged (name, value) {
		console.log(' ---- change', name, value);
	}
}
customElements.define('test-new-props', TestNewProps);
window.TestNewProps = TestNewProps;

class TestLifecycle extends BaseComponent {

    static get observedAttributes() {return ['foo', 'bar']; }

    set foo (value) {
        this.__foo = value;
    }

    get foo () {
        return this.__foo;
    }

    set bar (value) {
        this.__bar = value;
    }

    get bar () {
        return this.__bar || 'NOTSET';
    }

    constructor(...args) {
        super();
    }

    connected () {
        on.fire(document, 'connected-called', this);
    }

    domReady () {
        on.fire(document, 'domready-called', this);
    }

    disconnected () {
        on.fire(document, 'disconnected-called', this);
    }

}

customElements.define('test-lifecycle', TestLifecycle);

BaseComponent.addPlugin({
    init: function (node, a, b, c) {
        on.fire(document, 'init-called');
    },
    preConnected: function (node, a, b, c) {
        on.fire(document, 'preConnected-called');
    },
    postConnected: function (node, a, b, c) {
        on.fire(document, 'postConnected-called');
    },
    preDomReady: function (node, a, b, c) {
        on.fire(document, 'preDomReady-called');
    },
    postDomReady: function (node, a, b, c) {
        on.fire(document, 'postDomReady-called');
    }
});


class TestTmplString extends BaseComponent {
    get templateString () {
        return `<div>This is a simple template</div>`;
    }
}
customElements.define('test-tmpl-string', TestTmplString);

class TestTmplId extends BaseComponent {
    get templateId () {
        return 'test-tmpl-id-template';
    }
}
customElements.define('test-tmpl-id', TestTmplId);


class TestTmplRefs extends BaseComponent {
    get templateString () {
        return `<div on="click:onClick" ref="clickNode">
            <label ref="labelNode">label:</label>
            <span ref="valueNode">value</span>
        </div>`;
    }

    onClick () {
        on.fire(document, 'ref-click-called');
    }
}
customElements.define('test-tmpl-refs', TestTmplRefs);


class ChildButton extends BaseComponent {
	get templateString () {
		return `<button ref="btnNode" on="click:onClick">Click Me</button>`;
	}

	onClick () {
		this.emit('change', {value: this.getAttribute('value')});
	}

}
customElements.define('child-button', ChildButton);

class TestTmplCmptRefs extends BaseComponent {
	get templateString () {
		return `<div>
			<child-button on="change:onChange" value="A" ></child-button>
			<child-button on="change:onChange" value="B" ></child-button>
			<child-button on="change:onChange" value="C" ></child-button>
        </div>`;
	}

	onChange (e) {
		on.fire(document, 'ref-change-called', {value:e.value});
	}
}
customElements.define('test-tmpl-cmpt-refs', TestTmplCmptRefs);

class TestTmplContainer extends BaseComponent {
    get templateString () {
        return `<div>
            <label ref="labelNode">label:</label>
            <span ref="valueNode">value</span>
            <div ref="container"></div>
        </div>`;
    }
}
customElements.define('test-tmpl-container', TestTmplContainer);


// simple nested templates
class TestTmplNestedA extends BaseComponent {
    constructor () {
        super();
        this.nestedTemplate = true;
    }

    get templateString () {
        return `<section>
            <div>content A before</div>
            <section ref="container"></section>
            <div>content A after</div>
        </section>`;
    }
}
customElements.define('test-tmpl-nested-a', TestTmplNestedA);

class TestTmplNestedB extends TestTmplNestedA {
    constructor () {
        super();
    }
    get templateString () {
        return `<div>content B</div>`;
    }
}
customElements.define('test-tmpl-nested-b', TestTmplNestedB);


// nested plus light dom
class TestTmplNestedC extends TestTmplNestedA {
    constructor () {
        super();
    }
    get templateString () {
        return `<section>
            <div>content C before</div>
            <div ref="container"></div>
            <div>content C after</div>
        </section>`;
    }
}
customElements.define('test-tmpl-nested-c', TestTmplNestedC);


// 5-deep nested templates
class TestA extends BaseComponent {}
class TestB extends TestA {
    constructor () {
        super();
    }
    get templateString () {
        return `<section>
            <div>content B before</div>
            <section ref="container"></section>
            <div>content B after</div>
        </section>`;
    }
}
class TestC extends TestB {}
class TestD extends TestC {
    constructor () {
        super();
    }
    get templateString () {
        return `<div>content D</div>`;
    }
}
class TestE extends TestD {
    constructor () {
        super();
        this.nestedTemplate = true;
    }
}
customElements.define('test-a', TestA);
customElements.define('test-b', TestB);
customElements.define('test-c', TestC);
customElements.define('test-d', TestD);
customElements.define('test-e', TestE);

class TestList extends BaseComponent {

    static get observedAttributes() { return ['list-title']; }
    get props () { return ['list-title']; }

    constructor () {
        super();
    }

    get templateString () {
        return `
            <div class="title" ref="titleNode"></div>
            <div ref="container"></div>`;
    }
    
    set data (items) {
        this.renderList(items, this.container);
    }

    domReady () {
        this.titleNode.innerHTML = this['list-title'];
    }
}
customElements.define('test-list', TestList);

class TestListComponent extends BaseComponent {

	static get observedAttributes() { return ['item-tag']; }
	get props () { return ['item-tag']; }

	constructor () {
		super();
	}

	set data (items) {
		this.items = items;
		this.onConnected(this.renderItems.bind(this));
	}

	renderItems () {
		const frag = document.createDocumentFragment();
		const tag = this['item-tag'];
		const self = this;
		this.items.forEach(function (item) {
			const node = dom(tag, {}, frag);
			node.data = item;
		});
		this.onDomReady(() => {
			this.appendChild(frag);
		});
	}

	domReady () {

	}
}
customElements.define('test-list-component', TestListComponent);

// address1:"6441"
// address2:"Alexander Way"
// birthday:"01/14/2018"
// city:"Durham"
// company:"Craigslist"
// email:"jcurtis@craigslist.com"
// firstName:"Jordan"
// lastName:"Curtis"
// phone:"704-750-4316"
// ssn:"361-17-6344"
// state:"North Carolina"
// zipcode:"86310"


class TestListComponentItem extends BaseComponent {

	static get observedAttributes() { return ['list-title']; }
	get props () { return ['list-title']; }

	constructor () {
		super();
	}

	set data (item) {
		this.item = item;
		this.onConnected(this.renderItem.bind(this));
	}

	renderItem () {
		const item = this.item;
		const self = this;

		dom('div', {html:[
			dom('label', {html: 'Name:'}),
			dom('span', {html: item.firstName}),
			dom('span', {html: item.lastName})
		]}, this);

		dom('div', {html:[
			dom('div', {class: 'indent', html:[
				dom('div', {html:[
					dom('label', {html: 'Address:'}),
					dom('span', {html: item.address1}),
					dom('span', {html: item.address2}),
					dom('span', {html: item.city}),
					dom('span', {html: item.state}),
					dom('span', {html: item.zipcode})
				]}),
				dom('div', {html:[
					dom('label', {html: 'Company:'}),
					dom('span', {html: item.company})
				]}),
				dom('div', {html:[
					dom('label', {html: 'Birthday:'}),
					dom('span', {html: item.birthday})
				]}),
				dom('div', {html:[
					dom('label', {html: 'SSN:'}),
					dom('span', {html: item.ssn})
				]})
			]})
		]}, this);
	}

	domReady () {

	}
}
customElements.define('test-list-component-item', TestListComponentItem);

class TestListComponentTmpl extends BaseComponent {

	static get observedAttributes() { return ['list-title']; }
	get props () { return ['list-title']; }

	constructor () {
		super();
	}

	get templateString () {
		return `
            <div>
            	<label>Name:</label><span ref="firstName"></span><span ref="lastName"></span>
			</div>
			<div class="indent">
				<div>
					<label>Address:</label><span ref="address1"></span><span ref="address2"></span><span ref="city"></span><span ref="state"></span><span ref="zipcode"></span>
				</div>
				<div>
					<label>Company:</label><span ref="company"></span>
				</div>
				<div>
					<label>DOB:</label><span ref="birthday"></span>
				</div>
				<div>
					<label>SSN:</label><span ref="ssn"></span>
				</div>
			</div>
		`;
	}

	set data (item) {
		this.item = item;
		this.onConnected(this.renderItem.bind(this));
	}

	renderItem () {
		const item = this.item;
		const self = this;
		Object.keys(item).forEach(function (key) {
			if(self[key]){
				let node = document.createTextNode(item[key]);
				self[key].appendChild(node);
			}
		})
	}

	domReady () {

	}
}
customElements.define('test-list-component-tmpl', TestListComponentTmpl);

window.itemTemplateString = `<template>
    <div id="{{id}}">
        <span>{{first}}</span>
        <span>{{last}}</span>
        <span>{{role}}</span>
    </div>
</template>`;

window.ifAttrTemplateString = `<template>
    <div id="{{id}}">
        <span>{{first}}</span>
        <span>{{last}}</span>
        <span>{{role}}</span>
        <span if="{{amount}} < 2" class="amount">{{amount}}</span>
        <span if="{{type}} === 'sane'" class="sanity">{{type}}</span>
    </div>
</template>`;

function dev () {
    var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    var s = '{{amount}} + {{num}} + 3';
    var list = [{amount: 1, num: 2}, {amount: 3, num: 4}, {amount: 5, num: 6}];
    var r = /\{\{\w*}}/g;
    var fn = [];
    var args = [];
    var f;
    s = s.replace(r, function(w){
        console.log('word', w);
        var v = alphabet.shift();
        fn.push(v);
        args.push(/\w+/g.exec(w)[0]);
        return v;
    });
    fn.push(s);

    console.log('fn', fn);
    console.log('args', args);
    //s = 'return ' + s + ';';
    console.log('s', s);

    window.f = new Function(s);

    var dynFn = function (a,b,c,d,e,f) {
        var r = eval(s);
        return r;
    };

    console.log('  f:', dynFn(1,2));
    //
    list.forEach(function (item) {
        var a = args.map(function (arg) {
            return item[arg];
        });
        var r = dynFn.apply(null, a);
        console.log('r', r);
    });


}
//dev();
},{"../../src/BaseComponent":"BaseComponent","../../src/item-template":1,"../../src/properties":2,"../../src/refs":3,"../../src/template":4,"randomizer":"randomizer"}],"BaseComponent":[function(require,module,exports){
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
},{"@clubajax/on":"@clubajax/on"}]},{},[5,6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaXRlbS10ZW1wbGF0ZS5qcyIsInNyYy9wcm9wZXJ0aWVzLmpzIiwic3JjL3JlZnMuanMiLCJzcmMvdGVtcGxhdGUuanMiLCJ0ZXN0cy9zcmMvZ2xvYmFscy5qcyIsInRlc3RzL3NyYy9saWZlY3ljbGUuanMiLCJzcmMvQmFzZUNvbXBvbmVudCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4ZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJy4vQmFzZUNvbXBvbmVudCcpO1xuXG5jb25zdCByID0gL1xce1xce1xcdyp9fS9nO1xuY29uc3QgZGVzdHJveWVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbi8vIEZJWE1FOiB0aW1lIGN1cnJlbnQgcHJvY2Vzc1xuLy8gVHJ5IGEgbmV3IG9uZSB3aGVyZSBtZXRhIGRhdGEgaXMgY3JlYXRlZCwgaW5zdGVhZCBvZiBhIHRlbXBsYXRlXG5cbmZ1bmN0aW9uIGNyZWF0ZUNvbmRpdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIC8vIEZJWE1FIG5hbWU/XG4gICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKHIsIGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHcgPSB3LnJlcGxhY2UoJ3t7JywgJycpLnJlcGxhY2UoJ319JywgJycpO1xuICAgICAgICByZXR1cm4gJ2l0ZW1bXCInICsgdyArICdcIl0nO1xuICAgIH0pO1xuICAgIC8vY29uc29sZS5sb2coJ2NyZWF0ZUNvbmRpdGlvbicsIG5hbWUsIHZhbHVlKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGV2YWwodmFsdWUpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHdhbGtEb20obm9kZSwgcmVmcykge1xuXG4gICAgbGV0IGl0ZW0gPSB7XG4gICAgICAgIG5vZGU6IG5vZGVcbiAgICB9O1xuXG4gICAgcmVmcy5ub2Rlcy5wdXNoKGl0ZW0pO1xuXG4gICAgaWYgKG5vZGUuYXR0cmlidXRlcykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5vZGUuYXR0cmlidXRlc1tpXS5uYW1lLFxuICAgICAgICAgICAgICAgIHZhbHVlID0gbm9kZS5hdHRyaWJ1dGVzW2ldLnZhbHVlO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnICAnLCBuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gJ2lmJykge1xuICAgICAgICAgICAgICAgIGl0ZW0uY29uZGl0aW9uYWwgPSBjcmVhdGVDb25kaXRpb24obmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoL1xce1xcey8udGVzdCh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAvLyA8ZGl2IGlkPVwie3tpZH19XCI+XG4gICAgICAgICAgICAgICAgcmVmcy5hdHRyaWJ1dGVzID0gcmVmcy5hdHRyaWJ1dGVzIHx8IHt9O1xuICAgICAgICAgICAgICAgIGl0ZW0uYXR0cmlidXRlcyA9IGl0ZW0uYXR0cmlidXRlcyB8fCB7fTtcbiAgICAgICAgICAgICAgICBpdGVtLmF0dHJpYnV0ZXNbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAvLyBjb3VsZCBiZSBtb3JlIHRoYW4gb25lPz9cbiAgICAgICAgICAgICAgICAvLyBzYW1lIHdpdGggbm9kZT9cbiAgICAgICAgICAgICAgICByZWZzLmF0dHJpYnV0ZXNbbmFtZV0gPSBub2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gc2hvdWxkIHByb2JhYmx5IGxvb3Agb3ZlciBjaGlsZE5vZGVzIGFuZCBjaGVjayB0ZXh0IG5vZGVzIGZvciByZXBsYWNlbWVudHNcbiAgICAvL1xuICAgIGlmICghbm9kZS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgaWYgKC9cXHtcXHsvLnRlc3Qobm9kZS5pbm5lckhUTUwpKSB7XG4gICAgICAgICAgICAvLyBGSVhNRSAtIGlubmVySFRNTCBhcyB2YWx1ZSB0b28gbmFpdmVcbiAgICAgICAgICAgIGxldCBwcm9wID0gbm9kZS5pbm5lckhUTUwucmVwbGFjZSgne3snLCAnJykucmVwbGFjZSgnfX0nLCAnJyk7XG4gICAgICAgICAgICBpdGVtLnRleHQgPSBpdGVtLnRleHQgfHwge307XG4gICAgICAgICAgICBpdGVtLnRleHRbcHJvcF0gPSBub2RlLmlubmVySFRNTDtcbiAgICAgICAgICAgIHJlZnNbcHJvcF0gPSBub2RlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgd2Fsa0RvbShub2RlLmNoaWxkcmVuW2ldLCByZWZzKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUl0ZW1UZW1wbGF0ZShmcmFnKSB7XG4gICAgbGV0IHJlZnMgPSB7XG4gICAgICAgIG5vZGVzOiBbXVxuICAgIH07XG4gICAgd2Fsa0RvbShmcmFnLCByZWZzKTtcbiAgICByZXR1cm4gcmVmcztcbn1cblxuZnVuY3Rpb24gZGVzdHJveSAobm9kZSkge1xuXHRpZihub2RlKSB7XG5cdFx0ZGVzdHJveWVyLmFwcGVuZENoaWxkKG5vZGUpO1xuXHRcdGRlc3Ryb3llci5pbm5lckhUTUwgPSAnJztcblx0fVxufVxuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5yZW5kZXJMaXN0ID0gZnVuY3Rpb24gKGl0ZW1zLCBjb250YWluZXIsIGl0ZW1UZW1wbGF0ZSkge1xuICAgIGxldFxuICAgICAgICBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxuICAgICAgICB0bXBsID0gaXRlbVRlbXBsYXRlIHx8IHRoaXMuaXRlbVRlbXBsYXRlLFxuICAgICAgICByZWZzID0gdG1wbC5pdGVtUmVmcyxcbiAgICAgICAgY2xvbmUsXG4gICAgICAgIGRlZmVyO1xuXG4gICAgZnVuY3Rpb24gd2FybihuYW1lKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWZlcik7XG4gICAgICAgIGRlZmVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0F0dGVtcHRlZCB0byBzZXQgYXR0cmlidXRlIGZyb20gbm9uLWV4aXN0ZW50IGl0ZW0gcHJvcGVydHk6JywgbmFtZSk7XG4gICAgICAgIH0sIDEpO1xuICAgIH1cblxuICAgIGl0ZW1zLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcblxuICAgICAgICBsZXRcbiAgICAgICAgICAgIGlmQ291bnQgPSAwLFxuICAgICAgICAgICAgZGVsZXRpb25zID0gW107XG5cbiAgICAgICAgcmVmcy5ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWYpIHtcblxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIGNhbid0IHN3YXAgYmVjYXVzZSB0aGUgaW5uZXJIVE1MIGlzIGJlaW5nIGNoYW5nZWRcbiAgICAgICAgICAgIC8vIGNhbid0IGNsb25lIGJlY2F1c2UgdGhlbiB0aGVyZSBpcyBub3QgYSBub2RlIHJlZmVyZW5jZVxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIGxldFxuICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgICAgIG5vZGUgPSByZWYubm9kZSxcbiAgICAgICAgICAgICAgICBoYXNOb2RlID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChyZWYuY29uZGl0aW9uYWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlZi5jb25kaXRpb25hbChpdGVtKSkge1xuICAgICAgICAgICAgICAgICAgICBoYXNOb2RlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FuJ3QgYWN0dWFsbHkgZGVsZXRlLCBiZWNhdXNlIHRoaXMgaXMgdGhlIG9yaWdpbmFsIHRlbXBsYXRlXG4gICAgICAgICAgICAgICAgICAgIC8vIGluc3RlYWQsIGFkZGluZyBhdHRyaWJ1dGUgdG8gdHJhY2sgbm9kZSwgdG8gYmUgZGVsZXRlZCBpbiBjbG9uZVxuICAgICAgICAgICAgICAgICAgICAvLyB0aGVuIGFmdGVyLCByZW1vdmUgdGVtcG9yYXJ5IGF0dHJpYnV0ZSBmcm9tIHRlbXBsYXRlXG4gICAgICAgICAgICAgICAgICAgIHJlZi5ub2RlLnNldEF0dHJpYnV0ZSgnaWZzJywgaWZDb3VudCsnJyk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0aW9ucy5wdXNoKCdbaWZzPVwiJytpZkNvdW50KydcIl0nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaGFzTm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZWYuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhyZWYuYXR0cmlidXRlcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHJlZi5hdHRyaWJ1dGVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICByZWYubm9kZS5zZXRBdHRyaWJ1dGUoa2V5LCBpdGVtW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc3dhcCBhdHQnLCBrZXksIHZhbHVlLCByZWYubm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVmLnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMocmVmLnRleHQpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSByZWYudGV4dFtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc3dhcCB0ZXh0Jywga2V5LCBpdGVtW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5pbm5lckhUTUwgPSB2YWx1ZS5yZXBsYWNlKHZhbHVlLCBpdGVtW2tleV0pXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2xvbmUgPSB0bXBsLmNsb25lTm9kZSh0cnVlKTtcblxuICAgICAgICBkZWxldGlvbnMuZm9yRWFjaChmdW5jdGlvbiAoZGVsKSB7XG4gICAgICAgICAgICBsZXQgbm9kZSA9IGNsb25lLnF1ZXJ5U2VsZWN0b3IoZGVsKTtcbiAgICAgICAgICAgIGlmKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBkZXN0cm95KG5vZGUpO1xuICAgICAgICAgICAgICAgIGxldCB0bXBsTm9kZSA9IHRtcGwucXVlcnlTZWxlY3RvcihkZWwpO1xuICAgICAgICAgICAgICAgIHRtcGxOb2RlLnJlbW92ZUF0dHJpYnV0ZSgnaWZzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoY2xvbmUpO1xuICAgIH0pO1xuXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGZyYWcpO1xuXG4gICAgLy9pdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgLy8gICAgT2JqZWN0LmtleXMoaXRlbSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgLy8gICAgICAgIGlmKHJlZnNba2V5XSl7XG4gICAgLy8gICAgICAgICAgICByZWZzW2tleV0uaW5uZXJIVE1MID0gaXRlbVtrZXldO1xuICAgIC8vICAgICAgICB9XG4gICAgLy8gICAgfSk7XG4gICAgLy8gICAgaWYocmVmcy5hdHRyaWJ1dGVzKXtcbiAgICAvLyAgICAgICAgT2JqZWN0LmtleXMocmVmcy5hdHRyaWJ1dGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgLy8gICAgICAgICAgICBsZXQgbm9kZSA9IHJlZnMuYXR0cmlidXRlc1tuYW1lXTtcbiAgICAvLyAgICAgICAgICAgIGlmKGl0ZW1bbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgIC8vICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKG5hbWUsIGl0ZW1bbmFtZV0pO1xuICAgIC8vICAgICAgICAgICAgfWVsc2V7XG4gICAgLy8gICAgICAgICAgICAgICAgd2FybihuYW1lKTtcbiAgICAvLyAgICAgICAgICAgIH1cbiAgICAvLyAgICAgICAgfSk7XG4gICAgLy8gICAgfVxuICAgIC8vXG4gICAgLy8gICAgY2xvbmUgPSB0bXBsLmNsb25lTm9kZSh0cnVlKTtcbiAgICAvLyAgICBmcmFnLmFwcGVuZENoaWxkKGNsb25lKTtcbiAgICAvL30pO1xuXG4gICAgLy9jb250YWluZXIuYXBwZW5kQ2hpbGQoZnJhZyk7XG59O1xuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ2l0ZW0tdGVtcGxhdGUnLFxuICAgIG9yZGVyOiA0MCxcbiAgICBwcmVEb21SZWFkeTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgbm9kZS5pdGVtVGVtcGxhdGUgPSBub2RlLnF1ZXJ5U2VsZWN0b3IoJ3RlbXBsYXRlJyk7XG4gICAgICAgIGlmIChub2RlLml0ZW1UZW1wbGF0ZSkge1xuICAgICAgICAgICAgbm9kZS5pdGVtVGVtcGxhdGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlLml0ZW1UZW1wbGF0ZSk7XG4gICAgICAgICAgICBub2RlLml0ZW1UZW1wbGF0ZSA9IEJhc2VDb21wb25lbnQuY2xvbmUobm9kZS5pdGVtVGVtcGxhdGUpO1xuICAgICAgICAgICAgbm9kZS5pdGVtVGVtcGxhdGUuaXRlbVJlZnMgPSB1cGRhdGVJdGVtVGVtcGxhdGUobm9kZS5pdGVtVGVtcGxhdGUpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHQnaXRlbS10ZW1wbGF0ZSc6IHRydWVcbn07IiwiY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJy4vQmFzZUNvbXBvbmVudCcpO1xuXG5mdW5jdGlvbiBzZXRCb29sZWFuIChub2RlLCBwcm9wKSB7XG5cdGxldCBwcm9wVmFsdWU7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBwcm9wLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0Z2V0ICgpIHtcblx0XHRcdGNvbnN0IGF0dCA9IHRoaXMuZ2V0QXR0cmlidXRlKHByb3ApO1xuXHRcdFx0cmV0dXJuIChhdHQgIT09IHVuZGVmaW5lZCAmJiBhdHQgIT09IG51bGwgJiYgYXR0ICE9PSAnZmFsc2UnICYmIGF0dCAhPT0gZmFsc2UpO1xuXHRcdH0sXG5cdFx0c2V0ICh2YWx1ZSkge1xuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSB0cnVlO1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdHRoaXMuc2V0QXR0cmlidXRlKHByb3AsICcnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucmVtb3ZlQXR0cmlidXRlKHByb3ApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuYXR0cmlidXRlQ2hhbmdlZCkge1xuXHRcdFx0XHR0aGlzLmF0dHJpYnV0ZUNoYW5nZWQocHJvcCwgdmFsdWUpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZm4gPSB0aGlzW29uaWZ5KHByb3ApXTtcblx0XHRcdGlmIChmbikge1xuXHRcdFx0XHRjb25zdCBldmVudE5hbWUgPSB0aGlzLmNvbm5lY3RlZFByb3BzID8gJ29uQ29ubmVjdGVkJyA6ICdvbkRvbVJlYWR5Jztcblx0XHRcdFx0d2luZG93W2V2ZW50TmFtZV0odGhpcywgKCkgPT4ge1xuXG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgcHJvcFZhbHVlICE9PSB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0dmFsdWUgPSBmbi5jYWxsKHRoaXMsIHZhbHVlKSB8fCB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cHJvcFZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldFByb3BlcnR5IChub2RlLCBwcm9wKSB7XG5cdGxldCBwcm9wVmFsdWU7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBwcm9wLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0Z2V0ICgpIHtcblx0XHRcdHJldHVybiBwcm9wVmFsdWUgIT09IHVuZGVmaW5lZCA/IHByb3BWYWx1ZSA6IG5vcm1hbGl6ZSh0aGlzLmdldEF0dHJpYnV0ZShwcm9wKSk7XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHR0aGlzLnNldEF0dHJpYnV0ZShwcm9wLCB2YWx1ZSk7XG5cdFx0XHRpZiAodGhpcy5hdHRyaWJ1dGVDaGFuZ2VkKSB7XG5cdFx0XHRcdHRoaXMuYXR0cmlidXRlQ2hhbmdlZChwcm9wLCB2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBmbiA9IHRoaXNbb25pZnkocHJvcCldO1xuXHRcdFx0aWYoZm4pe1xuXHRcdFx0XHRjb25zdCBldmVudE5hbWUgPSB0aGlzLmNvbm5lY3RlZFByb3BzID8gJ29uQ29ubmVjdGVkJyA6ICdvbkRvbVJlYWR5Jztcblx0XHRcdFx0d2luZG93W2V2ZW50TmFtZV0odGhpcywgKCkgPT4ge1xuXHRcdFx0XHRcdGlmKHZhbHVlICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdFx0cHJvcFZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dmFsdWUgPSBmbi5jYWxsKHRoaXMsIHZhbHVlKSB8fCB2YWx1ZTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldE9iamVjdCAobm9kZSwgcHJvcCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gdGhpc1snX18nICsgcHJvcF07XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzWydfXycgKyBwcm9wXSA9IHZhbHVlO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldFByb3BlcnRpZXMgKG5vZGUpIHtcblx0bGV0IHByb3BzID0gbm9kZS5wcm9wcyB8fCBub2RlLnByb3BlcnRpZXM7XG5cdGlmIChwcm9wcykge1xuXHRcdHByb3BzLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdGlmIChwcm9wID09PSAnZGlzYWJsZWQnKSB7XG5cdFx0XHRcdHNldEJvb2xlYW4obm9kZSwgcHJvcCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0c2V0UHJvcGVydHkobm9kZSwgcHJvcCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2V0Qm9vbGVhbnMgKG5vZGUpIHtcblx0bGV0IHByb3BzID0gbm9kZS5ib29scyB8fCBub2RlLmJvb2xlYW5zO1xuXHRpZiAocHJvcHMpIHtcblx0XHRwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRzZXRCb29sZWFuKG5vZGUsIHByb3ApO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNldE9iamVjdHMgKG5vZGUpIHtcblx0bGV0IHByb3BzID0gbm9kZS5vYmplY3RzO1xuXHRpZiAocHJvcHMpIHtcblx0XHRwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRzZXRPYmplY3Qobm9kZSwgcHJvcCk7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY2FwIChuYW1lKSB7XG5cdHJldHVybiBuYW1lLnN1YnN0cmluZygwLDEpLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcbn1cblxuZnVuY3Rpb24gb25pZnkgKG5hbWUpIHtcblx0cmV0dXJuICdvbicgKyBuYW1lLnNwbGl0KCctJykubWFwKHdvcmQgPT4gY2FwKHdvcmQpKS5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gaXNCb29sIChub2RlLCBuYW1lKSB7XG5cdHJldHVybiAobm9kZS5ib29scyB8fCBub2RlLmJvb2xlYW5zIHx8IFtdKS5pbmRleE9mKG5hbWUpID4gLTE7XG59XG5cbmZ1bmN0aW9uIGJvb2xOb3JtICh2YWx1ZSkge1xuXHRpZih2YWx1ZSA9PT0gJycpe1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdHJldHVybiBub3JtYWxpemUodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBwcm9wTm9ybSAodmFsdWUpIHtcblx0cmV0dXJuIG5vcm1hbGl6ZSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZSh2YWwpIHtcblx0aWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG5cdFx0dmFsID0gdmFsLnRyaW0oKTtcblx0XHRpZiAodmFsID09PSAnZmFsc2UnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSBlbHNlIGlmICh2YWwgPT09ICdudWxsJykge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSBlbHNlIGlmICh2YWwgPT09ICd0cnVlJykge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdC8vIGZpbmRzIHN0cmluZ3MgdGhhdCBzdGFydCB3aXRoIG51bWJlcnMsIGJ1dCBhcmUgbm90IG51bWJlcnM6XG5cdFx0Ly8gJzF0ZWFtJyAnMTIzIFN0cmVldCcsICcxLTItMycsIGV0Y1xuXHRcdGlmICgoJycgKyB2YWwpLnJlcGxhY2UoLy0/XFxkKlxcLj9cXGQqLywgJycpLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIHZhbDtcblx0XHR9XG5cdH1cblx0aWYgKCFpc05hTihwYXJzZUZsb2F0KHZhbCkpKSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodmFsKTtcblx0fVxuXHRyZXR1cm4gdmFsO1xufVxuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG5cdG5hbWU6ICdwcm9wZXJ0aWVzJyxcblx0b3JkZXI6IDEwLFxuXHRpbml0OiBmdW5jdGlvbiAobm9kZSkge1xuXHRcdHNldFByb3BlcnRpZXMobm9kZSk7XG5cdFx0c2V0Qm9vbGVhbnMobm9kZSk7XG5cdH0sXG5cdHByZUF0dHJpYnV0ZUNoYW5nZWQ6IGZ1bmN0aW9uIChub2RlLCBuYW1lLCB2YWx1ZSkge1xuXHRcdGlmIChub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRpZihpc0Jvb2wobm9kZSwgbmFtZSkpe1xuXHRcdFx0dmFsdWUgPSBib29sTm9ybSh2YWx1ZSk7XG5cdFx0XHRub2RlW25hbWVdID0gISF2YWx1ZTtcblx0XHRcdGlmKCF2YWx1ZSl7XG5cdFx0XHRcdG5vZGVbbmFtZV0gPSBmYWxzZTtcblx0XHRcdFx0bm9kZS5pc1NldHRpbmdBdHRyaWJ1dGUgPSB0cnVlO1xuXHRcdFx0XHRub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcblx0XHRcdFx0bm9kZS5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG5vZGVbbmFtZV0gPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdG5vZGVbbmFtZV0gPSBwcm9wTm9ybSh2YWx1ZSk7XG5cdH1cbn0pOyIsImNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCcuL0Jhc2VDb21wb25lbnQnKTtcblxuZnVuY3Rpb24gYXNzaWduUmVmcyAobm9kZSkge1xuXG4gICAgWy4uLm5vZGUucXVlcnlTZWxlY3RvckFsbCgnW3JlZl0nKV0uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgbGV0IG5hbWUgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ3JlZicpO1xuXHRcdGNoaWxkLnJlbW92ZUF0dHJpYnV0ZSgncmVmJyk7XG4gICAgICAgIG5vZGVbbmFtZV0gPSBjaGlsZDtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYXNzaWduRXZlbnRzIChub2RlKSB7XG4gICAgLy8gPGRpdiBvbj1cImNsaWNrOm9uQ2xpY2tcIj5cblx0Wy4uLm5vZGUucXVlcnlTZWxlY3RvckFsbCgnW29uXScpXS5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCwgaSwgY2hpbGRyZW4pIHtcblx0XHRpZihjaGlsZCA9PT0gbm9kZSl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGxldFxuICAgICAgICAgICAga2V5VmFsdWUgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ29uJyksXG4gICAgICAgICAgICBldmVudCA9IGtleVZhbHVlLnNwbGl0KCc6JylbMF0udHJpbSgpLFxuICAgICAgICAgICAgbWV0aG9kID0ga2V5VmFsdWUuc3BsaXQoJzonKVsxXS50cmltKCk7XG5cdFx0Ly8gcmVtb3ZlLCBzbyBwYXJlbnQgZG9lcyBub3QgdHJ5IHRvIHVzZSBpdFxuXHRcdGNoaWxkLnJlbW92ZUF0dHJpYnV0ZSgnb24nKTtcblxuICAgICAgICBub2RlLm9uKGNoaWxkLCBldmVudCwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIG5vZGVbbWV0aG9kXShlKVxuICAgICAgICB9KVxuICAgIH0pO1xufVxuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ3JlZnMnLFxuICAgIG9yZGVyOiAzMCxcbiAgICBwcmVDb25uZWN0ZWQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGFzc2lnblJlZnMobm9kZSk7XG4gICAgICAgIGFzc2lnbkV2ZW50cyhub2RlKTtcbiAgICB9XG59KTsiLCJjb25zdCBCYXNlQ29tcG9uZW50ICA9IHJlcXVpcmUoJy4vQmFzZUNvbXBvbmVudCcpO1xuXG5jb25zdCBsaWdodE5vZGVzID0ge307XG5jb25zdCBpbnNlcnRlZCA9IHt9O1xuXG5mdW5jdGlvbiBpbnNlcnQgKG5vZGUpIHtcbiAgICBpZihpbnNlcnRlZFtub2RlLl91aWRdIHx8ICFoYXNUZW1wbGF0ZShub2RlKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29sbGVjdExpZ2h0Tm9kZXMobm9kZSk7XG4gICAgaW5zZXJ0VGVtcGxhdGUobm9kZSk7XG4gICAgaW5zZXJ0ZWRbbm9kZS5fdWlkXSA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RMaWdodE5vZGVzKG5vZGUpe1xuICAgIGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSB8fCBbXTtcbiAgICB3aGlsZShub2RlLmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgbGlnaHROb2Rlc1tub2RlLl91aWRdLnB1c2gobm9kZS5yZW1vdmVDaGlsZChub2RlLmNoaWxkTm9kZXNbMF0pKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlIChub2RlKSB7XG5cdHJldHVybiBub2RlLnRlbXBsYXRlU3RyaW5nIHx8IG5vZGUudGVtcGxhdGVJZDtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGVDaGFpbiAobm9kZSkge1xuICAgIGNvbnN0IHRlbXBsYXRlcyA9IG5vZGUuZ2V0VGVtcGxhdGVDaGFpbigpO1xuICAgIHRlbXBsYXRlcy5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbiAodGVtcGxhdGUpIHtcbiAgICAgICAgZ2V0Q29udGFpbmVyKG5vZGUpLmFwcGVuZENoaWxkKEJhc2VDb21wb25lbnQuY2xvbmUodGVtcGxhdGUpKTtcbiAgICB9KTtcbiAgICBpbnNlcnRDaGlsZHJlbihub2RlKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGUgKG5vZGUpIHtcbiAgICBpZihub2RlLm5lc3RlZFRlbXBsYXRlKXtcbiAgICAgICAgaW5zZXJ0VGVtcGxhdGVDaGFpbihub2RlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZU5vZGUgPSBub2RlLmdldFRlbXBsYXRlTm9kZSgpO1xuXG4gICAgaWYodGVtcGxhdGVOb2RlKSB7XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoQmFzZUNvbXBvbmVudC5jbG9uZSh0ZW1wbGF0ZU5vZGUpKTtcbiAgICB9XG4gICAgaW5zZXJ0Q2hpbGRyZW4obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGdldENvbnRhaW5lciAobm9kZSkge1xuICAgIGNvbnN0IGNvbnRhaW5lcnMgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tyZWY9XCJjb250YWluZXJcIl0nKTtcbiAgICBpZighY29udGFpbmVycyB8fCAhY29udGFpbmVycy5sZW5ndGgpe1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcnNbY29udGFpbmVycy5sZW5ndGggLSAxXTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Q2hpbGRyZW4gKG5vZGUpIHtcbiAgICBsZXQgaTtcblx0Y29uc3QgY29udGFpbmVyID0gZ2V0Q29udGFpbmVyKG5vZGUpO1xuXHRjb25zdCBjaGlsZHJlbiA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXTtcblxuICAgIGlmKGNvbnRhaW5lciAmJiBjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpe1xuICAgICAgICBmb3IoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY2hpbGRyZW5baV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b0RvbSAoaHRtbCl7XG5cdGNvbnN0IG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0bm9kZS5pbm5lckhUTUwgPSBodG1sO1xuXHRyZXR1cm4gbm9kZS5maXJzdENoaWxkO1xufVxuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRMaWdodE5vZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBsaWdodE5vZGVzW3RoaXMuX3VpZF07XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZU5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY2FjaGluZyBjYXVzZXMgZGlmZmVyZW50IGNsYXNzZXMgdG8gcHVsbCB0aGUgc2FtZSB0ZW1wbGF0ZSAtIHdhdD9cbiAgICAvL2lmKCF0aGlzLnRlbXBsYXRlTm9kZSkge1xuXHRpZiAodGhpcy50ZW1wbGF0ZUlkKSB7XG5cdFx0dGhpcy50ZW1wbGF0ZU5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLnRlbXBsYXRlSWQucmVwbGFjZSgnIycsJycpKTtcblx0fVxuXHRlbHNlIGlmICh0aGlzLnRlbXBsYXRlU3RyaW5nKSB7XG5cdFx0dGhpcy50ZW1wbGF0ZU5vZGUgPSB0b0RvbSgnPHRlbXBsYXRlPicgKyB0aGlzLnRlbXBsYXRlU3RyaW5nICsgJzwvdGVtcGxhdGU+Jyk7XG5cdH1cbiAgICAvL31cbiAgICByZXR1cm4gdGhpcy50ZW1wbGF0ZU5vZGU7XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZUNoYWluID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0XG4gICAgICAgIGNvbnRleHQgPSB0aGlzLFxuICAgICAgICB0ZW1wbGF0ZXMgPSBbXSxcbiAgICAgICAgdGVtcGxhdGU7XG5cbiAgICAvLyB3YWxrIHRoZSBwcm90b3R5cGUgY2hhaW47IEJhYmVsIGRvZXNuJ3QgYWxsb3cgdXNpbmdcbiAgICAvLyBgc3VwZXJgIHNpbmNlIHdlIGFyZSBvdXRzaWRlIG9mIHRoZSBDbGFzc1xuICAgIHdoaWxlKGNvbnRleHQpe1xuICAgICAgICBjb250ZXh0ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbnRleHQpO1xuICAgICAgICBpZighY29udGV4dCl7IGJyZWFrOyB9XG4gICAgICAgIC8vIHNraXAgcHJvdG90eXBlcyB3aXRob3V0IGEgdGVtcGxhdGVcbiAgICAgICAgLy8gKGVsc2UgaXQgd2lsbCBwdWxsIGFuIGluaGVyaXRlZCB0ZW1wbGF0ZSBhbmQgY2F1c2UgZHVwbGljYXRlcylcbiAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eSgndGVtcGxhdGVTdHJpbmcnKSB8fCBjb250ZXh0Lmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZUlkJykpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gY29udGV4dC5nZXRUZW1wbGF0ZU5vZGUoKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGVtcGxhdGVzO1xufTtcblxuQmFzZUNvbXBvbmVudC5hZGRQbHVnaW4oe1xuICAgIG5hbWU6ICd0ZW1wbGF0ZScsXG4gICAgb3JkZXI6IDIwLFxuICAgIHByZUNvbm5lY3RlZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaW5zZXJ0KG5vZGUpO1xuICAgIH1cbn0pOyIsIndpbmRvd1snbm8tbmF0aXZlLXNoaW0nXSA9IHRydWU7XG5yZXF1aXJlKCdAY2x1YmFqYXgvY3VzdG9tLWVsZW1lbnRzLXBvbHlmaWxsJyk7XG53aW5kb3cub24gPSByZXF1aXJlKCdAY2x1YmFqYXgvb24nKTtcbndpbmRvdy5kb20gPSByZXF1aXJlKCdAY2x1YmFqYXgvZG9tJyk7XG5cbiIsImNvbnN0IEJhc2VDb21wb25lbnQgID0gcmVxdWlyZSgnLi4vLi4vc3JjL0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IHByb3BlcnRpZXMgPSByZXF1aXJlKCcuLi8uLi9zcmMvcHJvcGVydGllcycpO1xuY29uc3QgdGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi9zcmMvdGVtcGxhdGUnKTtcbmNvbnN0IHJlZnMgPSByZXF1aXJlKCcuLi8uLi9zcmMvcmVmcycpO1xuY29uc3QgaXRlbVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vLi4vc3JjL2l0ZW0tdGVtcGxhdGUnKTtcbndpbmRvdy5yYW5kID0gcmVxdWlyZSgncmFuZG9taXplcicpO1xuXG5jbGFzcyBUZXN0UHJvcHMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG5cdFx0c3VwZXIoKTtcblx0XHQvLyB0aGlzLmNvbm5lY3RlZFByb3BzID0gdHJ1ZTtcblx0fVxuXG4gICAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7IHJldHVybiBbJ21pbicsICdtYXgnLCAnZm9vJywgJ2JhcicsICduYmMnLCAnY2JzJywgJ2Rpc2FibGVkJywgJ3JlYWRvbmx5JywgJ3RhYmluZGV4JywgJ215LWNvbXBsZXgtcHJvcCddOyB9XG4gICAgZ2V0IHByb3BzICgpIHsgcmV0dXJuIFsnZm9vJywgJ2JhcicsICd0YWJpbmRleCcsICdtaW4nLCAnbWF4JywgJ215LWNvbXBsZXgtcHJvcCddOyB9XG4gICAgZ2V0IGJvb2xzICgpIHsgcmV0dXJuIFsnbmJjJywgJ2NicycsICdkaXNhYmxlZCcsICdyZWFkb25seSddOyB9XG5cbiAgICBvbkZvbyAoKSB7XG5cdFx0b24uZmlyZShkb2N1bWVudCwgJ2Zvby1jYWxsZWQnKTtcblx0fVxuXG5cdG9uTmJjICgpIHtcblx0XHRvbi5maXJlKGRvY3VtZW50LCAnbmJjLWNhbGxlZCcpO1xuXHR9XG5cbiAgICBhdHRyaWJ1dGVDaGFuZ2VkIChuYW1lLCB2YWx1ZSkge1xuICAgICAgICB0aGlzW25hbWUgKyAnLWNoYW5nZWQnXSA9IGRvbS5ub3JtYWxpemUodmFsdWUpIHx8IHZhbHVlICE9PSBudWxsO1xuXHR9XG59XG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3Rlc3QtcHJvcHMnLCBUZXN0UHJvcHMpO1xuXG5cbmNsYXNzIFRlc3ROZXdQcm9wcyBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKC4uLmFyZ3MpIHtcblx0XHRzdXBlcigpO1xuXHRcdGNvbnNvbGUubG9nKCdORVchJyk7XG5cdFx0Ly90aGlzLnNldFByb3BzKFsnZm9vJ10pO1xuXHR9XG5cblx0Z2V0UHJvcHMgKCkge1xuXHRcdHJldHVybiBbJ2ZvbyddXG5cdH1cblxuXHQvLyBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHtcblx0Ly8gXHRkZWJ1Z2dlclxuXHQvLyBcdHJldHVybiBbJ25iYyddXG5cdC8vIH1cblxuXHRhdHRyaWJ1dGVDaGFuZ2VkIChuYW1lLCB2YWx1ZSkge1xuXHRcdGNvbnNvbGUubG9nKCcgLS0tLSBjaGFuZ2UnLCBuYW1lLCB2YWx1ZSk7XG5cdH1cbn1cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndGVzdC1uZXctcHJvcHMnLCBUZXN0TmV3UHJvcHMpO1xud2luZG93LlRlc3ROZXdQcm9wcyA9IFRlc3ROZXdQcm9wcztcblxuY2xhc3MgVGVzdExpZmVjeWNsZSBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXG4gICAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7cmV0dXJuIFsnZm9vJywgJ2JhciddOyB9XG5cbiAgICBzZXQgZm9vICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9fZm9vID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IGZvbyAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9fZm9vO1xuICAgIH1cblxuICAgIHNldCBiYXIgKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX19iYXIgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgYmFyICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX19iYXIgfHwgJ05PVFNFVCc7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IoLi4uYXJncykge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cblxuICAgIGNvbm5lY3RlZCAoKSB7XG4gICAgICAgIG9uLmZpcmUoZG9jdW1lbnQsICdjb25uZWN0ZWQtY2FsbGVkJywgdGhpcyk7XG4gICAgfVxuXG4gICAgZG9tUmVhZHkgKCkge1xuICAgICAgICBvbi5maXJlKGRvY3VtZW50LCAnZG9tcmVhZHktY2FsbGVkJywgdGhpcyk7XG4gICAgfVxuXG4gICAgZGlzY29ubmVjdGVkICgpIHtcbiAgICAgICAgb24uZmlyZShkb2N1bWVudCwgJ2Rpc2Nvbm5lY3RlZC1jYWxsZWQnLCB0aGlzKTtcbiAgICB9XG5cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd0ZXN0LWxpZmVjeWNsZScsIFRlc3RMaWZlY3ljbGUpO1xuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgaW5pdDogZnVuY3Rpb24gKG5vZGUsIGEsIGIsIGMpIHtcbiAgICAgICAgb24uZmlyZShkb2N1bWVudCwgJ2luaXQtY2FsbGVkJyk7XG4gICAgfSxcbiAgICBwcmVDb25uZWN0ZWQ6IGZ1bmN0aW9uIChub2RlLCBhLCBiLCBjKSB7XG4gICAgICAgIG9uLmZpcmUoZG9jdW1lbnQsICdwcmVDb25uZWN0ZWQtY2FsbGVkJyk7XG4gICAgfSxcbiAgICBwb3N0Q29ubmVjdGVkOiBmdW5jdGlvbiAobm9kZSwgYSwgYiwgYykge1xuICAgICAgICBvbi5maXJlKGRvY3VtZW50LCAncG9zdENvbm5lY3RlZC1jYWxsZWQnKTtcbiAgICB9LFxuICAgIHByZURvbVJlYWR5OiBmdW5jdGlvbiAobm9kZSwgYSwgYiwgYykge1xuICAgICAgICBvbi5maXJlKGRvY3VtZW50LCAncHJlRG9tUmVhZHktY2FsbGVkJyk7XG4gICAgfSxcbiAgICBwb3N0RG9tUmVhZHk6IGZ1bmN0aW9uIChub2RlLCBhLCBiLCBjKSB7XG4gICAgICAgIG9uLmZpcmUoZG9jdW1lbnQsICdwb3N0RG9tUmVhZHktY2FsbGVkJyk7XG4gICAgfVxufSk7XG5cblxuY2xhc3MgVGVzdFRtcGxTdHJpbmcgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcbiAgICBnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuICAgICAgICByZXR1cm4gYDxkaXY+VGhpcyBpcyBhIHNpbXBsZSB0ZW1wbGF0ZTwvZGl2PmA7XG4gICAgfVxufVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd0ZXN0LXRtcGwtc3RyaW5nJywgVGVzdFRtcGxTdHJpbmcpO1xuXG5jbGFzcyBUZXN0VG1wbElkIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG4gICAgZ2V0IHRlbXBsYXRlSWQgKCkge1xuICAgICAgICByZXR1cm4gJ3Rlc3QtdG1wbC1pZC10ZW1wbGF0ZSc7XG4gICAgfVxufVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd0ZXN0LXRtcGwtaWQnLCBUZXN0VG1wbElkKTtcblxuXG5jbGFzcyBUZXN0VG1wbFJlZnMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcbiAgICBnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuICAgICAgICByZXR1cm4gYDxkaXYgb249XCJjbGljazpvbkNsaWNrXCIgcmVmPVwiY2xpY2tOb2RlXCI+XG4gICAgICAgICAgICA8bGFiZWwgcmVmPVwibGFiZWxOb2RlXCI+bGFiZWw6PC9sYWJlbD5cbiAgICAgICAgICAgIDxzcGFuIHJlZj1cInZhbHVlTm9kZVwiPnZhbHVlPC9zcGFuPlxuICAgICAgICA8L2Rpdj5gO1xuICAgIH1cblxuICAgIG9uQ2xpY2sgKCkge1xuICAgICAgICBvbi5maXJlKGRvY3VtZW50LCAncmVmLWNsaWNrLWNhbGxlZCcpO1xuICAgIH1cbn1cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndGVzdC10bXBsLXJlZnMnLCBUZXN0VG1wbFJlZnMpO1xuXG5cbmNsYXNzIENoaWxkQnV0dG9uIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cdGdldCB0ZW1wbGF0ZVN0cmluZyAoKSB7XG5cdFx0cmV0dXJuIGA8YnV0dG9uIHJlZj1cImJ0bk5vZGVcIiBvbj1cImNsaWNrOm9uQ2xpY2tcIj5DbGljayBNZTwvYnV0dG9uPmA7XG5cdH1cblxuXHRvbkNsaWNrICgpIHtcblx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIHt2YWx1ZTogdGhpcy5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJyl9KTtcblx0fVxuXG59XG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2NoaWxkLWJ1dHRvbicsIENoaWxkQnV0dG9uKTtcblxuY2xhc3MgVGVzdFRtcGxDbXB0UmVmcyBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgPGRpdj5cblx0XHRcdDxjaGlsZC1idXR0b24gb249XCJjaGFuZ2U6b25DaGFuZ2VcIiB2YWx1ZT1cIkFcIiA+PC9jaGlsZC1idXR0b24+XG5cdFx0XHQ8Y2hpbGQtYnV0dG9uIG9uPVwiY2hhbmdlOm9uQ2hhbmdlXCIgdmFsdWU9XCJCXCIgPjwvY2hpbGQtYnV0dG9uPlxuXHRcdFx0PGNoaWxkLWJ1dHRvbiBvbj1cImNoYW5nZTpvbkNoYW5nZVwiIHZhbHVlPVwiQ1wiID48L2NoaWxkLWJ1dHRvbj5cbiAgICAgICAgPC9kaXY+YDtcblx0fVxuXG5cdG9uQ2hhbmdlIChlKSB7XG5cdFx0b24uZmlyZShkb2N1bWVudCwgJ3JlZi1jaGFuZ2UtY2FsbGVkJywge3ZhbHVlOmUudmFsdWV9KTtcblx0fVxufVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd0ZXN0LXRtcGwtY21wdC1yZWZzJywgVGVzdFRtcGxDbXB0UmVmcyk7XG5cbmNsYXNzIFRlc3RUbXBsQ29udGFpbmVyIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG4gICAgZ2V0IHRlbXBsYXRlU3RyaW5nICgpIHtcbiAgICAgICAgcmV0dXJuIGA8ZGl2PlxuICAgICAgICAgICAgPGxhYmVsIHJlZj1cImxhYmVsTm9kZVwiPmxhYmVsOjwvbGFiZWw+XG4gICAgICAgICAgICA8c3BhbiByZWY9XCJ2YWx1ZU5vZGVcIj52YWx1ZTwvc3Bhbj5cbiAgICAgICAgICAgIDxkaXYgcmVmPVwiY29udGFpbmVyXCI+PC9kaXY+XG4gICAgICAgIDwvZGl2PmA7XG4gICAgfVxufVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd0ZXN0LXRtcGwtY29udGFpbmVyJywgVGVzdFRtcGxDb250YWluZXIpO1xuXG5cbi8vIHNpbXBsZSBuZXN0ZWQgdGVtcGxhdGVzXG5jbGFzcyBUZXN0VG1wbE5lc3RlZEEgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMubmVzdGVkVGVtcGxhdGUgPSB0cnVlO1xuICAgIH1cblxuICAgIGdldCB0ZW1wbGF0ZVN0cmluZyAoKSB7XG4gICAgICAgIHJldHVybiBgPHNlY3Rpb24+XG4gICAgICAgICAgICA8ZGl2PmNvbnRlbnQgQSBiZWZvcmU8L2Rpdj5cbiAgICAgICAgICAgIDxzZWN0aW9uIHJlZj1cImNvbnRhaW5lclwiPjwvc2VjdGlvbj5cbiAgICAgICAgICAgIDxkaXY+Y29udGVudCBBIGFmdGVyPC9kaXY+XG4gICAgICAgIDwvc2VjdGlvbj5gO1xuICAgIH1cbn1cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndGVzdC10bXBsLW5lc3RlZC1hJywgVGVzdFRtcGxOZXN0ZWRBKTtcblxuY2xhc3MgVGVzdFRtcGxOZXN0ZWRCIGV4dGVuZHMgVGVzdFRtcGxOZXN0ZWRBIHtcbiAgICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuICAgIGdldCB0ZW1wbGF0ZVN0cmluZyAoKSB7XG4gICAgICAgIHJldHVybiBgPGRpdj5jb250ZW50IEI8L2Rpdj5gO1xuICAgIH1cbn1cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndGVzdC10bXBsLW5lc3RlZC1iJywgVGVzdFRtcGxOZXN0ZWRCKTtcblxuXG4vLyBuZXN0ZWQgcGx1cyBsaWdodCBkb21cbmNsYXNzIFRlc3RUbXBsTmVzdGVkQyBleHRlbmRzIFRlc3RUbXBsTmVzdGVkQSB7XG4gICAgY29uc3RydWN0b3IgKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cbiAgICBnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuICAgICAgICByZXR1cm4gYDxzZWN0aW9uPlxuICAgICAgICAgICAgPGRpdj5jb250ZW50IEMgYmVmb3JlPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IHJlZj1cImNvbnRhaW5lclwiPjwvZGl2PlxuICAgICAgICAgICAgPGRpdj5jb250ZW50IEMgYWZ0ZXI8L2Rpdj5cbiAgICAgICAgPC9zZWN0aW9uPmA7XG4gICAgfVxufVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd0ZXN0LXRtcGwtbmVzdGVkLWMnLCBUZXN0VG1wbE5lc3RlZEMpO1xuXG5cbi8vIDUtZGVlcCBuZXN0ZWQgdGVtcGxhdGVzXG5jbGFzcyBUZXN0QSBleHRlbmRzIEJhc2VDb21wb25lbnQge31cbmNsYXNzIFRlc3RCIGV4dGVuZHMgVGVzdEEge1xuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG4gICAgZ2V0IHRlbXBsYXRlU3RyaW5nICgpIHtcbiAgICAgICAgcmV0dXJuIGA8c2VjdGlvbj5cbiAgICAgICAgICAgIDxkaXY+Y29udGVudCBCIGJlZm9yZTwvZGl2PlxuICAgICAgICAgICAgPHNlY3Rpb24gcmVmPVwiY29udGFpbmVyXCI+PC9zZWN0aW9uPlxuICAgICAgICAgICAgPGRpdj5jb250ZW50IEIgYWZ0ZXI8L2Rpdj5cbiAgICAgICAgPC9zZWN0aW9uPmA7XG4gICAgfVxufVxuY2xhc3MgVGVzdEMgZXh0ZW5kcyBUZXN0QiB7fVxuY2xhc3MgVGVzdEQgZXh0ZW5kcyBUZXN0QyB7XG4gICAgY29uc3RydWN0b3IgKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cbiAgICBnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuICAgICAgICByZXR1cm4gYDxkaXY+Y29udGVudCBEPC9kaXY+YDtcbiAgICB9XG59XG5jbGFzcyBUZXN0RSBleHRlbmRzIFRlc3REIHtcbiAgICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMubmVzdGVkVGVtcGxhdGUgPSB0cnVlO1xuICAgIH1cbn1cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndGVzdC1hJywgVGVzdEEpO1xuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd0ZXN0LWInLCBUZXN0Qik7XG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3Rlc3QtYycsIFRlc3RDKTtcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndGVzdC1kJywgVGVzdEQpO1xuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd0ZXN0LWUnLCBUZXN0RSk7XG5cbmNsYXNzIFRlc3RMaXN0IGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFsnbGlzdC10aXRsZSddOyB9XG4gICAgZ2V0IHByb3BzICgpIHsgcmV0dXJuIFsnbGlzdC10aXRsZSddOyB9XG5cbiAgICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuXG4gICAgZ2V0IHRlbXBsYXRlU3RyaW5nICgpIHtcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0aXRsZVwiIHJlZj1cInRpdGxlTm9kZVwiPjwvZGl2PlxuICAgICAgICAgICAgPGRpdiByZWY9XCJjb250YWluZXJcIj48L2Rpdj5gO1xuICAgIH1cbiAgICBcbiAgICBzZXQgZGF0YSAoaXRlbXMpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJMaXN0KGl0ZW1zLCB0aGlzLmNvbnRhaW5lcik7XG4gICAgfVxuXG4gICAgZG9tUmVhZHkgKCkge1xuICAgICAgICB0aGlzLnRpdGxlTm9kZS5pbm5lckhUTUwgPSB0aGlzWydsaXN0LXRpdGxlJ107XG4gICAgfVxufVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd0ZXN0LWxpc3QnLCBUZXN0TGlzdCk7XG5cbmNsYXNzIFRlc3RMaXN0Q29tcG9uZW50IGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7IHJldHVybiBbJ2l0ZW0tdGFnJ107IH1cblx0Z2V0IHByb3BzICgpIHsgcmV0dXJuIFsnaXRlbS10YWcnXTsgfVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHR9XG5cblx0c2V0IGRhdGEgKGl0ZW1zKSB7XG5cdFx0dGhpcy5pdGVtcyA9IGl0ZW1zO1xuXHRcdHRoaXMub25Db25uZWN0ZWQodGhpcy5yZW5kZXJJdGVtcy5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHJlbmRlckl0ZW1zICgpIHtcblx0XHRjb25zdCBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXHRcdGNvbnN0IHRhZyA9IHRoaXNbJ2l0ZW0tdGFnJ107XG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0dGhpcy5pdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG5cdFx0XHRjb25zdCBub2RlID0gZG9tKHRhZywge30sIGZyYWcpO1xuXHRcdFx0bm9kZS5kYXRhID0gaXRlbTtcblx0XHR9KTtcblx0XHR0aGlzLm9uRG9tUmVhZHkoKCkgPT4ge1xuXHRcdFx0dGhpcy5hcHBlbmRDaGlsZChmcmFnKTtcblx0XHR9KTtcblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblxuXHR9XG59XG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3Rlc3QtbGlzdC1jb21wb25lbnQnLCBUZXN0TGlzdENvbXBvbmVudCk7XG5cbi8vIGFkZHJlc3MxOlwiNjQ0MVwiXG4vLyBhZGRyZXNzMjpcIkFsZXhhbmRlciBXYXlcIlxuLy8gYmlydGhkYXk6XCIwMS8xNC8yMDE4XCJcbi8vIGNpdHk6XCJEdXJoYW1cIlxuLy8gY29tcGFueTpcIkNyYWlnc2xpc3RcIlxuLy8gZW1haWw6XCJqY3VydGlzQGNyYWlnc2xpc3QuY29tXCJcbi8vIGZpcnN0TmFtZTpcIkpvcmRhblwiXG4vLyBsYXN0TmFtZTpcIkN1cnRpc1wiXG4vLyBwaG9uZTpcIjcwNC03NTAtNDMxNlwiXG4vLyBzc246XCIzNjEtMTctNjM0NFwiXG4vLyBzdGF0ZTpcIk5vcnRoIENhcm9saW5hXCJcbi8vIHppcGNvZGU6XCI4NjMxMFwiXG5cblxuY2xhc3MgVGVzdExpc3RDb21wb25lbnRJdGVtIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7IHJldHVybiBbJ2xpc3QtdGl0bGUnXTsgfVxuXHRnZXQgcHJvcHMgKCkgeyByZXR1cm4gWydsaXN0LXRpdGxlJ107IH1cblxuXHRjb25zdHJ1Y3RvciAoKSB7XG5cdFx0c3VwZXIoKTtcblx0fVxuXG5cdHNldCBkYXRhIChpdGVtKSB7XG5cdFx0dGhpcy5pdGVtID0gaXRlbTtcblx0XHR0aGlzLm9uQ29ubmVjdGVkKHRoaXMucmVuZGVySXRlbS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHJlbmRlckl0ZW0gKCkge1xuXHRcdGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW07XG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0XHRkb20oJ2RpdicsIHtodG1sOltcblx0XHRcdGRvbSgnbGFiZWwnLCB7aHRtbDogJ05hbWU6J30pLFxuXHRcdFx0ZG9tKCdzcGFuJywge2h0bWw6IGl0ZW0uZmlyc3ROYW1lfSksXG5cdFx0XHRkb20oJ3NwYW4nLCB7aHRtbDogaXRlbS5sYXN0TmFtZX0pXG5cdFx0XX0sIHRoaXMpO1xuXG5cdFx0ZG9tKCdkaXYnLCB7aHRtbDpbXG5cdFx0XHRkb20oJ2RpdicsIHtjbGFzczogJ2luZGVudCcsIGh0bWw6W1xuXHRcdFx0XHRkb20oJ2RpdicsIHtodG1sOltcblx0XHRcdFx0XHRkb20oJ2xhYmVsJywge2h0bWw6ICdBZGRyZXNzOid9KSxcblx0XHRcdFx0XHRkb20oJ3NwYW4nLCB7aHRtbDogaXRlbS5hZGRyZXNzMX0pLFxuXHRcdFx0XHRcdGRvbSgnc3BhbicsIHtodG1sOiBpdGVtLmFkZHJlc3MyfSksXG5cdFx0XHRcdFx0ZG9tKCdzcGFuJywge2h0bWw6IGl0ZW0uY2l0eX0pLFxuXHRcdFx0XHRcdGRvbSgnc3BhbicsIHtodG1sOiBpdGVtLnN0YXRlfSksXG5cdFx0XHRcdFx0ZG9tKCdzcGFuJywge2h0bWw6IGl0ZW0uemlwY29kZX0pXG5cdFx0XHRcdF19KSxcblx0XHRcdFx0ZG9tKCdkaXYnLCB7aHRtbDpbXG5cdFx0XHRcdFx0ZG9tKCdsYWJlbCcsIHtodG1sOiAnQ29tcGFueTonfSksXG5cdFx0XHRcdFx0ZG9tKCdzcGFuJywge2h0bWw6IGl0ZW0uY29tcGFueX0pXG5cdFx0XHRcdF19KSxcblx0XHRcdFx0ZG9tKCdkaXYnLCB7aHRtbDpbXG5cdFx0XHRcdFx0ZG9tKCdsYWJlbCcsIHtodG1sOiAnQmlydGhkYXk6J30pLFxuXHRcdFx0XHRcdGRvbSgnc3BhbicsIHtodG1sOiBpdGVtLmJpcnRoZGF5fSlcblx0XHRcdFx0XX0pLFxuXHRcdFx0XHRkb20oJ2RpdicsIHtodG1sOltcblx0XHRcdFx0XHRkb20oJ2xhYmVsJywge2h0bWw6ICdTU046J30pLFxuXHRcdFx0XHRcdGRvbSgnc3BhbicsIHtodG1sOiBpdGVtLnNzbn0pXG5cdFx0XHRcdF19KVxuXHRcdFx0XX0pXG5cdFx0XX0sIHRoaXMpO1xuXHR9XG5cblx0ZG9tUmVhZHkgKCkge1xuXG5cdH1cbn1cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndGVzdC1saXN0LWNvbXBvbmVudC1pdGVtJywgVGVzdExpc3RDb21wb25lbnRJdGVtKTtcblxuY2xhc3MgVGVzdExpc3RDb21wb25lbnRUbXBsIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7IHJldHVybiBbJ2xpc3QtdGl0bGUnXTsgfVxuXHRnZXQgcHJvcHMgKCkgeyByZXR1cm4gWydsaXN0LXRpdGxlJ107IH1cblxuXHRjb25zdHJ1Y3RvciAoKSB7XG5cdFx0c3VwZXIoKTtcblx0fVxuXG5cdGdldCB0ZW1wbGF0ZVN0cmluZyAoKSB7XG5cdFx0cmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICBcdDxsYWJlbD5OYW1lOjwvbGFiZWw+PHNwYW4gcmVmPVwiZmlyc3ROYW1lXCI+PC9zcGFuPjxzcGFuIHJlZj1cImxhc3ROYW1lXCI+PC9zcGFuPlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiaW5kZW50XCI+XG5cdFx0XHRcdDxkaXY+XG5cdFx0XHRcdFx0PGxhYmVsPkFkZHJlc3M6PC9sYWJlbD48c3BhbiByZWY9XCJhZGRyZXNzMVwiPjwvc3Bhbj48c3BhbiByZWY9XCJhZGRyZXNzMlwiPjwvc3Bhbj48c3BhbiByZWY9XCJjaXR5XCI+PC9zcGFuPjxzcGFuIHJlZj1cInN0YXRlXCI+PC9zcGFuPjxzcGFuIHJlZj1cInppcGNvZGVcIj48L3NwYW4+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2PlxuXHRcdFx0XHRcdDxsYWJlbD5Db21wYW55OjwvbGFiZWw+PHNwYW4gcmVmPVwiY29tcGFueVwiPjwvc3Bhbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxkaXY+XG5cdFx0XHRcdFx0PGxhYmVsPkRPQjo8L2xhYmVsPjxzcGFuIHJlZj1cImJpcnRoZGF5XCI+PC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdj5cblx0XHRcdFx0XHQ8bGFiZWw+U1NOOjwvbGFiZWw+PHNwYW4gcmVmPVwic3NuXCI+PC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdGA7XG5cdH1cblxuXHRzZXQgZGF0YSAoaXRlbSkge1xuXHRcdHRoaXMuaXRlbSA9IGl0ZW07XG5cdFx0dGhpcy5vbkNvbm5lY3RlZCh0aGlzLnJlbmRlckl0ZW0uYmluZCh0aGlzKSk7XG5cdH1cblxuXHRyZW5kZXJJdGVtICgpIHtcblx0XHRjb25zdCBpdGVtID0gdGhpcy5pdGVtO1xuXHRcdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRcdE9iamVjdC5rZXlzKGl0ZW0pLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuXHRcdFx0aWYoc2VsZltrZXldKXtcblx0XHRcdFx0bGV0IG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShpdGVtW2tleV0pO1xuXHRcdFx0XHRzZWxmW2tleV0uYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0XHR9XG5cdFx0fSlcblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblxuXHR9XG59XG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3Rlc3QtbGlzdC1jb21wb25lbnQtdG1wbCcsIFRlc3RMaXN0Q29tcG9uZW50VG1wbCk7XG5cbndpbmRvdy5pdGVtVGVtcGxhdGVTdHJpbmcgPSBgPHRlbXBsYXRlPlxuICAgIDxkaXYgaWQ9XCJ7e2lkfX1cIj5cbiAgICAgICAgPHNwYW4+e3tmaXJzdH19PC9zcGFuPlxuICAgICAgICA8c3Bhbj57e2xhc3R9fTwvc3Bhbj5cbiAgICAgICAgPHNwYW4+e3tyb2xlfX08L3NwYW4+XG4gICAgPC9kaXY+XG48L3RlbXBsYXRlPmA7XG5cbndpbmRvdy5pZkF0dHJUZW1wbGF0ZVN0cmluZyA9IGA8dGVtcGxhdGU+XG4gICAgPGRpdiBpZD1cInt7aWR9fVwiPlxuICAgICAgICA8c3Bhbj57e2ZpcnN0fX08L3NwYW4+XG4gICAgICAgIDxzcGFuPnt7bGFzdH19PC9zcGFuPlxuICAgICAgICA8c3Bhbj57e3JvbGV9fTwvc3Bhbj5cbiAgICAgICAgPHNwYW4gaWY9XCJ7e2Ftb3VudH19IDwgMlwiIGNsYXNzPVwiYW1vdW50XCI+e3thbW91bnR9fTwvc3Bhbj5cbiAgICAgICAgPHNwYW4gaWY9XCJ7e3R5cGV9fSA9PT0gJ3NhbmUnXCIgY2xhc3M9XCJzYW5pdHlcIj57e3R5cGV9fTwvc3Bhbj5cbiAgICA8L2Rpdj5cbjwvdGVtcGxhdGU+YDtcblxuZnVuY3Rpb24gZGV2ICgpIHtcbiAgICB2YXIgYWxwaGFiZXQgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnNwbGl0KCcnKTtcbiAgICB2YXIgcyA9ICd7e2Ftb3VudH19ICsge3tudW19fSArIDMnO1xuICAgIHZhciBsaXN0ID0gW3thbW91bnQ6IDEsIG51bTogMn0sIHthbW91bnQ6IDMsIG51bTogNH0sIHthbW91bnQ6IDUsIG51bTogNn1dO1xuICAgIHZhciByID0gL1xce1xce1xcdyp9fS9nO1xuICAgIHZhciBmbiA9IFtdO1xuICAgIHZhciBhcmdzID0gW107XG4gICAgdmFyIGY7XG4gICAgcyA9IHMucmVwbGFjZShyLCBmdW5jdGlvbih3KXtcbiAgICAgICAgY29uc29sZS5sb2coJ3dvcmQnLCB3KTtcbiAgICAgICAgdmFyIHYgPSBhbHBoYWJldC5zaGlmdCgpO1xuICAgICAgICBmbi5wdXNoKHYpO1xuICAgICAgICBhcmdzLnB1c2goL1xcdysvZy5leGVjKHcpWzBdKTtcbiAgICAgICAgcmV0dXJuIHY7XG4gICAgfSk7XG4gICAgZm4ucHVzaChzKTtcblxuICAgIGNvbnNvbGUubG9nKCdmbicsIGZuKTtcbiAgICBjb25zb2xlLmxvZygnYXJncycsIGFyZ3MpO1xuICAgIC8vcyA9ICdyZXR1cm4gJyArIHMgKyAnOyc7XG4gICAgY29uc29sZS5sb2coJ3MnLCBzKTtcblxuICAgIHdpbmRvdy5mID0gbmV3IEZ1bmN0aW9uKHMpO1xuXG4gICAgdmFyIGR5bkZuID0gZnVuY3Rpb24gKGEsYixjLGQsZSxmKSB7XG4gICAgICAgIHZhciByID0gZXZhbChzKTtcbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfTtcblxuICAgIGNvbnNvbGUubG9nKCcgIGY6JywgZHluRm4oMSwyKSk7XG4gICAgLy9cbiAgICBsaXN0LmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgdmFyIGEgPSBhcmdzLm1hcChmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbVthcmddO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHIgPSBkeW5Gbi5hcHBseShudWxsLCBhKTtcbiAgICAgICAgY29uc29sZS5sb2coJ3InLCByKTtcbiAgICB9KTtcblxuXG59XG4vL2RldigpOyIsImNvbnN0IG9uID0gcmVxdWlyZSgnQGNsdWJhamF4L29uJyk7XG5cbmNsYXNzIEJhc2VDb21wb25lbnQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuX3VpZCA9IHVpZCh0aGlzLmxvY2FsTmFtZSk7XG5cdFx0cHJpdmF0ZXNbdGhpcy5fdWlkXSA9IHsgRE9NU1RBVEU6ICdjcmVhdGVkJyB9O1xuXHRcdHByaXZhdGVzW3RoaXMuX3VpZF0uaGFuZGxlTGlzdCA9IFtdO1xuXHRcdHBsdWdpbignaW5pdCcsIHRoaXMpO1xuXHR9XG5cblx0Y29ubmVjdGVkQ2FsbGJhY2sgKCkge1xuXHRcdHByaXZhdGVzW3RoaXMuX3VpZF0uRE9NU1RBVEUgPSBwcml2YXRlc1t0aGlzLl91aWRdLmRvbVJlYWR5RmlyZWQgPyAnZG9tcmVhZHknIDogJ2Nvbm5lY3RlZCc7XG5cdFx0cGx1Z2luKCdwcmVDb25uZWN0ZWQnLCB0aGlzKTtcblx0XHRuZXh0VGljayhvbkNoZWNrRG9tUmVhZHkuYmluZCh0aGlzKSk7XG5cdFx0aWYgKHRoaXMuY29ubmVjdGVkKSB7XG5cdFx0XHR0aGlzLmNvbm5lY3RlZCgpO1xuXHRcdH1cblx0XHR0aGlzLmZpcmUoJ2Nvbm5lY3RlZCcpO1xuXHRcdHBsdWdpbigncG9zdENvbm5lY3RlZCcsIHRoaXMpO1xuXHR9XG5cblx0b25Db25uZWN0ZWQgKGNhbGxiYWNrKSB7XG5cdFx0aWYgKHRoaXMuRE9NU1RBVEUgPT09ICdjb25uZWN0ZWQnIHx8IHRoaXMuRE9NU1RBVEUgPT09ICdkb21yZWFkeScpIHtcblx0XHRcdGNhbGxiYWNrKHRoaXMpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLm9uY2UoJ2Nvbm5lY3RlZCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKHRoaXMpO1xuXHRcdH0pO1xuXHR9XG5cblx0b25Eb21SZWFkeSAoY2FsbGJhY2spIHtcblx0XHRpZiAodGhpcy5ET01TVEFURSA9PT0gJ2RvbXJlYWR5Jykge1xuXHRcdFx0Y2FsbGJhY2sodGhpcyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMub25jZSgnZG9tcmVhZHknLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjayh0aGlzKTtcblx0XHR9KTtcblx0fVxuXG5cdGRpc2Nvbm5lY3RlZENhbGxiYWNrICgpIHtcblx0XHRwcml2YXRlc1t0aGlzLl91aWRdLkRPTVNUQVRFID0gJ2Rpc2Nvbm5lY3RlZCc7XG5cdFx0cGx1Z2luKCdwcmVEaXNjb25uZWN0ZWQnLCB0aGlzKTtcblx0XHRpZiAodGhpcy5kaXNjb25uZWN0ZWQpIHtcblx0XHRcdHRoaXMuZGlzY29ubmVjdGVkKCk7XG5cdFx0fVxuXHRcdHRoaXMuZmlyZSgnZGlzY29ubmVjdGVkJyk7XG5cblx0XHRsZXQgdGltZSwgZG9kID0gQmFzZUNvbXBvbmVudC5kZXN0cm95T25EaXNjb25uZWN0O1xuXHRcdGlmIChkb2QpIHtcblx0XHRcdHRpbWUgPSB0eXBlb2YgZG9kID09PSAnbnVtYmVyJyA/IGRvYyA6IDMwMDtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRpZiAodGhpcy5ET01TVEFURSA9PT0gJ2Rpc2Nvbm5lY3RlZCcpIHtcblx0XHRcdFx0XHR0aGlzLmRlc3Ryb3koKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgdGltZSk7XG5cdFx0fVxuXHR9XG5cblx0YXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrIChhdHRyTmFtZSwgb2xkVmFsLCBuZXdWYWwpIHtcblx0XHRpZiAoIXRoaXMuaXNTZXR0aW5nQXR0cmlidXRlKSB7XG5cdFx0XHRwbHVnaW4oJ3ByZUF0dHJpYnV0ZUNoYW5nZWQnLCB0aGlzLCBhdHRyTmFtZSwgbmV3VmFsLCBvbGRWYWwpO1xuXHRcdFx0aWYgKHRoaXMuYXR0cmlidXRlQ2hhbmdlZCkge1xuXHRcdFx0XHR0aGlzLmF0dHJpYnV0ZUNoYW5nZWQoYXR0ck5hbWUsIG5ld1ZhbCwgb2xkVmFsKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRkZXN0cm95ICgpIHtcblx0XHR0aGlzLmZpcmUoJ2Rlc3Ryb3knKTtcblx0XHRwcml2YXRlc1t0aGlzLl91aWRdLmhhbmRsZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoaGFuZGxlKSB7XG5cdFx0XHRoYW5kbGUucmVtb3ZlKCk7XG5cdFx0fSk7XG5cdFx0ZGVzdHJveSh0aGlzKTtcblx0fVxuXG5cdGZpcmUgKGV2ZW50TmFtZSwgZXZlbnREZXRhaWwsIGJ1YmJsZXMpIHtcblx0XHRyZXR1cm4gb24uZmlyZSh0aGlzLCBldmVudE5hbWUsIGV2ZW50RGV0YWlsLCBidWJibGVzKTtcblx0fVxuXG5cdGVtaXQgKGV2ZW50TmFtZSwgdmFsdWUpIHtcblx0XHRyZXR1cm4gb24uZW1pdCh0aGlzLCBldmVudE5hbWUsIHZhbHVlKTtcblx0fVxuXG5cdG9uIChub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykge1xuXHRcdHJldHVybiB0aGlzLnJlZ2lzdGVySGFuZGxlKFxuXHRcdFx0dHlwZW9mIG5vZGUgIT09ICdzdHJpbmcnID8gLy8gbm8gbm9kZSBpcyBzdXBwbGllZFxuXHRcdFx0XHRvbihub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykgOlxuXHRcdFx0XHRvbih0aGlzLCBub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yKSk7XG5cdH1cblxuXHRvbmNlIChub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykge1xuXHRcdHJldHVybiB0aGlzLnJlZ2lzdGVySGFuZGxlKFxuXHRcdFx0dHlwZW9mIG5vZGUgIT09ICdzdHJpbmcnID8gLy8gbm8gbm9kZSBpcyBzdXBwbGllZFxuXHRcdFx0XHRvbi5vbmNlKG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSA6XG5cdFx0XHRcdG9uLm9uY2UodGhpcywgbm9kZSwgZXZlbnROYW1lLCBzZWxlY3RvciwgY2FsbGJhY2spKTtcblx0fVxuXG5cdGF0dHIgKGtleSwgdmFsdWUsIHRvZ2dsZSkge1xuXHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gdHJ1ZTtcblx0XHRjb25zdCBhZGQgPSB0b2dnbGUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiAhIXRvZ2dsZTtcblx0XHRpZiAoYWRkKSB7XG5cdFx0XHR0aGlzLnNldEF0dHJpYnV0ZShrZXksIHZhbHVlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5yZW1vdmVBdHRyaWJ1dGUoa2V5KTtcblx0XHR9XG5cdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0fVxuXG5cdHJlZ2lzdGVySGFuZGxlIChoYW5kbGUpIHtcblx0XHRwcml2YXRlc1t0aGlzLl91aWRdLmhhbmRsZUxpc3QucHVzaChoYW5kbGUpO1xuXHRcdHJldHVybiBoYW5kbGU7XG5cdH1cblxuXHRnZXQgRE9NU1RBVEUgKCkge1xuXHRcdHJldHVybiBwcml2YXRlc1t0aGlzLl91aWRdLkRPTVNUQVRFO1xuXHR9XG5cblx0c3RhdGljIHNldCBkZXN0cm95T25EaXNjb25uZWN0ICh2YWx1ZSkge1xuXHRcdHByaXZhdGVzWydkZXN0cm95T25EaXNjb25uZWN0J10gPSB2YWx1ZTtcblx0fVxuXG5cdHN0YXRpYyBnZXQgZGVzdHJveU9uRGlzY29ubmVjdCAoKSB7XG5cdFx0cmV0dXJuIHByaXZhdGVzWydkZXN0cm95T25EaXNjb25uZWN0J107XG5cdH1cblxuXHRzdGF0aWMgY2xvbmUgKHRlbXBsYXRlKSB7XG5cdFx0aWYgKHRlbXBsYXRlLmNvbnRlbnQgJiYgdGVtcGxhdGUuY29udGVudC5jaGlsZHJlbikge1xuXHRcdFx0cmV0dXJuIGRvY3VtZW50LmltcG9ydE5vZGUodGVtcGxhdGUuY29udGVudCwgdHJ1ZSk7XG5cdFx0fVxuXHRcdGNvbnN0IGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdFx0Y29uc3QgY2xvbmVOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Y2xvbmVOb2RlLmlubmVySFRNTCA9IHRlbXBsYXRlLmlubmVySFRNTDtcblxuXHRcdHdoaWxlIChjbG9uZU5vZGUuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHRmcmFnLmFwcGVuZENoaWxkKGNsb25lTm9kZS5jaGlsZHJlblswXSk7XG5cdFx0fVxuXHRcdHJldHVybiBmcmFnO1xuXHR9XG5cblx0c3RhdGljIGFkZFBsdWdpbiAocGx1Zykge1xuXHRcdGxldCBpLCBvcmRlciA9IHBsdWcub3JkZXIgfHwgMTAwO1xuXHRcdGlmICghcGx1Z2lucy5sZW5ndGgpIHtcblx0XHRcdHBsdWdpbnMucHVzaChwbHVnKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAocGx1Z2lucy5sZW5ndGggPT09IDEpIHtcblx0XHRcdGlmIChwbHVnaW5zWzBdLm9yZGVyIDw9IG9yZGVyKSB7XG5cdFx0XHRcdHBsdWdpbnMucHVzaChwbHVnKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRwbHVnaW5zLnVuc2hpZnQocGx1Zyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHBsdWdpbnNbMF0ub3JkZXIgPiBvcmRlcikge1xuXHRcdFx0cGx1Z2lucy51bnNoaWZ0KHBsdWcpO1xuXHRcdH1cblx0XHRlbHNlIHtcblxuXHRcdFx0Zm9yIChpID0gMTsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKG9yZGVyID09PSBwbHVnaW5zW2kgLSAxXS5vcmRlciB8fCAob3JkZXIgPiBwbHVnaW5zW2kgLSAxXS5vcmRlciAmJiBvcmRlciA8IHBsdWdpbnNbaV0ub3JkZXIpKSB7XG5cdFx0XHRcdFx0cGx1Z2lucy5zcGxpY2UoaSwgMCwgcGx1Zyk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHQvLyB3YXMgbm90IGluc2VydGVkLi4uXG5cdFx0XHRwbHVnaW5zLnB1c2gocGx1Zyk7XG5cdFx0fVxuXHR9XG59XG5cbmxldFxuXHRwcml2YXRlcyA9IHt9LFxuXHRwbHVnaW5zID0gW107XG5cbmZ1bmN0aW9uIHBsdWdpbiAobWV0aG9kLCBub2RlLCBhLCBiLCBjKSB7XG5cdHBsdWdpbnMuZm9yRWFjaChmdW5jdGlvbiAocGx1Zykge1xuXHRcdGlmIChwbHVnW21ldGhvZF0pIHtcblx0XHRcdHBsdWdbbWV0aG9kXShub2RlLCBhLCBiLCBjKTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBvbkNoZWNrRG9tUmVhZHkgKCkge1xuXHRpZiAodGhpcy5ET01TVEFURSAhPT0gJ2Nvbm5lY3RlZCcgfHwgcHJpdmF0ZXNbdGhpcy5fdWlkXS5kb21SZWFkeUZpcmVkKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0bGV0XG5cdFx0Y291bnQgPSAwLFxuXHRcdGNoaWxkcmVuID0gZ2V0Q2hpbGRDdXN0b21Ob2Rlcyh0aGlzKSxcblx0XHRvdXJEb21SZWFkeSA9IG9uU2VsZkRvbVJlYWR5LmJpbmQodGhpcyk7XG5cblx0ZnVuY3Rpb24gYWRkUmVhZHkgKCkge1xuXHRcdGNvdW50Kys7XG5cdFx0aWYgKGNvdW50ID09PSBjaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdG91ckRvbVJlYWR5KCk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gSWYgbm8gY2hpbGRyZW4sIHdlJ3JlIGdvb2QgLSBsZWFmIG5vZGUuIENvbW1lbmNlIHdpdGggb25Eb21SZWFkeVxuXHQvL1xuXHRpZiAoIWNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdG91ckRvbVJlYWR5KCk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ly8gZWxzZSwgd2FpdCBmb3IgYWxsIGNoaWxkcmVuIHRvIGZpcmUgdGhlaXIgYHJlYWR5YCBldmVudHNcblx0XHQvL1xuXHRcdGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG5cdFx0XHQvLyBjaGVjayBpZiBjaGlsZCBpcyBhbHJlYWR5IHJlYWR5XG5cdFx0XHQvLyBhbHNvIGNoZWNrIGZvciBjb25uZWN0ZWQgLSB0aGlzIGhhbmRsZXMgbW92aW5nIGEgbm9kZSBmcm9tIGFub3RoZXIgbm9kZVxuXHRcdFx0Ly8gTk9QRSwgdGhhdCBmYWlsZWQuIHJlbW92ZWQgZm9yIG5vdyBjaGlsZC5ET01TVEFURSA9PT0gJ2Nvbm5lY3RlZCdcblx0XHRcdGlmIChjaGlsZC5ET01TVEFURSA9PT0gJ2RvbXJlYWR5Jykge1xuXHRcdFx0XHRhZGRSZWFkeSgpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gaWYgbm90LCB3YWl0IGZvciBldmVudFxuXHRcdFx0Y2hpbGQub24oJ2RvbXJlYWR5JywgYWRkUmVhZHkpO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG9uU2VsZkRvbVJlYWR5ICgpIHtcblx0cHJpdmF0ZXNbdGhpcy5fdWlkXS5ET01TVEFURSA9ICdkb21yZWFkeSc7XG5cdC8vIGRvbVJlYWR5IHNob3VsZCBvbmx5IGV2ZXIgZmlyZSBvbmNlXG5cdHByaXZhdGVzW3RoaXMuX3VpZF0uZG9tUmVhZHlGaXJlZCA9IHRydWU7XG5cdHBsdWdpbigncHJlRG9tUmVhZHknLCB0aGlzKTtcblx0Ly8gY2FsbCB0aGlzLmRvbVJlYWR5IGZpcnN0LCBzbyB0aGF0IHRoZSBjb21wb25lbnRcblx0Ly8gY2FuIGZpbmlzaCBpbml0aWFsaXppbmcgYmVmb3JlIGZpcmluZyBhbnlcblx0Ly8gc3Vic2VxdWVudCBldmVudHNcblx0aWYgKHRoaXMuZG9tUmVhZHkpIHtcblx0XHR0aGlzLmRvbVJlYWR5KCk7XG5cdFx0dGhpcy5kb21SZWFkeSA9IGZ1bmN0aW9uICgpIHt9O1xuXHR9XG5cblx0Ly8gYWxsb3cgY29tcG9uZW50IHRvIGZpcmUgdGhpcyBldmVudFxuXHQvLyBkb21SZWFkeSgpIHdpbGwgc3RpbGwgYmUgY2FsbGVkXG5cdGlmICghdGhpcy5maXJlT3duRG9tcmVhZHkpIHtcblx0XHR0aGlzLmZpcmUoJ2RvbXJlYWR5Jyk7XG5cdH1cblxuXHRwbHVnaW4oJ3Bvc3REb21SZWFkeScsIHRoaXMpO1xufVxuXG5mdW5jdGlvbiBnZXRDaGlsZEN1c3RvbU5vZGVzIChub2RlKSB7XG5cdC8vIGNvbGxlY3QgYW55IGNoaWxkcmVuIHRoYXQgYXJlIGN1c3RvbSBub2Rlc1xuXHQvLyB1c2VkIHRvIGNoZWNrIGlmIHRoZWlyIGRvbSBpcyByZWFkeSBiZWZvcmVcblx0Ly8gZGV0ZXJtaW5pbmcgaWYgdGhpcyBpcyByZWFkeVxuXHRsZXQgaSwgbm9kZXMgPSBbXTtcblx0Zm9yIChpID0gMDsgaSA8IG5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRpZiAobm9kZS5jaGlsZHJlbltpXS5ub2RlTmFtZS5pbmRleE9mKCctJykgPiAtMSkge1xuXHRcdFx0bm9kZXMucHVzaChub2RlLmNoaWxkcmVuW2ldKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIG5vZGVzO1xufVxuXG5mdW5jdGlvbiBuZXh0VGljayAoY2IpIHtcblx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNiKTtcbn1cblxuY29uc3QgdWlkcyA9IHt9O1xuZnVuY3Rpb24gdWlkICh0eXBlID0gJ3VpZCcpIHtcblx0aWYgKHVpZHNbdHlwZV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdHVpZHNbdHlwZV0gPSAwO1xuXHR9XG5cdGNvbnN0IGlkID0gdHlwZSArICctJyArICh1aWRzW3R5cGVdICsgMSk7XG5cdHVpZHNbdHlwZV0rKztcblx0cmV0dXJuIGlkO1xufVxuXG5jb25zdCBkZXN0cm95ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbmZ1bmN0aW9uIGRlc3Ryb3kgKG5vZGUpIHtcblx0aWYgKG5vZGUpIHtcblx0XHRkZXN0cm95ZXIuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0ZGVzdHJveWVyLmlubmVySFRNTCA9ICcnO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1ha2VHbG9iYWxMaXN0ZW5lcnMgKG5hbWUsIGV2ZW50TmFtZSkge1xuXHR3aW5kb3dbbmFtZV0gPSBmdW5jdGlvbiAobm9kZU9yTm9kZXMsIGNhbGxiYWNrKSB7XG5cdFx0ZnVuY3Rpb24gaGFuZGxlRG9tUmVhZHkgKG5vZGUsIGNiKSB7XG5cdFx0XHRmdW5jdGlvbiBvblJlYWR5ICgpIHtcblx0XHRcdFx0Y2Iobm9kZSk7XG5cdFx0XHRcdG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIG9uUmVhZHkpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobm9kZS5ET01TVEFURSA9PT0gZXZlbnROYW1lIHx8IG5vZGUuRE9NU1RBVEUgPT09ICdkb21yZWFkeScpIHtcblx0XHRcdFx0Y2Iobm9kZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgb25SZWFkeSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KG5vZGVPck5vZGVzKSkge1xuXHRcdFx0aGFuZGxlRG9tUmVhZHkobm9kZU9yTm9kZXMsIGNhbGxiYWNrKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRsZXQgY291bnQgPSAwO1xuXG5cdFx0ZnVuY3Rpb24gb25BcnJheU5vZGVSZWFkeSAoKSB7XG5cdFx0XHRjb3VudCsrO1xuXHRcdFx0aWYgKGNvdW50ID09PSBub2RlT3JOb2Rlcy5sZW5ndGgpIHtcblx0XHRcdFx0Y2FsbGJhY2sobm9kZU9yTm9kZXMpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZU9yTm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGhhbmRsZURvbVJlYWR5KG5vZGVPck5vZGVzW2ldLCBvbkFycmF5Tm9kZVJlYWR5KTtcblx0XHR9XG5cdH07XG59XG5cbm1ha2VHbG9iYWxMaXN0ZW5lcnMoJ29uRG9tUmVhZHknLCAnZG9tcmVhZHknKTtcbm1ha2VHbG9iYWxMaXN0ZW5lcnMoJ29uQ29ubmVjdGVkJywgJ2Nvbm5lY3RlZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VDb21wb25lbnQ7Il19

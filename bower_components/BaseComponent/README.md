# BaseComponent

A base for more powerful web components

## Description

Use BaseComponent as a way to make developing web components faster and easier.

A good resource to learn about web components is [Google Developers](https://developers.google.com/web/fundamentals/getting-started/primers/customelements)
 
## To Install

    npm install @clubajax/base-component --save
    
You will most likely want to use the polyfill as well (explained below)
    
    npm install @clubajax/custom-elements-polyfill --save
    
You may also use `bower` if you prefer, although build tools like Webpack prefer *node_modules*. 
    
    bower install clubajax/base-component --save
    bower install clubajax/custom-elements-polyfill --save

## Adding to a Project

Import the polyfill, then BaseComponent, then write your code:

```jsx harmony
import '@clubajax/custom-elements-polyfill';
import BaseComponent from '@clubajax/base-component';

class MyWidget extends BaseComponent {
    // your code here
}

customElements.define('my-widget', MyWidget);
```

## Browser and ES Version Support

BaseComponent works out of the box with Chrome.

Using polyfills, this will work in all modern browsers including IE11. It might work in IE10 but it's not tested.

Custom elements use ES6 classes, so that is how this library is written, and how your code should be written.

The built code in */dist* is transpiled into ES5 and will work out of the box, using the 
[custom elements polyfill](https://github.com/clubajax/custom-elements-polyfill), 
which is based on the efforts from the [webcomponents polyfills](https://github.com/webcomponents/custom-elements) 
   
## Docs

Basic element creation and usage:
```jsx harmony
// create
class MyCustom extends BaseComponent {
    get templateString () {
        return `<div>This is MyCustom</div>`;
    }
}
customElements.define('my-custom', MyCustom);

// In your HTML:
<my-custom></my-custom>

// programmatic usage:
var element = document.createElement('my-custom');
```
If using [clubajax/dom](https://github.com/clubajax/dom) you could use shorthand:
```jsx harmony
dom('my-custom', {}, parentNode);
```

## Lifecycle

BaseComponent follows the v1 spec for [lifecycle methods](https://developers.google.com/web/fundamentals/getting-started/primers/customelements#reactions)
 under the hood, and exposes them via shorthand methods:

 * `connectedCallback()` -> `connected()`
 * `disconnectedCallback()` -> `disconnected()`
 * a`ttributeChangedCallback()` -> `attributeChanged()`
 
Note that connected and disconnected (as well as their under-the-hood callers) are not very useful, since they are called
multiple times if the element is added and removed multiple times from the document, as some frameworks tend to do.
Because of this, BaseComponent provides additional lifecycle methods:

 * `domReady()`
 * `destroy()`
 
### domReady

`domReady` is called after the following criteria has been met:
 * Element is attached to the document
 * An asynchronous amount of time has passed to allow for children to be added programmatically
 * The element's children are in a 'domready' state

`domReady` has to be triggered asynchronously because of the following:
```jsx harmony
var element = dom('my-parent', {}, document.body);
var child = dom('my-child', {}, element); 
```

In that scenario, `connected` will be called synchronously before the child has been added. Typically an element needs to
know about its children in order to initialize its structure. This setup can be done in `domReady`, which is called after a 
`requestAnimationFrame`.

`domReady` is guaranteed to only be called once in a custom element's lifecycle.

### destroy

`destroy` is not called automatically, it must be explicitly called. Under the hood, all eventListeners will be 
disconnected. In your code, other cleanup can be done, like destroying child custom elements.

You can set a global static property, `BaseComponent.destroyOnDisconnect`, which will can `destroy` automatically for you
when the element is removed from the document. The reason this optional is because some frameworks remove elements but keep
them in memory to be added again later. `destroyOnDisconnect` will fire `destroy` after a default of 300 ms (or whatever you 
set `destroyOnDisconnect`) to give you time to move elements around.

### Handling Asynchronous lifecycle

Because a majority of setup happens in `domReady`, there needs to be a way to know when the element is done setting up.
Ideally it could be done like this:
```jsx harmony
var element = dom('my-custom', {}, document.body);
element.on('domready', function () {
    // continue work here
});
```
However, that does not always work with the custom-elements-polyfill in browsers outside of Chrome. Due to the limitations of
the shim, element hydration (moving from UnknownElement to a custom element with lifecycle methods) happens asynchronously,
and helper methods like `element.on` were not been added immediately. This could be solved without the shorthand:
```jsx harmony
var element = dom('my-custom', {}, document.body);
element.addEventListener('domready', function () {
    // can continue work here
});
```
Or the convenience function (inserted globally from BaseComponent) can be used:
```jsx harmony
var element = dom('my-custom', {}, document.body);
onDomReady(element, function (element) {
    // can continue work here
});
``` 

`onDomReady` also works with a list of nodes:
```jsx harmony
var n1 = dom('my-custom', {}, document.body);
var n2 = dom('my-custom', {}, document.body);
var n3 = dom('my-custom', {}, document.body);
onDomReady([n1,n2,n3], function (nodes) {
    // can continue work here
});
``` 

The benefit of `onDomReady` over `element.addEventListener` is that if the element is already in the `domready` 
state the callback will still fire. Also, the event listener is cleaned up under the hood, while using 
`element.addEventListener` leaves that up to you.
   
## Event Handling
 
BaseComponent uses the [clubajax/on](https://github.com/clubajax/on) library to handle events. To add even more power
to custom elements, `on` is included, and its context set to itself. For example:
```jsx harmony
myCustomElement.on('click', function (event) {
    // handle click
});
this.on('click', (e) => {
	this.myMethod();
});

```

The power happens by functionality that remembers the events, and when `destroy()` is called, they are all removed. So
all event cleanup is a matter of calling `destroy()`.

While context defaults to the element itself, you can optionally specify a different element (or window in this case):
```jsx harmony
myCustomElement.on(window, 'resize', function (event) {
    // handle resize
});
```

You can also use the `once` feature:
```jsx harmony
myCustomElement.once(img, 'load', function (event) {
    // handle image loading
    // this event will never fire again
});
```

Also mixed into the custom element are `on`'s `emit` and `fire` methods. Typically, `emit` is for standard events, and
`fire` is for custom events.
```jsx harmony
this.emit('change', {value: this.value});
this.fire('closed');
```

See the [clubajax/on](https://github.com/clubajax/on) documentation for a complete list of features.

## Plugins

`BaseComponent` uses a plugin architecture, which not only helps keep the code clean and maintainable, it allows for
flexibility. 

### template plugin

The template plugin allows for the association of HTML, via a `templateId` property, with a custom element. The template 
can be created in a [template element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template), which is not 
exposed to the document until it is cloned. 
```jsx harmony
<template id="my-custom-template">
    <div>This will be inserted into the custom element</div>
</template>

class TestTmplId extends BaseComponent {
    get templateId () {
        return 'test-tmpl-id-template';
    }
}
```

Alternatively, an HTML string can be used with the `templateString` property:
```jsx harmony
class TestTmplId extends BaseComponent {
    get templateString () {
        return '<div>my-custom-template</div>';
    }
}
```

### refs plugin

The refs plugin allows for `ref` attributes to be used in the template as shortcuts for properties. The value of the 
`ref` attribute will be added as a property in the node and assigned the value of the node that contained the attribute.
```jsx harmony
<template id="my-custom-template">
    <div ref="coolNode">Cool</div>
    <div ref="uncoolNode">Uncool</div>
</template>

class TestTmplId extends BaseComponent {
    get templateId () {
        return 'test-tmpl-id-template';
    }
    
    domReady () {
        console.log(this.coolNode.innerHTML); // Cool
        console.log(this.uncoolNode.innerHTML); // Uncool
    }
}
```

To associate events, use an `on` attribute, with a colon-delineated event-method pair:
```jsx harmony
    <template id="my-custom-template">
        <div on="click:onClick">Cool</div>
        <div on="change:onChange">Uncool</div>
    </template>
    
    class TestTmplId extends BaseComponent {
        get templateId () {
            return 'test-tmpl-id-template';
        }
        
        onClick (event) {}
        onChange (event) {}
    }
```

## properties plugin

The `properties` plugin is used to reduce redundancy on getter/setters. The [spec](https://w3c.github.io/webcomponents/spec/custom/#custom-elements-autonomous-example)
 is designed to make it easy to sync properties with attributes; but in doing so, the result is a `get` and `set` for 
 every property that only sets or returns its corresponding attribute.

Using the `properties` plugin, and adding a `props` and/or a `bool` array that is the same or a subset of the `observedAttributes` array
will automatically add those getters and setters.

```jsx harmony
class TestProps extends BaseComponent {

    static get observedAttributes() { return ['foo', 'bar', 'disabled', 'readonly']; }
    get props () { return ['foo', 'bar']; }
    get bools () { return ['disabled', 'readonly']; }
 
    domReady () {
    	console.log(this.disabled);
    	console.log(this.foo);
    }
}
``` 

A dynamic callback is generated and can be used if an operation needs to occur on an attribute or property 
change. When `foo` changes. `onFoo` is fired, passing the value. 

**Because a majority of the time, properties are used to change the DOM, the dynamic callback is fired using onDomReady.**

If there is a `return` in the callback, that will become the new property - with the caveat that it breaks the sync 
between the attribute and the property. Note this only works with `props`, not with `bools`.
```jsx harmony
class MyCustom extends BaseComponent {

    onFoo (value) {
    	console.log('foo:', value); // 10
    	return value * 0.1; // this.foo is now 1 but this.getAttribute('foo') is still 10
    }
}
customElements.define('my-custom', MyCustom);

<my-custom foo="10" />
``` 

There is a `props` and a `bool` array:

### props
`props` are strings or numbers. The value is normalized, so that the property and the value in the callback will be a 
number (or whatever)

### bools
`bools` are naturally, always booleans. The reason these are special is attributes can work via existence, for example:
```jsx harmony
// not set strictly to "true", but as an attribute, equates to true:
<my-custom disabled /> 
// not set at all, but as an attribute, equates to false:
<my-custom />
``` 
### Developing a Plugin

A plugin looks like this:
```
BaseComponent.addPlugin({
    name: PLUGIN_NAME,
    order: ORDER_OF_EXECUTION,
    init                    - fires after constructor
    preConnected            - fires before connected is called
    postConnected           - fires after connected is called
    preDomReady             - fires before domReady is called
    postDomReady            - fires after domReady is called
    preAttributeChanged     - fires before attributeChanged is called
});
```

The `name` should be unique, and the `order` determines, if multiple plugins all have the same callback (such as 
preDomReady) which plugin fires in what order.

All the callbacks fire with the custom element as an argument, with the element and possible options.

When adding one or multiple plugins, all components will have this functionality. It is not possible to have components
with different plugins.

## Inheritance

Use the same inheritance you would use with [ES6 classes](http://exploringjs.com/es6/ch_classes.html#_the-species-pattern-in-static-methods). 

## Shadow DOM (not used!)

BaseComponent purposely does not use the Shadow DOM. There are only a few use cases for Shadow DOM, and due to the 
difficulty in styling, the cons outweigh the pros. This also keeps the library simple.

This should not prevent you from using Shadow DOM in your custom elements.

## ES6 FAQ

Q: **What are the steps for using webpack?**

A: The [custom elements polyfill](https://github.com/clubajax/custom-elements-polyfill) makes this easy. See *Adding to a Project* above.:

Use babel: `{"presets": ["es2015"]}`

Decide if you want to use ES6 (Chrome only) or ES5 (all browsers)

If only targeting browsers with native elements, the polyfill is not necessary, and your `import` can be pointed to 
`src/BaseComponent`. Otherwise, your `import` should be pointed to `dist/BaseComponent`, which is transpiled to work 
with ES5. The polyfill includes the native-shim, which allows Chrome to work with the transpiled class. 

Q. **Uncaught TypeError: Failed to construct 'HTMLElement': Please use the 'new' operator, this DOM object constructor cannot be called as a function.**

A. The web components native-shim.js (in the custom elements polyfill) is missing. 
Ensure that the shim is loading before any custom element code.

Q. **Uncaught TypeError:Super expression must either be null or a function, not object**

A. The class is not extending the class correctly. This is because of a typo, a bad class, or when importing, getting a
wrapper around the object; ergo, instead of `extend MyClass`, you may have to do `extend MyClass.default` (although this is rare)

Q. **Uncaught TypeError: Class constructor cannot be invoked without 'new'**

A. Multiple possibilities:

 * Babel is not transpiling. This could be the wrong version (try "latest" or "es2015")
 * You might not be transpiling `node_modules` dependencies. Ensure they are not excluded in webpack's `exclude`.
 * As per the above FAQ, it is _*because*_ you added `.default` to the extended class.
 * You might be linking to *src/BaseComponent* instead of *dist/BaseComponent*. 
 * You are using the native-shim from custom-elements-polyfill, with untranspiled code. If this is the purpose, use
 `window['no-native-shim'] = true;` before loading the polyfill, to prevent the native-shim from loading.
 
Q. **Uncaught ReferenceError: "this" is not defined**

A. `super()` is required in the constructor when extending another class.

Q. **What are the `constructor super()` rules?** 

A. Super-Rules:
 
 * Do not call `super()` if not extending a class
 * When extending a class and using a constructor, `super()` must be called.
 * `super()` must be called first - or at least before using the `this` keyword.
 * Do not try to pass arguments into a constructor - they are not passed into extended HTMLElements (at least not in the v1 spec)
 
Q. **Why are my component methods undefined?**

A. Did you remember to do: `customElements.define('my-component', MyComponent)`?

## Developing

Clone the repository with your generic clone commands as a standalone repository or submodule.

	git clone git://github.com/clubajax/BaseComponent.git
	
To run the tests in `tests/test-v1.html`, start the webpack build and webpack-dev-server:

    npm start
    
To run the webpack build for distribution to be accessed by `tests/test-dist.html`:

    npm run deploy
    
A "globalized" version can be built and accessed with `tests/globalES6.html`. This converts the ES6 `import` and `export` into window globals, but otherwise leaves
the remaining code as ES6. This way the code can be run in Chrome natively, and in Firefox and Edge with the webcomponents
shim. `import` and `export` and not yet a specification standard and are not yet supported in any browers (although it is
closest in Edge).

    npm run globalize
## Resources

[webreflection](https://www.webreflection.co.uk/blog/2016/08/21/custom-elements-v1)  
[w3 mailing list](https://lists.w3.org/Archives/Public/public-webapps-github/2016Mar/1932.html)  
[mdn](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct)  
[Classes](http://exploringjs.com/es6/ch_classes.html#_the-species-pattern-in-static-methods)  

## License

This uses the [MIT license](./LICENSE). Feel free to use, and redistribute at will.
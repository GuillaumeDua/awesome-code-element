// MIT License
//
// Copyright (c) 2021-2022 Guillaume Dua "Guss"
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// details

import AwesomeCodeElement from '/awesome-code-element.js'

AwesomeCodeElement.test_utility = class {
// class-as-namespace

    static inject_field_proxy(owner, property_name, { getter_payload, setter_payload } = {}) {
    // generate a proxy to a value's field, injecting optional payload
        
        var _owner = owner
        var storage = _owner[property_name] // unused if the field custom getter or setter
    
        let js_parser_sucks = (function(){
            var old_getter = _owner.__lookupGetter__(property_name)
            var old_setter = _owner.__lookupSetter__(property_name)
    
            var getter = function(){
                let result = old_getter ? old_getter.call(_owner) : storage
                // notify get with value
                if (getter_payload)
                    getter_payload(result)
                return result
            };
            var setter = function(newValue){
                if (old_setter)
                    old_setter.call(_owner, newValue)
                else
                    storage = newValue
                // notify set with value
                if (setter_payload)
                    setter_payload(old_getter ? old_getter.call(_owner) : storage)
            };
    
            Object.defineProperty(_owner, property_name, {
                get: getter,
                set: setter
            });
    
            console.log
    
        })();
    }
    static element_shake_effect_for(element, duration) {
        element.classList.add('shake')
        window.setTimeout(() => {
            element.classList.remove('shake')
        }, duration)
    }
}
// global behavior modifiers
AwesomeCodeElement.test_utility.global_behavior_modifiers = class {
// class-as-namespace

    static toggle_action = undefined

    // slow fetch resource (emulates slow network)
    static #original_fetch_resource = (() => {
        let value = AwesomeCodeElement.details.utility.fetch_resource
        if (value === undefined)
            throw new Error('test_utility.global_behavior_modifiers.toggle_slow_fetch_resource (initialization): missing utility.fetch_resource')
        return value
    })()
    static get toggle_slow_fetch_resource() {
        return test_utility.global_behavior_modifiers.#original_fetch_resource !== utility.fetch_resource
    }
    static set toggle_slow_fetch_resource(value) {
        value = value ?? !test_utility.global_behavior_modifiers.toggle_slow_fetch_resource
        utility.fetch_resource = (value
            ? test_utility.global_behavior_modifiers.#slow_fetch_resource
            : test_utility.global_behavior_modifiers.#original_fetch_resource
        );
    }
    static #slow_fetch_resource(url, { on_error, on_success }){
        let xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onerror = function() {
                on_error(`RemoteCodeSection: network Error`)
            };
            xhr.onload = function() {

                if (xhr.status != 200) {
                    on_error(`RemoteCodeSection: bad request status ${xhr.status}`)
                    return;
                }

                // TEST: emulate latency in resource acquisition
                console.info('[test_utility.global_behavior_modifiers.#slow_fetch_resource] Fake loading ...');
                setTimeout(function(){
                    console.info('[test_utility.global_behavior_modifiers.#slow_fetch_resource] Fake loading done');
                    on_success(xhr.responseText)
                }, 1500);
            };
            xhr.send();
    }

    // toggle 'stylished'
    static #_toggle_style = false
    static get toggle_style() {
        return test_utility.global_behavior_modifiers.#_toggle_style
    }
    static set toggle_style(value) {

        const stylished_classname = 'stylished'

        test_utility.global_behavior_modifiers.#_toggle_style = value ?? !test_utility.global_behavior_modifiers.#_toggle_style
        let apply_toggle_style = test_utility.global_behavior_modifiers.#_toggle_style
            ? function (elements) { elements.addClass   (`${stylished_classname}`)}
            : function (elements) { elements.removeClass(`${stylished_classname}`)}

        let elements = $('body').find('code, div.fragment, pre.fragment, div.contents')
        apply_toggle_style(elements)
    }

    // toggle small page width
    static #_toggle_small = false
    static get toggle_small() {
        return test_utility.global_behavior_modifiers.#_toggle_small
    }
    static set toggle_small(value) {

        let r = document.querySelector(':root');

        test_utility.global_behavior_modifiers.#_toggle_small = value ?? !test_utility.global_behavior_modifiers.#_toggle_small
        if (test_utility.global_behavior_modifiers.#_toggle_small)
            r.style.setProperty('width', '500px' );
        else
            document.querySelector(':root').style.removeProperty('width')
    }
}
// UI element
AwesomeCodeElement.test_utility.HTMLElements = {}
AwesomeCodeElement.test_utility.HTMLElements.toolbar = class extends HTMLElement {
    static HTMLElement_name = 'awesome_code_element_test-utility-toolbar'

    constructor() {
        super()
    }

    connectedCallback(){

        // TODO: use checkbox + label instead to show active value
        let generate_toggle_button = (name) => {
            let value = document.createElement('button')
                value.id = `button_${name}`
                value.textContent = `${name}`
                value.addEventListener('click', () => {
                    test_utility.global_behavior_modifiers[name] = test_utility.global_behavior_modifiers.toggle_action
                })
            return value
        }

        this.id = 'test_utility_toolbar'
        AwesomeCodeElement.details.utility.apply_css(this, {
            display : 'block',
            border  : '1px solid var(--primary-color)',
            width   : 'fit-content',
            margin  : 'auto',
            padding : '5px'
        })

        this.appendChild(generate_toggle_button('toggle_style'))
        this.appendChild(generate_toggle_button('toggle_small'))
        this.appendChild(generate_toggle_button('toggle_slow_fetch_resource'))
    }
}
customElements.define(
    AwesomeCodeElement.test_utility.HTMLElements.toolbar.HTMLElement_name,
    AwesomeCodeElement.test_utility.HTMLElements.toolbar
);

// module
export default AwesomeCodeElement.test_utility;

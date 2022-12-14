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

// WARNING: INTERNAL USE FOR SHOWCASE ONLY.

import ace from '../../../awesome-code-element/awesome-code-element.js'
if (ace === undefined)
    throw new Error('docs/details/js/modules/utils.js: missing [ace]')

ace.test_utils = class {
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

// =========================
// global behavior modifiers
ace.test_utils.global_behavior_modifiers = class global_behavior_modifiers {
// class-as-namespace
    static toggle_action = undefined

    // slow fetch resource (emulates slow network)
    static #original_fetch_resource = (() => {
        let value = ace.details.utility.fetch_resource
        if (value === undefined)
            throw new Error('ace.test_utils.global_behavior_modifiers.toggle_slow_fetch_resource (initialization): missing utility.fetch_resource')
        return value
    })()
    static get toggle_slow_fetch_resource() {
        return global_behavior_modifiers.#original_fetch_resource !== ace.details.utility.fetch_resource
    }
    static set toggle_slow_fetch_resource(value) {
        value = value ?? !global_behavior_modifiers.toggle_slow_fetch_resource
        ace.details.utility.fetch_resource = (value
            ? global_behavior_modifiers.#slow_fetch_resource
            : global_behavior_modifiers.#original_fetch_resource
        );
    }
    static #slow_fetch_resource(url, { on_error, on_success }){
        let xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onerror = function() {
                on_error(`CodeSection: network error`)
            };
            xhr.onload = function() {

                if (xhr.status != 200) {
                    on_error(`CodeSection: bad request status ${xhr.status}`)
                    return;
                }

                // TEST: emulate latency in resource acquisition
                console.info('[ace.test_utils.global_behavior_modifiers.#slow_fetch_resource] Fake loading ...');
                setTimeout(function(){
                    console.info('[ace.test_utils.global_behavior_modifiers.#slow_fetch_resource] Fake loading done');
                    on_success(xhr.responseText)
                }, 1500);
            };
            xhr.send();
    }

    // toggle small page width
    static #_toggle_small = false
    static get toggle_small() {
        return global_behavior_modifiers.#_toggle_small
    }
    static set toggle_small(value) {

        let r = document.querySelector(':root');

        global_behavior_modifiers.#_toggle_small = value ?? !global_behavior_modifiers.#_toggle_small
        if (global_behavior_modifiers.#_toggle_small)
            r.style.setProperty('width', '500px' );
        else
            document.querySelector(':root').style.removeProperty('width')
    }
}

// ===========
// UI elements

ace.test_utils.HTML_elements = {}
ace.test_utils.HTML_elements.toolbar = class test_utils extends HTMLElement {
    static HTMLElement_name = 'awesome_code_element_test-utility-toolbar'

    constructor() {
        super()
    }

    connectedCallback(){

        // TODO: use checkbox + label instead to show active value (or emoji red/green light)
        let generate_toggle_button = (name) => {
            let value = document.createElement('button')
                value.id = `button_${name}`
                value.textContent = `${name}`
                value.addEventListener('click', () => {
                    ace.test_utils.global_behavior_modifiers[name] = ace.test_utils.global_behavior_modifiers.toggle_action
                })
            return value
        }

        this.id = 'test_utils_toolbar'
        ace.details.utility.apply_css(this, {
            display : 'flex',
            border  : '1px solid var(--primary-color)',
            width   : 'fit-content',
            margin  : 'auto',
            marginBottom: '10px',
            padding : '5px'
        })

        this.appendChild(generate_toggle_button('toggle_small'))
        this.appendChild(generate_toggle_button('toggle_slow_fetch_resource'))
        this.appendChild(new ace.API.HTML_elements.ToggleDarkModeButton())
        this.appendChild(new ace.API.HTML_elements.ThemeSelector(['tokyo-night', 'base16/google']))
    }
}
customElements.define(
    ace.test_utils.HTML_elements.toolbar.HTMLElement_name,
    ace.test_utils.HTML_elements.toolbar
);

// module
export default ace.test_utils;

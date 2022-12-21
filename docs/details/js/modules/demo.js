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

import ace from '/awesome-code-element.js'

if (ace.API.HTML_elements.CodeSection === undefined)
    throw new Error('CodeSection_demo: missing mandatory dependency [ace.CodeSection]')

import ace_test_utils from '/docs/details/js/modules/utils.js';

ace.showcase                    = ace.showcase ?? {}
ace.showcase.HTML_elements      = ace.showcase.HTML_elements ?? {}
ace.showcase.HTML_elements.demo = class extends ace.API.HTML_elements.CodeSection {

    static HTMLElement_name = 'ace-code-section-demo'

    constructor() {
        super()
    }

    set switch_style_direction(value) {
        this.direction = (this.direction === 'column' ?  'row' : 'column')
    }
    get switch_style_direction() {
        return this.direction
    }

    initialize() {
        super.initialize()

        if (!this.isConnected)
            throw new Error('CodeSection_demo: not connected yet ')

        // view proxies
        let options_container = document.createElement('div')
        ace.details.utility.apply_css(options_container, {
            flexDirection: 'column',
            display: 'flex',
        })
        // two-way binding ...
        options_container.appendChild(this.#make_boolean_field_view('toggle_parsing'))
        options_container.appendChild(this.#make_boolean_field_view('toggle_execution'))
        options_container.appendChild(this.#make_boolean_field_view('toggle_language_detection'))
        options_container.appendChild(this.#make_boolean_field_view('switch_style_direction'))
        options_container.appendChild(this.#make_language_view())
        options_container.appendChild(this.#make_url_view())

        this.prepend(options_container)

        this.#transform_code_into_editable()   
    }

    #transform_code_into_editable() {
        // make code editable
        let _this = this
        this.html_elements.code.title = 'Edit me !'
        this.html_elements.code.addEventListener('click', () => {
            _this.html_elements.code.setAttribute('contentEditable', !_this.toggle_parsing)
            if (_this.toggle_parsing)
                ace_test_utils.element_shake_effect_for(_this.html_elements.code, 500)
        })
        let delay_timer = null
        this.html_elements.code.addEventListener('keyup', function(event){

            console.log(event)

            if (_this.toggle_parsing)
                throw new Error('CodeSection_demo: invalid attempt to edit parsed code')

            if (delay_timer)
                window.clearTimeout(delay_timer)
            delay_timer = window.setTimeout(() => {
                delay_timer = null // reset timer
                _this.code = _this.html_elements.code.textContent
            }, 500)
        })
    }

    // two-way bindings
    #make_boolean_field_view(property_name) {

        let printable_name = property_name.replaceAll(/[\-|\_]/g, ' ')
        // html
        let sub_container = document.createElement('div')
        ace.details.utility.apply_css(sub_container, {
            flex: '0 0 fit-content',
            borderRadius: 'var(--border-radius-small)',
            border: '1px solid var(--separator-color)'
        })
        let checkbox = sub_container.appendChild(document.createElement('input'))
            checkbox.type = "checkbox"
            checkbox.title = `${printable_name} ?`
            checkbox.checked = Boolean(this[property_name])

        let label = sub_container.appendChild(document.createElement('label'))
            label.textContent = ` ${printable_name}`

        ace_test_utils.inject_field_proxy(this, property_name, {
            getter_payload : undefined,
            setter_payload : (value) => {
                checkbox.checked = value
            }
        })

        let _this = this
        checkbox.onclick = function(event){
            event.stopImmediatePropagation()
            checkbox.checked = (_this[property_name] = checkbox.checked)
        }
        sub_container.addEventListener('click', (event) => {
            event.stopImmediatePropagation()
            checkbox.checked = !checkbox.checked
            checkbox.onclick(event)
        }, false)
        return sub_container
    }
    #make_language_view() {

        let sub_container = document.createElement('div')
        ace.details.utility.apply_css(sub_container, {
            display: 'flex',
            borderRadius: 'var(--border-radius-small)',
            border: '1px solid var(--separator-color)'
        })
        let label = sub_container.appendChild(document.createElement('label'))
            label.textContent = `language `
        let input_field = sub_container.appendChild(document.createElement('input'))
            input_field.type = "text"
            input_field.value = super.language
            input_field.title = 'clear to attempt a fallback autodetection'
            ace.details.utility.apply_css(input_field, {
                width: '100%',
                marginLeft: '10px'
            })

        let delay_timer = null
        input_field.addEventListener('keyup', (arg) => {
            if (delay_timer)
                window.clearTimeout(delay_timer)
            delay_timer = window.setTimeout(() => {
                delay_timer = null // reset timer
                this.language = arg.target.value
            }, 300)
        })

        ace_test_utils.inject_field_proxy(this, 'language', {
            getter_payload : () => {
            },
            setter_payload : (value) => {
                input_field.value = value
            }
        })

        return sub_container
    }
    #make_url_view() {

        let sub_container = document.createElement('div')
        ace.details.utility.apply_css(sub_container, {
            display: 'flex',
            borderRadius: 'var(--border-radius-small)',
            border: '1px solid var(--separator-color)'
        })
        let label = sub_container.appendChild(document.createElement('label'))
            label.textContent = `url `
        let input_field = sub_container.appendChild(document.createElement('input'))
            input_field.type = "text"
            input_field.value = !super.url ? '' : super.url
            input_field.title = 'remote code location. Press <enter> to apply'
            ace.details.utility.apply_css(input_field, {
                width: '100%',
                marginLeft: '10px'
            })

        input_field.addEventListener('keyup', (arg) => {
            if (arg.key === 'Enter')
                this.url = arg.target.value
        })

        ace_test_utils.inject_field_proxy(this, 'url', {
            getter_payload : () => {
            },
            setter_payload : (value) => {
                input_field.value = value
            }
        })

        return sub_container
    }
}
customElements.define(
    ace.showcase.HTML_elements.demo.HTMLElement_name,
    ace.showcase.HTML_elements.demo
);

export default ace.showcase.HTML_elements.demo

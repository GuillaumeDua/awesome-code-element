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

// WARNING: INTERNAL USE, FOR SHOWCASE ONLY.

import ace from '../../../awesome-code-element/awesome-code-element.js'
if (ace === undefined)
    throw new Error('docs/details/js/modules/utils.js: missing [ace]')
if (ace.API.HTML_elements.CodeSection === undefined)
    throw new Error('CodeSection_demo: missing mandatory dependency [ace.CodeSection]')

    import ace_test_utils from '../../../details/js/modules/utils.js';
if (ace.test_utils === undefined)
    throw new Error('docs/details/js/modules/utils.js: missing [ace.test_utils]')

ace.showcase                    = ace.showcase ?? {}
ace.showcase.HTML_elements      = ace.showcase.HTML_elements ?? {}
ace.showcase.HTML_elements.demo = class cs_demo extends ace.API.HTML_elements.CodeSection {

    static get HTMLElement_tagName() { return 'ace-code-section-demo' }
    get [Symbol.toStringTag](){ return cs_demo.HTMLElement_tagName }

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
        const presentation_controler = this.ace_cs_panels.presentation.code_mvc.controler
        options_container.appendChild(this.#make_boolean_field_view({ target: presentation_controler, property_name: 'toggle_parsing' }))
        options_container.appendChild(this.#make_boolean_field_view({ target: presentation_controler, property_name: 'toggle_language_detection' }))
        options_container.appendChild(this.#make_boolean_field_view({ target: this, property_name: 'toggle_execution' }))
        console.log(this)
        options_container.appendChild(this.#make_boolean_field_view({ target: this, property_name: 'switch_style_direction' }))
        options_container.appendChild(this.#make_string_view({ target: presentation_controler, property_name: 'language', hint: 'clear to attempt a fallback autodetection' }))
        options_container.appendChild(this.#make_string_view({ target: this, property_name: 'url', hint: 'remote code location. Press <enter> to apply' }))

        this.prepend(options_container)

        this.#transform_code_into_editable()   
    }

    // TODO: rich code editor
    #transform_code_into_editable() {
        // make code editable
        const presentation_mvc = this.ace_cs_panels.presentation.code_mvc
        presentation_mvc.view.title = 'Edit me !'
        presentation_mvc.view.addEventListener('click', () => {
            presentation_mvc.view.setAttribute('contentEditable', !this.toggle_parsing)
            if (this.toggle_parsing)
                ace_test_utils.element_shake_effect_for(presentation_mvc.view, 500)
        })
        let delay_timer = null
        presentation_mvc.view.addEventListener('keyup', function(event){

            console.log(event)

            if (this.toggle_parsing)
                throw new Error('CodeSection_demo: invalid attempt to edit parsed code')

            if (delay_timer)
                window.clearTimeout(delay_timer)
            delay_timer = window.setTimeout(() => {
                delay_timer = null // reset timer
                presentation_mvc.model = presentation_mvc.view.textContent
            }, 500)
        })
    }

    // two-way data bindings
    #make_boolean_field_view({ target, property_name }) {

        if (!target.hasOwnProperty(property_name) && !Object.getPrototypeOf(target).hasOwnProperty(property_name))
            throw new Error(`ace.showcase.HTML_elements.demo: invalid argument\n\t[${target}] -> [${property_name}]`)

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
            checkbox.checked = Boolean(target[property_name])

        let label = sub_container.appendChild(document.createElement('label'))
            label.textContent = ` ${printable_name}`

        ace_test_utils.inject_field_proxy(target, property_name, {
            getter_payload : undefined,
            setter_payload : (value) => {
                checkbox.checked = value
            }
        })

        checkbox.onclick = (event) => {
            event.stopImmediatePropagation()
            checkbox.checked = (target[property_name] = checkbox.checked)
        }
        sub_container.addEventListener('click', (event) => {
            event.stopImmediatePropagation()
            checkbox.checked = !checkbox.checked
            checkbox.onclick(event)
        }, false)
        return sub_container
    }
    #make_string_view({ target, property_name, hint }) {

        if (!target.hasOwnProperty(property_name) && !Object.getPrototypeOf(target).hasOwnProperty(property_name))
            throw new Error(`ace.showcase.HTML_elements.demo: invalid argument\n\t[${target}] -> [${property_name}]`)

        let sub_container = document.createElement('div')
        ace.details.utility.apply_css(sub_container, {
            display: 'flex',
            borderRadius: 'var(--border-radius-small)',
            border: '1px solid var(--separator-color)'
        })
        let label = sub_container.appendChild(document.createElement('label'))
            label.textContent = `${property_name} `
        let input_field = sub_container.appendChild(document.createElement('input'))
            input_field.type = "text"
            input_field.value = super[property_name] ?? ''
            input_field.title = hint
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
                target[property_name] = arg.target.value
            }, 300)
        })

        // ace_test_utils.inject_field_proxy(target, property_name, {
        //     getter_payload : () => {
        //     },
        //     setter_payload : (value) => {
        //         input_field.value = value ?? ''
        //     }
        // })

        return sub_container
    }
}
customElements.define(
    ace.showcase.HTML_elements.demo.HTMLElement_tagName,
    ace.showcase.HTML_elements.demo
);

export default ace.showcase.HTML_elements.demo

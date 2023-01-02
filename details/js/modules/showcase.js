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

import ace from '../../../awesome-code-element.js'

ace.showcase                        = ace.showcase ?? {}
ace.showcase.HTML_elements          = ace.showcase.HTML_elements ?? {}
ace.showcase.HTML_elements.wrapper  = class HTMLShowCase extends HTMLElement {
    static HTMLElement_name = 'ace-showcase-wrapper'

    constructor(){
        super()
    }
    connectedCallback() {

        // TODO: use AwesomeCodeElement.details.utility.html_node_content_to_code(element) instead ?

        // merge all nested HTML comments
        let text_content = [...this.childNodes]
            .filter(element => element.nodeType === Node.COMMENT_NODE)
            .map(element => element.textContent)
            .join('')
                .replace(/^\s*/, '')
                .replace(/\s*$/, '')

        this.wrapped_HTML_code = {
            raw: text_content,
            decoded: ace.details.utility.html_codec.decode(text_content),
            encoded: ace.details.utility.html_codec.encode(text_content)
        }

        this.#initialize()
    }

    #initialize() {

        // cleaned-up inner content
        this.innerHTML = this.wrapped_HTML_code.decoded

        // make the inner content eye-candy
        let content_view = document.createElement('div')

        let html_code_label = content_view.appendChild(document.createElement('h5'))
            html_code_label.textContent = 'HTML code:'
            html_code_label.className = 'trapezoid trapezoid-up'

        let html_code_view = content_view.appendChild(document.createElement('pre'))
            html_code_view.style.border       = '1px solid var(--separator-color)'
            html_code_view.style.borderRadius = 'var(--border-radius-small)'
            html_code_view.style.display    = 'block'
            html_code_view.style.padding    = '1em'
            html_code_view.style.margin     = '0'
            html_code_view.style.overflow   = 'auto'
            html_code_view.textContent      = this.wrapped_HTML_code.raw
            html_code_view.className        = 'hljs language-HTML'

            hljs.highlightElement(html_code_view)

        let cs_label = content_view.appendChild(document.createElement('h5'))
            cs_label.style.marginTop = '1em'
            cs_label.textContent = 'rendering:' // ace.API.HTMLElement.CS
            cs_label.className = 'trapezoid trapezoid-up'

        this.prepend(content_view)
    }

}
customElements.define(
    ace.showcase.HTML_elements.wrapper.HTMLElement_name,
    ace.showcase.HTML_elements.wrapper
);

export default ace.showcase.HTML_elements.wrapper

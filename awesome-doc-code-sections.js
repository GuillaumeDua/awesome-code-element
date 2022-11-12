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

// awesome-doc-code-sections
//
//  Brief: Doxygen + doxygen-awesome-css + highlightjs == <3 (awesome-doc-code-sections)
//         Note that doxygen-awesome-css is not a mandatory dependency
//
// Code sections, with extra features :
//  - load content from
//      - remote url (js: RemoteCodeSection)
//          such as (in index.md: <div class='awesome-doc-code-sections_remote-code-section' url='https://some/remote/path/to/file.cpp'></div> )
//      - local inner HTML (js: CodeSection)
//          awesome-doc-code-sections_code-section
//  - synthax-coloration provided by highlightjs,
//      - theme selector
//  - toggle dark/light theme
//  - buttons :
//      - send-to-godbolt
//      - copy-to-clipboard
//      - toggle light/dark mode

// TODO: Documentation
// TODO: compatibility with https://github.com/EnlighterJS/EnlighterJS instead of highlightjs
// TODO: compatibility with Marp
//
// TODO: test behavior without theme selector   (provide default behavior)
// TODO: not mandatory dependency to doxygen    (WIP)
// TODO: highlightjs makes clickable code elements not clickable anymore. Fix that ?
//          https://stackoverflow.com/questions/74114767/highlightjs-how-to-create-custom-clickable-sequence-of-characters
// TODO: hide warnings for undefined/fallback hljs language
// TODO: soft errors (replace HTMLElement content with red error message, rather than stopping the process)
// TODO: make Initialize_DivHTMLElements generic
// TODO: CE execution: bottom or right panel

if (typeof hljs === 'undefined')
    console.error('awesome-doc-code-sections.js: depends on highlightjs, which is missing')
if (typeof jQuery === 'undefined')
    console.error('awesome-doc-code-sections.js: depends on jQuery, which is missing')

var awesome_doc_code_sections = {}
    awesome_doc_code_sections.configuration = {}
    awesome_doc_code_sections.configuration.CE = new Map()
    // key   : language_hljs_name
    // value : {
    //      language,       // not mandatory, if same as key. Refers to https://godbolt.org/api/languages
    //      compiler_id,
    //      default_options // not mandatory
    // }

class ParsedCode {
// TODO: @awesome-doc-code-sections::keep : keep tag anyway as comment (for documentation purpose)

// @awesome-doc-code-sections::CE={
//  "language"            : "c++",
//  "compiler_id"         : "clang1400",
//  "compilation_options" : "-O2 -std=c++20",
//  "libs"                : [ {"id": "fmt", "version": "trunk"} ],
//  "includes_transformation" : [
//     // <documentation> <replacement>
//        [ "csl/",       "https://raw.githubusercontent.com/GuillaumeDua/CppShelf/main/includes/ag/csl/" ],
//        [ "toto",       "iostream" ]
//  ],
//  "add_in_doc_execution" : true
//  }
// @awesome-doc-code-sections::skip::block::begin,end : range to [skip] (no parsing, removed from documentation & execution)
// @awesome-doc-code-sections::skip::line             : line  to [skip]
// @awesome-doc-code-sections::show::block::begin,end : range to [show] (documentation side only. The rest is still part of the execution code)
//                                                      if there is at least one occurence, the rest is by default hidden
// @awesome-doc-code-sections::show::line             : line  to [show]
//                                                      if there is at least one occurence, the rest is by default hidden

    static tag = '// @awesome-doc-code-sections'

    code    = ''
    ce_code = ''
    ce_options = {}

    constructor(code_arg, language) {

        // apply default configuration for given - non-mandatory - language
        if (awesome_doc_code_sections.configuration.CE.has(language))
            this.ce_options = awesome_doc_code_sections.configuration.CE.get(language)

        this.#parse(code_arg)
        this.#apply_ce_transformations()
    }

    #parse(code_content) {

        // CE options
        let regexp = new RegExp(`^\\s*?${ParsedCode.tag}::CE=({(.*?\n\\s*//.*?)+}\n?)`, 'gm')
        let matches = [...code_content.matchAll(regexp)] // expect exactly 1 match
        if (matches.length > 1)
            console.error(`awesome-doc-code-sections.js:ParsedCode::constructor: multiples CE configurations`)

        matches.map((match) => {
            let result = match[1].replaceAll(
                new RegExp(`^\\s*?//`, 'gm'),
                ''
            )
            // remove from original content
            code_content = code_content.slice(0, match.index)
                         + code_content.slice(match.index + match[0].length)
            return result
        }).forEach((value) => {
            // Merge CE configuration. Local can override global.
            this.ce_options = {
                ...this.ce_options,
                ...JSON.parse(value)
            }
        })

        // skip block, line (documentation & execution sides)
        // block
        code_content = code_content.replaceAll(
            new RegExp(`^\\s*?${ParsedCode.tag}::skip::block::begin\n(.*?\n)*\\s*?${ParsedCode.tag}::skip::block::end\\s*?$`, 'gm'),
            ''
        )
        // line
        code_content = code_content.replaceAll(
            new RegExp(`^.*?\\s+${ParsedCode.tag}::skip::line\\s*$`, 'gm'),
            ''
        )

        // show block, line (documentation side)
        let regex_show_block    = `(^\\s*?${ParsedCode.tag}::show::block::begin\n(?<block>(^.*?$\n)+)\\s*${ParsedCode.tag}::show::block::end\n?)`
        let regex_show_line     = `(^(?<line>.*?)\\s*${ParsedCode.tag}::show::line\\s*?$)`
        regexp = new RegExp(`${regex_show_block}|${regex_show_line}`, 'gm')
        matches = [...code_content.matchAll(regexp)]
        let code_only_show = matches
            .reverse()
            .map((match) => {
                let result = match.groups.block !== undefined
                    ? match.groups.block
                    : match.groups.line
                // remove from original content
                // code_content = code_content.replace(match[0], result) // really slower than 2 reverse + 2 substring ?
                code_content = code_content.substring(0, match.index) + result + code_content.substring(match.index + match[0].length)
                return result
            })
            .reverse()
            .join('\n')

        this.code = (code_only_show !== "" ? code_only_show : code_content)
        this.ce_code = code_content
    }
    #apply_ce_transformations() {

        // includes_transformation
        if (this.ce_options.includes_transformation !== undefined) {
            this.ce_options.includes_transformation.forEach((value) => {
                // replace includes

                const regex = new RegExp(`^(\\s*?\\#.*?[\\"|\\<"].*?)(${value[0]})(.*?[\\"|\\>"])`, 'gm')
                this.ce_code = this.ce_code.replace(regex, `$1${value[1]}$3`)
            })
        }
    }
}
awesome_doc_code_sections.ParsedCode = ParsedCode

class remote_resources_cache {
    #remote_files = new Map() // uri -> text

    static async #fetch_remote_file(uri) {

        try {
            let response = await fetch(uri)
            return await response.text()
        }
        catch (error) {
            console.error(
                "awesome-doc-code-sections.js:remote_resources_cache: error\n" +
                "\t" + error
            )
        }
    }

    async get(uri) {
        if (! this.#remote_files.has(uri)) {
            this.#remote_files.set(
                uri,
                await remote_resources_cache.#fetch_remote_file(uri)
            )
        }
        return this.#remote_files.get(uri)
    }
}
class ce_API {
// fetch CE API informations asynchronously

    static #static_initializer = (async function(){
        ce_API.#fetch_languages()
        // ce_API.#fetch_compilers() // not used for now, disabled to save cache memory
    })()

    // cache
    static languages = undefined
    static compilers = undefined
    static #remote_files_cache = new remote_resources_cache()

    static async #fetch_languages() {
    // https://godbolt.org/api/languages
        try {
            let response = await fetch('https://godbolt.org/api/languages')
            let datas = await response.text()

            let text = datas.split('\n')
            text.shift() // remove header
            ce_API.languages = text.map((value) => {
            // keep only ids
                return value.slice(0, value.indexOf(' '))
            })
        }
        catch (error) {
            console.error(
                "awesome-doc-code-sections.js:ce_API: godbolt API exception (fetch_languages)\n" +
                "\t" + error
            )
        }
    }
    static async #fetch_compilers() {
    // https://godbolt.org/api/compilers
        try {
            let response = await fetch('https://godbolt.org/api/compilers')
            let datas = await response.text()

            let text = datas.split('\n')
            text.shift() // remove header
            ce_API.languages = text.map((value) => {
            // keep only ids
                return value.slice(0, value.indexOf(' '))
            })
        }
        catch (error) {
            console.error(
                "awesome-doc-code-sections.js:ce_API: godbolt API exception (fetch_compilers)\n" +
                "\t" + error
            )
        }
    }
    static open_in_new_tab(request_data) {
    // https://godbolt.org/clientstate/

        let body  = JSON.stringify(request_data);
        let state = btoa(body); // base64 encoding
        let url   = "https://godbolt.org/clientstate/" + encodeURIComponent(state);

        // Open in a new tab
        window.open(url, "_blank");
    }
    static async fetch_execution_result(ce_options, code) {
    // https://godbolt.org/api/compiler/${compiler_id}/compile

        if (ce_options.compiler_id === undefined)
            throw 'awesome-doc-code-sections.js::ce_API::open_in_new_tab: invalid argument, missing .compiler_id'

        // POST /api/compiler/<compiler-id>/compile endpoint is not working with remote header-files in `#include`s PP directions
        // https://github.com/compiler-explorer/compiler-explorer/issues/4190
        let matches = [...code.matchAll(/^\s*\#\s*include\s+[\"|\<](\w+\:\/\/.*?)[\"|\>]/gm)].reverse()
        let promises_map = matches.map(async function(match) {

            let downloaded_file_content = await ce_API.#remote_files_cache.get(match[1])
            let match_0_token = match[0].replaceAll('\n', '')
            code = code.replace(match[0], `// download[${match_0_token}]::begin\n${downloaded_file_content}\n// download[${match_0_token}]::end`)
        })

        // Build & send the request
        let fetch_result = async () => {

            let body = {
                "source": code,
                "compiler": ce_options.compiler_id,
                "options": {
                    "userArguments": ce_options.compilation_options,
                    "executeParameters": {
                        "args": ce_options.execute_parameters_args || [],
                        "stdin": ce_options.execute_parameters_stdin || ""
                    },
                    "compilerOptions": {
                        "executorRequest": true
                    },
                    "filters": {
                        "execute": true
                    },
                    "tools": [],
                    "libraries": ce_options.libs || []
                },
                "lang": ce_options.language,
                "allowStoreCodeDebug": true
            }
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify(body)
            };

            return await fetch(`https://godbolt.org/api/compiler/${ce_options.compiler_id}/compile`, options)
                .then(response => response.text())
        }

        return await Promise.all(promises_map).then(() => {
            return fetch_result()
        })
    }
}
class utility {
    static apply_css(element, styles) {
        for (const property in styles)
            element.style[property] = styles[property];
    }
    static create_shadowroot_slot(element, when_childrens_attached) {
        element.attachShadow({ mode: 'open' });
        element.shadowRoot.innerHTML = `<slot></slot>`;
        const slot = element.shadowRoot.querySelector('slot');
    
        slot.addEventListener('slotchange', (event) => {
            const childrens = event.target.assignedElements();
            when_childrens_attached(childrens)
        });
    }
}

// ============
// HTMLElements

awesome_doc_code_sections.auto_hide_buttons_resize_observer = new ResizeObserver(entries => {
    for (let entry of entries) {

        let auto_hide_elements = (container, elements) => {

            elements.each((index, element) => element.hidden = true)
            container.onmouseover = () => {
                elements.each((index, element) => { element.hidden = false })
            }
            container.onmouseout = () => {
                elements.each((index, element) => element.hidden = true)
            }
        }
        let no_auto_hide_elements = (container, elements) => {

            elements.each((index, element) => { element.hidden = false })
            container.onmouseout = null
            container.onmouseover = null
        }

        // cheaper than proper AABB to check if code's content overlap
        let functor = (awesome_doc_code_sections.options.auto_hide_buttons
            ||  entry.target.clientWidth < 500
            ||  entry.target.clientHeight < 50)
            ? auto_hide_elements
            : no_auto_hide_elements
        ;

        let elements = $(entry.target).find('button[is^=awesome-doc-code-sections_el_]')
        functor(entry.target, elements)
    }
});

class CopyToClipboardButton extends HTMLButtonElement {
// Copy text context of this previousSibling HTMLelement

    static HTMLElement_name = 'awesome-doc-code-sections_el_copy-to-clipboard-button'
    static title            = "Copy to clipboard"
    static copyIcon         = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`
    static successIcon      = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`
    static successDuration  = 980

    constructor() {
        super();

        this.title = CopyToClipboardButton.title
        this.innerHTML = CopyToClipboardButton.copyIcon

        utility.apply_css(this, {
            zIndex      : 2,
            position    : 'absolute',
            top         : '5px',
            right       : '5px',
        })

        this.addEventListener('click', function(){

            this.innerHTML = CopyToClipboardButton.successIcon
            this.style.fill = 'green'

            let text = this.previousSibling.textContent
            navigator.clipboard.writeText(text).then(
                function() {
                    console.log('awesome-doc-code-sections.js:CopyToClipboardButton: success');
                },
                function(err) {
                    console.error('awesome-doc-code-sections.js:CopyToClipboardButton: failed: ', err);
                }
            );
            window.setTimeout(() => {
                this.style.fill = 'black'
                this.innerHTML = CopyToClipboardButton.copyIcon
            }, CopyToClipboardButton.successDuration);
        })
    }
}
customElements.define(CopyToClipboardButton.HTMLElement_name, CopyToClipboardButton, {extends: 'button'});

class SendToGodboltButton extends HTMLButtonElement {

    static HTMLElement_name = 'awesome-doc-code-sections_el_send-to-godbolt-button'
    static title            = 'Try this on godbolt.org (compiler-explorer)'
    static icon             = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32"><switch><g><path d="M58.6 46.5c-.3-.5-.3-1.2 0-1.7.3-.6.7-1.3 1-2 .2-.5-.1-1-.7-1h-5.8c-.6 0-1.2.3-1.4.8-.7 1.1-1.6 2.2-2.6 3.2-3.7 3.7-8.6 5.7-13.9 5.7-5.3 0-10.2-2-13.9-5.7-3.8-3.7-5.8-8.6-5.8-13.9s2-10.2 5.8-13.9c3.7-3.7 8.6-5.7 13.9-5.7 5.3 0 10.2 2 13.9 5.7 1 1 1.9 2.1 2.6 3.2.3.5.9.8 1.4.8h5.8c.5 0 .9-.5.7-1-.3-.7-.6-1.3-1-2-.3-.5-.3-1.2 0-1.7l1.9-3.5c.4-.7.3-1.5-.3-2.1l-4.9-4.9c-.6-.6-1.4-.7-2.1-.3l-3.6 2c-.5.3-1.2.3-1.7 0-1.7-.9-3.5-1.7-5.4-2.2-.6-.2-1-.6-1.2-1.2l-1.1-3.9C40.1.5 39.5 0 38.7 0h-6.9C31 0 30.2.5 30 1.3l-1.1 3.9c-.2.6-.6 1-1.2 1.2-1.9.6-3.6 1.3-5.3 2.2-.5.3-1.2.3-1.7 0l-3.6-2c-.7-.4-1.5-.3-2.1.3l-4.9 4.9c-.6.6-.7 1.4-.3 2.1l2 3.6c.3.5.3 1.2 0 1.7-.9 1.7-1.7 3.5-2.2 5.3-.2.6-.6 1-1.2 1.2l-3.9 1.1c-.7.2-1.3.9-1.3 1.7v6.9c0 .8.5 1.5 1.3 1.7l3.9 1.1c.6.2 1 .6 1.2 1.2.5 1.9 1.3 3.6 2.2 5.3.3.6.3 1.2 0 1.7l-2 3.6c-.4.7-.3 1.5.3 2.1L15 57c.6.6 1.4.7 2.1.3l3.6-2c.6-.3 1.2-.3 1.7 0 1.7.9 3.5 1.7 5.3 2.2.6.2 1 .6 1.2 1.2l1.1 3.9c.2.7.9 1.3 1.7 1.3h6.9c.8 0 1.5-.5 1.7-1.3l1.1-3.9c.2-.6.6-1 1.2-1.2 1.9-.6 3.6-1.3 5.4-2.2.5-.3 1.2-.3 1.7 0l3.6 2c.7.4 1.5.3 2.1-.3l4.9-4.9c.6-.6.7-1.4.3-2.1l-2-3.5z" fill="#67c52a"/><path d="M23.5 37.7v4.4h23.8v-4.4H23.5zm0-7.8v4.4h19.6v-4.4H23.5zm0-7.9v4.4h23.8V22H23.5z" fill="#3c3c3f"/></g></switch></svg>`;
    static successIcon      = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`

    constructor() {

        super();

        this.title = SendToGodboltButton.title;
        this.innerHTML = SendToGodboltButton.icon;

        utility.apply_css(this, {
            zIndex      : 2,
            position    : 'absolute',
            top         : '5px',
            right       : '55px',
        })

        this.addEventListener(
            'click',
            () => {
                this.innerHTML = SendToGodboltButton.successIcon
                this.style.fill = 'green'

                this.onClickSend()

                window.setTimeout(() => {
                    this.innerHTML = SendToGodboltButton.icon
                    this.style.fill = 'black'
                }, 1000);
            }
        );
    }

    onClickSend() {
        let codeSectionElement = this.parentElement.parentElement

        if (codeSectionElement === undefined
        ||  codeSectionElement.tagName.match(`\w+${CodeSection.HTMLElement_name.toUpperCase()}`) === '')
            console.error("awesome-doc-code-sections.js:SendToGodboltButton::onClickSend: unexpected parent.parent element (must be an - optionaly Basic - CodeSection)")
        console.log('awesome-doc-code-sections.js:SendToGodboltButton::onClickSend: : sending ...')

        var get_configuration = function() {

            let configuration = awesome_doc_code_sections.configuration.CE.get(codeSectionElement.language)
            if (configuration === undefined)
                console.error(`awesome-doc-code-sections.js:SendToGodboltButton::onClickSend: missing configuration for language [${codeSectionElement.language}]`)
            return configuration
        }
        var get_ce_options = function() {
            return typeof codeSectionElement.ce_options === 'undefined' || codeSectionElement.ce_options === undefined
                ? get_configuration()
                : codeSectionElement.ce_options
        }
        var get_language = function() {
        //      hljs    https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md
        //  vs. godbolt https://godbolt.org/api/languages
            return ce_API.languages.includes(get_ce_options().language)
                ? get_ce_options().language
                : get_configuration().language
        }
        var get_code = function() {
            let result = codeSectionElement.ce_code || codeSectionElement.code
            if (result === undefined)
                console.error(`awesome-doc-code-sections.js:SendToGodboltButton::onClickSend: missing code`)
            return result
        }

        // build request as JSon
        let data = {
            "sessions": [{
                "id": 1,
                "language": get_language(),
                "source": get_code(),
                "compilers":  [
                    {
                        "id": get_ce_options().compiler_id || get_configuration().compiler_id,
                        "libs": get_ce_options().libs || [ ],
                        "options": get_ce_options().compilation_options || get_configuration().default_options
                    }
                ],
                "executors": [{
                    "compiler":
                    {
                        "id": get_ce_options().compiler_id || get_configuration().compiler_id,
                        "libs": get_ce_options().libs || [ ],
                        "options": get_ce_options().compilation_options || get_configuration().default_options
                    }
                    // TODO: exec
                }]
            }]
        };
        // CE /clientstate API
        ce_API.open_in_new_tab(data)
    }
}
customElements.define(SendToGodboltButton.HTMLElement_name, SendToGodboltButton, {extends: 'button'});

class BasicCodeSection extends HTMLElement {
// Basic code section (meaning, no metadata parsing), with synthax-coloration provided by highlightjs
// Additionaly, the language code language can be forced (`code_language` parameter, or `language` attributes),
// otherwise it is automatically detected based on fetched code content
//
// <BasicCodeSection language='cpp'>[some code here]</BasicCodeSection>

    static HTMLElement_name = 'awesome-doc-code-sections_basic-code-section'
    type = BasicCodeSection

    constructor(code, language) {
        super();

        this.code = code
        this._language = language
    }

    on_critical_internal_error(error = "") {

        console.error(
            `awesome-doc-code-sections.js:BasicCodeSection: on_critical_internal_error : fallback rendering
            ${error}`
        )

        if (!this.isConnected)
            return

        let error_element = document.createElement('p')
            error_element.textContent = error || `awesome-doc-code-sections:BasicCodeSection: unknown error`
        utility.apply_css(error_element, {
            color: "red",
            "border" : "2px solid red"
        })
        this.appendChild(error_element)
    }

    #shadow_root_callback(childrens) {
        console.log(`BasicCodeSection::shadowRoot : [${this.textContent}]`)
        this.replaceWith(new this.type(this.textContent, this._language))
    }

    connectedCallback() {
        try {
            this.code = this.code || this.textContent || this.getAttribute('code')
            this._language = this._language || this.getAttribute('language') || undefined
            if (this._language)
                this._language = this._language.replace('language-', '')

            if (!this.code || this.code.length == 0) {
                let _this = this
                utility.create_shadowroot_slot(this, function(){ _this.#shadow_root_callback()})
            }
            else
                this.load()
        }
        catch (error) {
            console.log(`${error}`)
            this.on_critical_internal_error(error)
        }
    }

    load() {

        utility.apply_css(this, {
            display:    'flex',
            alignItems: 'stretch',
            boxSizing:  'border-box',
            width:      '100%'
        })

        // code content
        let code_node = document.createElement('pre');
        utility.apply_css(code_node, {
            zIndex:     1,
            position:   'relative',
            boxSizing:  'border-box',
            top:        0,
            left:       0,
            width:      '100%',
            margin:     0
        })
            
        let code = document.createElement('code');
            code.textContent = this.code
        utility.apply_css(code, {
            height:     '100%',
            width:      'auto',
            boxSizing:  'border-box'
        })
        code_node.appendChild(code)

        if (this._language)
            code.classList.add('hljs', `language-${this.language}`);
        hljs.highlightElement(code)

        // buttons : copy-to-clipboard
        let copy_button = new CopyToClipboardButton()
            copy_button.style.zIndex = code_node.style.zIndex + 1
        code_node.appendChild(copy_button)

        // buttons : send-to-godbolt (only if a CE configuration for that language exists)
        let code_hljs_language = BasicCodeSection.get_code_hljs_language(code)
        if (this._language !== undefined && code_hljs_language !== this._language) // unlikely
            console.warn(`awesome-doc-code-sections.js:CodeSection::load : incompatible language specification (user-specified is ${this._language}, detected is ${code_hljs_language})`)
        
        if (// ce_API.languages.has(code_hljs_language)
            awesome_doc_code_sections.configuration.CE.has(code_hljs_language)) {
            let CE_button = new SendToGodboltButton
                CE_button.style.zIndex = code_node.style.zIndex + 1
            code_node.appendChild(CE_button)
        }

        this.innerHTML = code_node.outerHTML;
        awesome_doc_code_sections.auto_hide_buttons_resize_observer.observe(this.firstChild /* code_node */)
    }

    static get_code_hljs_language(code_tag) {
        if (code_tag === undefined || code_tag.tagName !== 'CODE')
            console.error(`awesome-doc-code-sections.js:CodeSection::get_code_hljs_language(): bad input`)

        let result = code_tag.classList.toString().replace(/hljs language-/g, '')
        if (result.indexOf(' ') !== -1)
            console.error(`awesome-doc-code-sections.js:CodeSection::get_code_hljs_language(): ill-formed code hljs classList`)
        return result
    }

    get language() {

        if (this._language !== undefined)
            return this._language

        let code = $(this).find("pre code")
        if (code.length == 0)
            console.error(`awesome-doc-code-sections.js:CodeSection::language(get): ill-formed element (expect pre>code as childrens)`)
        return BasicCodeSection.get_code_hljs_language(code[0])
    }

    static PlaceholdersTranslation = {
        type : BasicCodeSection,
        query : `div[class=${BasicCodeSection.HTMLElement_name}]`,
        translate : (element) => {
            let language = element.getAttribute('language')
            let code = element.textContent
                        .replace(/^\s+/g, '').replace(/\s+$/g, '') // remove enclosing empty lines
            let node = new BasicCodeSection(code, language);
            if (language)
                node.setAttribute('language', language)
            return node
        }
    }
}
customElements.define(BasicCodeSection.HTMLElement_name, BasicCodeSection);

class CodeSection extends BasicCodeSection {
// Code section, with synthax-coloration provided by highlightjs
// Additionaly, the language code language can be forced (`code_language` parameter, or `language` attributes),
// otherwise it is automatically detected based on fetched code content
//
// <CodeSection language='cpp'>[some code here]</CodeSection>

    type = CodeSection

    static HTMLElement_name = 'awesome-doc-code-sections_code-section'
    static loading_animation = (function(){
    // TODO: loading_animation.* as opt-in, inline (raw github data) as fallback
        const loading_animation_fallback_url = 'https://raw.githubusercontent.com/GuillaumeDua/awesome-doc-code-sections/main/resources/images/loading_animation.svg'
        let loading_animation = document.createElement('img');
            loading_animation.src = loading_animation_fallback_url
        utility.apply_css(loading_animation, {
            contain             : 'strict',
            border              : '1px solid var(--primary-color)',
            borderRadius        : '5px',
            width               : '100%',
            display             : 'none' // hidden by default
        })
        return loading_animation
    })()

    get ce_code() {
        return this.parsed_code.ce_code
    }
    get ce_options() {
        return this.parsed_code.ce_options
    }

    constructor(code, language) {
        super(code, language)
    }

    load() {
        let parsed_code = undefined
        try             { parsed_code = new ParsedCode(this.code, this._language) }
        catch (error)   { this.on_critical_internal_error(error); return }

        this.code = parsed_code.code
        this.parsed_code = parsed_code

        super.load()

        this.#initialize_panels()
        if (this.parsed_code.ce_options.add_in_doc_execution)
            this.fetch_execution()
    }

    #initialize_panels() {
        this.left_panel = this.firstChild
        if (this.left_panel === undefined || this.left_panel.tagName !== 'PRE')
            console.error('awesome-doc-code-sections.js:CodeSection::add_execution_panel : ill-formed firstChild')

        // right panel
        this.right_panel = document.createElement('div')
        this.appendChild(this.right_panel)

        utility.apply_css(this.right_panel, {
            display:    'none',
            alignItems: 'stretch',
            boxSizing:  'border-box',
            position:   'relative',
            top:        0,
            left:       0,
            width:      '50%',
            margin:     0
        })
        // right panel: loading
        this.loading_animation_element = this.right_panel.appendChild(CodeSection.loading_animation.cloneNode())
        this.loading_animation_element.style.display = 'block'
        // right panel: execution
        this.execution_element = document.createElement('div') // placeholder
        utility.apply_css(this.execution_element, {
            width:          '100%',
            paddingTop:     '1px',
            display:        'none' // hidden by default
        })
        this.right_panel.appendChild(this.execution_element)
    }
    fetch_execution() {

        this.left_panel.style.width = '50%'
        this.right_panel.style.display = 'flex'
        this.execution_element.style.display = 'none'
        this.loading_animation_element.style.display = 'flex'

        // right panel: replace with result
        ce_API.fetch_execution_result(this.ce_options, this.ce_code)
            .catch((error) => {
                this.on_critical_internal_error(`CodeSection: ce_API.fetch_execution_result failed [${error}]`)
            })
            .then((result) => {

                // CE header: parse & remove
                let regex = new RegExp('# Compilation provided by Compiler Explorer at https://godbolt.org/\n\n(# Compiler exited with result code (-?\\d+))')
                let regex_result = regex.exec(result)

                if (regex_result === null || regex_result.length != 3) {
                    return {
                        value : result,
                        error : 'unknown',
                        return_code : -1
                    }
                }
                
                return {
                    value : result.substring(regex_result[0].length - regex_result[1].length), // trim off header
                    error : undefined,
                    return_code : regex_result[2]
                }
            })
            .then((result) => {

                let execution_element = new BasicCodeSection(result.value)
                    execution_element.title = 'Compilation provided by Compiler Explorer at https://godbolt.org/'
                    execution_element.style.borderTop = '2px solid ' + (result.return_code == -1 ? 'red' : 'green')

                this.execution_element.replaceWith(execution_element)
                this.execution_element = execution_element

                this.loading_animation_element.style.display = 'none'
                this.execution_element.style.display = 'flex'
            })
    }

    static PlaceholdersTranslation = { // TODO: remove redundancy (with BasicCodeSection)
        type : CodeSection,
        query : `div[class=${CodeSection.HTMLElement_name}]`,
        translate : (element) => {
            let language = element.getAttribute('language')
            let code = element.textContent
                        .replace(/^\s+/g, '').replace(/\s+$/g, '') // remove enclosing empty lines
            let node = new CodeSection(code, language);
            if (language)
                node.setAttribute('language', language)
            return node
        }
    }
}
customElements.define(CodeSection.HTMLElement_name, CodeSection);

class RemoteCodeSection extends CodeSection {
// Fetch some code as texts based on the `code_url` parameter (or `url` attribute),
// and creates a code-sections (pre/code) with synthax-color provided by hightlighthjs
// Additionaly, the language code language can be forced (`code_language` parameter, or `language` attributes),
// otherwise it is automatically detected based on fetched code content

    type = RemoteCodeSection

    static HTMLElement_name = 'awesome-doc-code-sections_remote-code-section'

    constructor(code_url, language) {
        super(undefined, language); // defered initialization in `#load`
        this.code_url = code_url;
    }

    connectedCallback() {
        this.code_url = this.code_url || this.getAttribute('url')
        this._language = this._language || this.getAttribute('language') || undefined
        if (this._language)
            this._language = this._language.replace('language-', '')

        if (!this.code_url) {
            super.on_critical_internal_error('RemoteCodeSection : missing mandatory [url] attribute')
            return
        }
        if (!this._language && this.code_url) { // perhaps nothing is better than that ... ?
            this._language = RemoteCodeSection.get_url_extension(this.code_url)
            console.log(`awesome-doc-code-sections.js:RemoteCodeSection : fallback language from url extension : [${this._language}]`)
        }
        this.load()
    }

    static get_url_extension(url) {
        try {
            return url.split(/[#?]/)[0].split('.').pop().trim();
        }
        catch (error) {
            return undefined
        }
    }

    load() {

        let apply_code = (code) => {
        // defered initialization
            this.code = code
            super.load();
        }

        let _this = this
        let xhr = new XMLHttpRequest();
            xhr.open('GET', this.code_url);
            xhr.onerror = function() {
                _this.on_critical_internal_error(`RemoteCodeSection: network Error`)
            };
            xhr.onload = function() {

                if (xhr.status != 200) {
                    _this.on_critical_internal_error(`RemoteCodeSection: bad request status ${xhr.status}`)
                    return;
                }
                apply_code(xhr.responseText)
            };
            xhr.send();
    }

    static PlaceholdersTranslation = { // TODO: remove redundancy (with BasicCodeSection)
        type : RemoteCodeSection,
        query : `div[class=${RemoteCodeSection.HTMLElement_name}]`,
        translate : (element) => {
            if (element.getAttribute('url') === undefined) {
                console.error('awesome-doc-code-sections.js: PlaceholdersTranslation(RemoteCodeSection): div/code_example is missing an url attribute')
                return undefined; // ill-formed, skip this element but continue iteration
            }
            let url = element.getAttribute('url')
            let language = element.getAttribute('language')
            // let language = (element.classList.length != 1 ? element.classList[1] : undefined);

            let node = new RemoteCodeSection(url, language);
            if (url)        node.setAttribute('url', url);
            if (language)   node.setAttribute('language', language)
            return node
        }
    }
}
customElements.define(RemoteCodeSection.HTMLElement_name, RemoteCodeSection);

class ThemeSelector {
// For themes, see https://cdnjs.com/libraries/highlight.js
// The default one is the first one
//
// Use theme name, without light or dark specification
//
// Example:
//
// <select class="code_theme_selector">
//     <option class="code_theme_option" value="tokyo-night"></option>
//     <option class="code_theme_option" value="base16/google"></option>
// </select>
//
// Current limitation: not a dedicated HTMLElement
//
// Note that an HTML placeholder for stylesheet is necessary/mandatory
//   <link id='code_theme_stylesheet' rel="stylesheet" crossorigin="anonymous" referrerpolicy="no-referrer" />

    static HTMLElement_name = 'awesome-doc-code-sections_theme-selector'
    static url_base = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/'
    static url_ext = '.min.css'
    static dark_or_light_placeholder = '{dark_or_light}'
    static stylesheet_HTML_placeholder_id = 'code_theme_stylesheet'

    static BuildUrl(arg) {
        if (typeof arg !== 'string' && ! arg instanceof String) {
            console.error('ThemeSelector.BuildUrl: invalid argument')
            return
        }
        return ThemeSelector.url_base
            + arg + '-'
            + ThemeSelector.dark_or_light_placeholder
            + ThemeSelector.url_ext
        ;
    }

    static check_stylesheet_HTML_placeholder() {

        var style_placeholder = document.getElementById(ThemeSelector.stylesheet_HTML_placeholder_id)
        if (style_placeholder === undefined || style_placeholder === null)
            console.error(
                `awesome-doc-code-sections.js:ThemeSelector : missing stylesheet HTML placeholder\n
                <link id="${ThemeSelector.stylesheet_HTML_placeholder_id}" rel="stylesheet"/>`
            )
    }
    static Initialize = function() {

        let onOptionSelectedChange = function() {
            let selected_option = $(this).find('option:selected')
            console.log('awesome-doc-code-sections.js:ThemeSelector : switching to ' + selected_option.text())

            let html_node = document.getElementsByTagName('html')[0];

            let theme_color = (html_node.classList.contains('dark-mode') ? 'dark' : 'light')
            let new_stylesheet_url = ThemeSelector.BuildUrl(selected_option.text())
                .replace(ThemeSelector.dark_or_light_placeholder, theme_color)
            console.log('awesome-doc-code-sections.js:ThemeSelector : switching to stylesheet : ' + new_stylesheet_url)
            document.getElementById('code_theme_stylesheet').href = new_stylesheet_url

            hljs.highlightAll()
        }

        $(document).ready(function() {
            console.log('awesome-doc-code-sections.js:ThemeSelector : initializing themes selector ...')

            ThemeSelector.check_stylesheet_HTML_placeholder()

            var options = $('body').find('select[class=code_theme_selector] option[class=code_theme_option]');
            options.each((index, element) => {

                let value = element.getAttribute('value')
                if (element === undefined || element == null) {
                    console.error('ThemeSelector: invalid argument')
                    return
                }

                element.textContent = value
            })

            var selectors = $('body').find('select[class=code_theme_selector]');
            selectors.each((index, element) => {
                element.onchange = onOptionSelectedChange
                element.onchange() // initialization
            })
        })
    }
}
// Theme style switch
const highlightjs_stylesheet_href_mutationObserver = new MutationObserver((mutationsList, observer) => {

    mutationsList.forEach(mutation => {
        if (mutation.attributeName !== 'href')
            return;

        let code_stylesheet = document.getElementById('code_theme_stylesheet');
        if (mutation.oldValue === code_stylesheet.href ||
            code_stylesheet.href === window.location.href)
            return
        console.log('awesome-doc-code-sections.js:onHighlightjsHrefChange: Switching highlighthjs stylesheet \n from : ' + mutation.oldValue + '\n to   : ' + code_stylesheet.href)

        hljs.highlightAll();
    })
});
highlightjs_stylesheet_href_mutationObserver.observe(
    document.getElementById(ThemeSelector.stylesheet_HTML_placeholder_id),
    {
        attributes: true,
        attributeFilter: [ 'href' ],
        attributeOldValue: true
    }
)

// ============

awesome_doc_code_sections.HTML_elements = {}
awesome_doc_code_sections.HTML_elements.CopyToClipboardButton = CopyToClipboardButton
awesome_doc_code_sections.HTML_elements.SendToGodboltButton   = SendToGodboltButton
awesome_doc_code_sections.HTML_elements.BasicCodeSection      = BasicCodeSection
awesome_doc_code_sections.HTML_elements.CodeSection           = CodeSection
awesome_doc_code_sections.HTML_elements.RemoteCodeSection     = RemoteCodeSection
awesome_doc_code_sections.ThemeSelector = ThemeSelector

// TODO: make sure that doxygen elements are also still clickable with pure doxygen (not doxygen-awesome-css)
awesome_doc_code_sections.initialize_doxygenCodeSections = function() {
// Replace code-sections generated by doxygen (and possibly altered by doxygen-awesome-css)
// like `<pre><code></code></pre>`,
// or placeholders like `\include path/to/example.ext`

    // DoxygenAwesomeFragmentCopyButton wraps code in
    //  div[class="doxygen-awesome-fragment-wrapper"] div[class="fragment"] div[class="line"]
    // otherwise, default is
    //  div[class="fragment"] div[class="line"]

    // clickable documentation elements are :
    //  div[class="doxygen-awesome-fragment-wrapper"] div[class="fragment"] div[class="line"]
    //      <a class="code" href="structcsl_1_1ag_1_1size.html">csl::ag::size&lt;A&gt;::value</a>

    let doc_ref_links = new Map(); // preserve clickable documentation reference links

    var place_holders = $('body').find('div[class=doxygen-awesome-fragment-wrapper]');
    console.log(`awesome-doc-code-sections.js:initialize_doxygenCodeSections : replacing ${place_holders.length} elements ...`)
    place_holders.each((index, value) => {

        let lines = $(value).find('div[class=fragment] div[class=line]')

        // WIP: keep doc ref links
        let links = lines.find('a[class="code"]')
        links.each((index, value) => {
            doc_ref_links.set(value.textContent, value.href)
        })
        // /WIP

        let code = $.map(lines, function(value) { return value.textContent }).join('\n')
        let node = new CodeSection(code, undefined);
            $(value).replaceWith(node)
    })

    var place_holders = $('body').find('div[class=fragment]')
    console.log(`awesome-doc-code-sections.js:initialize_doxygenCodeSections : replacing ${place_holders.length} elements ...`)
    place_holders.each((index, value) => {

        let lines = $(value).find('div[class=line]')

        // WIP
        let links = lines.find('a[class="code"]')
        links.each((index, value) => {
            doc_ref_links.set(value.textContent, value.href)
        })
        // /WIP

        let code = $.map(lines, function(value) { return value.textContent }).join('\n')
        let node = new CodeSection(code, undefined);
            $(value).replaceWith(node)
    })

    // WIP: documentation reference links
    doc_ref_links.forEach((values, keys) => {
        // console.log(">>>>>>> " + value.href + " => " + value.textContent)
        console.log(">>>>>>> " + values + " => " + keys)
    })

    var place_holders = $('body').find('awesome-doc-code-sections_code-section pre code') // span or text
    place_holders.filter(function() {
        return $(this).text().replace(/toto/g, '<a href=".">toto</a>');
      })
}
awesome_doc_code_sections.initialize_PreCodeHTMLElements = function() {

    $('body').find('pre code').each((index, value) => { // filter

        if ($(value).parent().parent().prop('nodeName').toLowerCase().startsWith("awesome-doc-code-sections_"))
            return

        let existing_node = $(value).parent()

        let language = value.getAttribute('language')
        let code = existing_node.text()

        let node = new CodeSection(code, language);
            node.setAttribute('language', language)
        existing_node.replaceWith(node);
    })

    // TODO: same for only code elements ?
}

awesome_doc_code_sections.options = new class{

    doxygen_awesome_css_compatibility   = false
    pre_code_compatibility              = false
    auto_hide_buttons                   = false
    toggle_dark_mode                    = (typeof DoxygenAwesomeDarkModeToggle !== 'undefined')

    configure = function(obj) {
        if (obj === undefined || obj === null)
            return
        this.doxygen_awesome_css_compatibility  = obj.doxygen_awesome_css_compatibility || this.doxygen_awesome_css_compatibility
        this.pre_code_compatibility             = obj.pre_code_compatibility            || this.pre_code_compatibility
        this.auto_hide_buttons                  = obj.auto_hide_buttons                 || this.auto_hide_buttons
        this.toggle_dark_mode                   = obj.toggle_dark_mode                  || this.toggle_dark_mode
    }
}()

awesome_doc_code_sections.initialize = function() {
   
    $(function() {
        $(document).ready(function() {

            console.log('awesome-doc-code-sections.js:initialize: initializing code sections ...')

            if (awesome_doc_code_sections.options.toggle_dark_mode) {
                if (undefined === awesome_doc_code_sections.ToggleDarkMode)
                    console.error(
                        'awesome-doc-code-sections.js:initialize: options toggle_dark_mode set to true, but awesome_doc_code_sections.ToggleDarkMode is undefined\n' +
                        'Did you forget to include awesome-doc-code-sections_dark-mode.js ?'
                    )
                else
                    awesome_doc_code_sections.ToggleDarkMode.initialize()
            }

            awesome_doc_code_sections.ThemeSelector.Initialize()

            let ReplaceHTMLPlaceholders = (translation) => {

                let elements = $('body').find(translation.query)
                console.log(`awesome-doc-code-sections.js: ReplaceHTMLPlaceholders(${translation.type.name}) : replacing ${elements.length} element(s) ...`)
                elements.each((index, element) => {
                    let translated_element = translation.translate(element)
                    if (translated_element)
                        element.replaceWith(translated_element)
                })
            }
            [   // replace placeholders with proper HTML elements
                awesome_doc_code_sections.HTML_elements.BasicCodeSection,
                awesome_doc_code_sections.HTML_elements.CodeSection,
                awesome_doc_code_sections.HTML_elements.RemoteCodeSection
            ].forEach(html_component => ReplaceHTMLPlaceholders(html_component.PlaceholdersTranslation))

            if (awesome_doc_code_sections.options.doxygen_awesome_css_compatibility === true) {
                console.log(`awesome-doc-code-sections.js:initialize: doxygen-awesome-css compatiblity ...`)
                awesome_doc_code_sections.initialize_doxygenCodeSections()
            }

            if (awesome_doc_code_sections.options.pre_code_compatibility) {
                console.log(`awesome-doc-code-sections.js:initialize: existing pre-code compatiblity ...`)
                awesome_doc_code_sections.initialize_PreCodeHTMLElements();
            }
        })
    })
}

// TODO: module
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export
// export { awesome_doc_code_sections }
// import adcs from '/path/to/awesome-doc-code-sections.js'
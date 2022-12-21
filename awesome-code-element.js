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

// awesome-code-element
//
//  Brief:  Standalone HTML element to represents a code section. Executable, highlighted & dynamically modifiable
//          Lightweight, out-of-the-box, Compiler-Explorer integration in websites & documentations
//          Doxygen + doxygen-awesome-css + highlightjs == <3 (awesome-code-element)
//          Note that neither `Doxygen` nor `doxygen-awesome-css` are mandatory dependencies
//
// Code sections, with extra features :
//  - load content from
//      - JS constructor parameter
//      - HTML
//          - attribute `code` or `url` (for remote-located resource, such as <div class='code-section' url='https://some/remote/path/to/file.cpp'></div>)
//          - inner TextContent
//  - synthax-coloration provided by highlightjs,
//      - theme selector
//  - toggle dark/light theme
//  - buttons :
//      - send-to-godbolt
//      - copy-to-clipboard
//      - (doxygen-awesome-css compatibility) toggle light/dark mode

// ----------------------------------------------------------------------------------------------------------------------------

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
// TODO: make Initialize_DivHTML_elements generic
// TODO: Global option: force fallback language to ... [smthg]
// TODO: per-codeSection CE configuration (local override global)
// TODO: toggle technical info/warning logs
// use ?? vs ||
// TODO: execution -> pre.code rather than a new CS (+copy-to-cpliboard button)
// TODO: buttons: bound to CS left-panel, not the element itself ?
// TODO: check encapsulation/visibility
// TODO: type = AwesomeCodeElement.details.${name} ?
// TODO: update error messages -> ${classname}.name ?
// TODO: named parameters
// TODO: static vs. const ?
// TODO: element name consistency ?
// TODO: use arrow function: automatically captures the `this` value of the enclosing scope (rather than _this)
// TODO: alias awesome-code-element -> ace ?
// TODO: HTML_elements_name -> ace_${name}
// TODO: check shadowroot-callbacks
// TODO: dark_or_light -> color_scheme
// TODO: console.xxxx -> replace '\n\t' by ','-seperated arguments ?
// TODO: remove useless funcs, class (if any)
// TODO: awesome-code-element.js: sub-modules aggregator
// TODO: style : px vs. em
// TODO: default policies : language, toggle_execution, toggle_parsing, presentation, etc.
// TODO: default stylesheet for CS + injection (+ remove utils.apply_css)

export { AwesomeCodeElement as default }

// ----------------------------------------------------------------------------------------------------------------------------

if (typeof hljs === 'undefined')
    console.error('awesome-code-element.js: depends on highlightjs, which is missing')
if (typeof jQuery === 'undefined')
    console.error('awesome-code-element.js: depends on jQuery, which is missing')

const AwesomeCodeElement = {
    API : {
        configuration : {
            CE : {}
        }
    },
    details : {}
}

// ==================
// details.containers

AwesomeCodeElement.details.containers = {}
AwesomeCodeElement.details.containers.transformed_map = class extends Map {
// Similar to `Map`, with non-mandatory translation for key, mapped
// example: upper-case keys
// value = new transformed_map(
//     [ ['a', 42 ]],
//     {
//         key_translator: (key) => { return key.toUpperCase() }
//     }
// );

    key_translator      = undefined
    mapped_translator   = undefined

    constructor(values, { key_translator, mapped_translator }  = {}) {

        if (values)
            values = values.map((item) => {
                let [ key, mapped ] = item
                if (key_translator)
                    key = key_translator(key)
                if (mapped_translator)
                    mapped = mapped_translator(mapped)
                return [ key, mapped ]
            })
        super(values)

        this.key_translator     = key_translator
        this.mapped_translator  = mapped_translator
    }
    get(key) {
        if (this.key_translator)
            key = this.key_translator(key)
        return super.get(key)
    }
    set(key, mapped) {
        if (this.key_translator)
            key = this.key_translator(key)
        if (this.mapped_translator)
            mapped = this.mapped_translator(mapped)
        super.set(key, mapped)
        return this
    }
    has(key) {
        if (this.key_translator)
            key = this.key_translator(key)
        return super.has(key)
    }
}
AwesomeCodeElement.API.CE_ConfigurationManager = class extends AwesomeCodeElement.details.containers.transformed_map {
// similar to a Map, but use `hljs.getLanguage(key)` as a key translator
    constructor(values) {
        super(values, {
            key_translator: (key) => {
            // transform any language alias into a consistent name
                let language = hljs.getLanguage(key)
                if (!language)
                    console.warn(`ce_configuration: invalid language [${key}]`)
                return language ? language.name : undefined
            },
            mapped_translator : (mapped) => {
                if (!mapped || !mapped.compiler_id)
                    throw new Error(`ce_configuration: missing mandatory field '.compiler_id' in configuration ${mapped}`)
                return mapped
            }
        })
    }
    set(key, mapped) {
        if (this.has(key)) {
            let language = hljs.getLanguage(key)
            console.warn(`ce_configuration_manager: override existing configuration for language [${key}]. Translated name is [${language.name}], aliases are [${language.aliases}]`)
        }
        super.set(key, mapped)
    }
}
// key   : language (name or alias. ex: C++, cpp, cc, c++ are equivalent)
// value : {
//      language,       // not mandatory, if same as key. Refers to https://godbolt.org/api/languages
//      compiler_id,
//      default_options // not mandatory
// }

// =================
// API.configuration

AwesomeCodeElement.API.configuration = {
    CE                                  : new AwesomeCodeElement.API.CE_ConfigurationManager,
    hljs                                : {
        version : '11.6.0', // TODO: automate hljs import (avoid dependencies mismatch)
        // default_theme:   If no theme-selector, then this is the default one.
        //                  Otherwise, the first valid option of the first theme-selector is the default
        default_theme   : 'tokyo-night'  // supports dark/light variations
    },
    doxygen_awesome_css_compatibility   : false,
    pre_code_compatibility              : false,
    auto_hide_buttons                   : false, // TODO: rename force_ or always_
    toggle_dark_mode                    : (typeof DoxygenAwesomeDarkModeToggle !== 'undefined') // true by default if doxygen-awesome-css_dark-mode is detected
}
AwesomeCodeElement.API.configure = (arg) => {
    if (!arg)
        throw new Error('AwesomeCodeElement.API.configuration.configure: invalid argument')

    AwesomeCodeElement.details.utility.unfold_into({
        target : AwesomeCodeElement.API.configuration,
        properties : arg
    })
}

// ================
// internal details

AwesomeCodeElement.details.ParsedCode = class ParsedCode {
// TODO: @awesome-code-element::keep : keep tag anyway as comment (for documentation purpose)

// @awesome-code-element::CE={
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
// @awesome-code-element::skip::block::begin,end : range to [skip] (no parsing, removed from documentation & execution)
// @awesome-code-element::skip::line             : line  to [skip]
// @awesome-code-element::show::block::begin,end : range to [show] (documentation side only. The rest is still part of the execution code)
//                                                      if there is at least one occurence, the rest is by default hidden
// @awesome-code-element::show::line             : line  to [show]
//                                                      if there is at least one occurence, the rest is by default hidden

    static tag = '// @awesome-code-element'

    raw = undefined
    to_display = undefined
    to_execute = undefined
    ce_options = undefined

    constructor(code_content, language) {

        // apply default configuration for given - non-mandatory - language
        if (AwesomeCodeElement.API.configuration.CE.has(language))
            this.ce_options = AwesomeCodeElement.API.configuration.CE.get(language)

        if (!code_content || code_content.length === 0)
            return // default construction

        this.raw = code_content

        this.#parse()
        this.#apply_ce_transformations()
    }

    #parse() {

        let code_content = this.raw

        // CE options
        let regexp = new RegExp(`^\\s*?${ParsedCode.tag}::CE=({(.*?\n\\s*//.*?)+}\n?)`, 'gm')
        let matches = [...this.raw.matchAll(regexp)] // expect exactly 1 match
        if (matches.length > 1)
            console.error(`awesome-code-element.js:ParsedCode::constructor: multiples CE configurations`)

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
                ...(this.ce_options || {}),
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

        this.to_display = (code_only_show !== "" ? code_only_show : code_content)
        this.to_execute = code_content
    }
    #apply_ce_transformations() {

        // includes_transformation
        if (this.ce_options && this.ce_options.includes_transformation) {
            this.ce_options.includes_transformation.forEach((value) => {
                // replace includes

                const regex = new RegExp(`^(\\s*?\\#.*?[\\"|\\<"].*?)(${value[0]})(.*?[\\"|\\>"])`, 'gm')
                this.to_execute = this.to_execute.replace(regex, `$1${value[1]}$3`)
            })
        }
    }
}
AwesomeCodeElement.details.remote = {}
AwesomeCodeElement.details.remote.resources_cache = class {
    #remote_files = new Map() // uri -> text

    static async #fetch_remote_file(uri) {

        try {
            let response = await fetch(uri)
            return await response.text()
        }
        catch (error) {
            console.error(
                "awesome-code-element.js:remote_resources_cache: error\n" +
                "\t" + error
            )
        }
    }

    async get(uri) {
        if (! this.#remote_files.has(uri)) {
            this.#remote_files.set(
                uri,
                await AwesomeCodeElement.details.remote.resources_cache.#fetch_remote_file(uri)
            )
        }
        return this.#remote_files.get(uri)
    }
}
AwesomeCodeElement.details.remote.CE_API = class CE_API {
// fetch CE API informations asynchronously

    static #static_initializer = (async function(){
        CE_API.#fetch_languages()
        // AwesomeCodeElement.details.remote.CE_API.#fetch_compilers() // not used for now, disabled to save cache memory
    })()

    // cache
    static languages = undefined
    static compilers = undefined
    static #remote_files_cache = new AwesomeCodeElement.details.remote.resources_cache()

    static async #fetch_languages() {
    // https://godbolt.org/api/languages
        try {
            let response = await fetch('https://godbolt.org/api/languages')
            let datas = await response.text()

            let text = datas.split('\n')
            text.shift() // remove header
            CE_API.languages = text.map((value) => {
            // keep only ids
                return value.slice(0, value.indexOf(' '))
            })
        }
        catch (error) {
            console.error(`AwesomeCodeElement.details.remote.CE_API: godbolt API exception (fetch_languages)\n\t${error}`)
        }
    }
    static async #fetch_compilers() {
    // https://godbolt.org/api/compilers
        try {
            let response = await fetch('https://godbolt.org/api/compilers')
            let datas = await response.text()

            let text = datas.split('\n')
            text.shift() // remove header
            CE_API.languages = text.map((value) => {
            // keep only ids
                return value.slice(0, value.indexOf(' '))
            })
        }
        catch (error) {
            console.error(`AwesomeCodeElement.details.remote.CE_API: godbolt API exception (fetch_compilers)\n\t${error}`)
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
            throw new Error('awesome-code-element.js::CE_API::fetch_execution_result: invalid argument, missing .compiler_id')

        // POST /api/compiler/<compiler-id>/compile endpoint is not working with remote header-files in `#include`s PP directions
        // https://github.com/compiler-explorer/compiler-explorer/issues/4190
        let matches = [...code.matchAll(/^\s*\#\s*include\s+[\"|\<](\w+\:\/\/.*?)[\"|\>]/gm)].reverse()
        let promises_map = matches.map(async function(match) {

            let downloaded_file_content = await CE_API.#remote_files_cache.get(match[1])
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
AwesomeCodeElement.details.utility = class utility {
// TODO: move to another module

    static html_codec = class html_codec {
        static entities = new Array(
           [ '&gt;', '>' ],
           [ '&lt;', '<' ],
           [ '&amp;', '&' ],
           [ '&quot;', '"' ]
        )
        static decode = (text) => {

            html_codec.entities.forEach(([key, value]) => text = text.replaceAll(key, value))
            return text
        }
        static encode = (text) => {
            html_codec.entities.forEach(([value, key]) => text = text.replaceAll(key, value))
            return text
        }
    }

    static unfold_into({target, properties = {}}) {
        if (!target)
            throw new Error(`AwesomeCodeElement.details.utility: invalid argument [target] with value [${target}]`)
        for (const property in properties) {
            // Map
            if (target[property]
            &&  target[property] instanceof Map && properties[property] instanceof Map) {
                properties[property].forEach((value, key) => target[property].set(key, value)); // no unfolding here but assign, to preserve
                return
            }
            // object
            if (target[property]
            && typeof target[property] === 'object' && typeof properties[property] === 'object') {
                utility.unfold_into({ target: target[property], properties : properties[property]})
            }
            // assign
            target[property] = properties[property];
        }
    }
    static apply_css(element, properties) {
        AwesomeCodeElement.details.utility.unfold_into({target : element.style, properties })
    }
    static create_shadowroot_slot(element, when_childrens_attached) {

        if (!element.shadowRoot)
            element.attachShadow({ mode: 'open' });
        element.shadowRoot.innerHTML = `<slot></slot>`;
        const slot = element.shadowRoot.querySelector('slot');
    
        let callback = (event) => {
            const childrens = event.target.assignedElements();
            when_childrens_attached(childrens)
        }
        slot.addEventListener('slotchange', callback, { once: true });
        return { // accessor
            remove: () => {
                slot.removeEventListener('slotchange', callback);
                element.shadowRoot.innerHTML = ""
                element.outerHTML = element.outerHTML
            }
        }
    }
    static remove_shadowroot(element) {

        element.shadowRoot.innerHTML = ""
        element.outerHTML = element.outerHTML
    }
    static remove_all_childrens(element) {
        while (element.firstChild)
            element.removeChild(element.lastChild)
    }
    static is_scrolling(element) {
        return {
            horizontally    : element.scrollWidth  > element.clientWidth,
            vertically      : element.scrollHeight > element.clientHeight
        }
    }
    static get_url_extension(url) {
        try {
            return url.split(/[#?]/)[0].split('.').pop().trim();
        }
        catch (error) {
            return undefined
        }
    }
    static fetch_resource(url, { on_error, on_success }) {

        let xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onerror = function() {
                on_error(`AwesomeCodeElement.details.utility.fetch_resource: network error`)
            };
            xhr.onload = function() {

                if (xhr.status != 200) {
                    on_error(`AwesomeCodeElement.details.utility.fetch_resource: bad request status ${xhr.status}`)
                    return;
                }
                on_success(xhr.responseText)
            };
            xhr.send();
    }
    static make_incremental_counter_generator = function*(){
        let i = 0;
        while (true) { yield i++; }
    }
    static include({ name, url }) {

        let id = `ace-dependency_${name}`

        let element = document.getElementById(`ace-dependency_${name}`)
        if (element && element.src === url)
            return

        element = document.createElement('script');
        element.src  = url;
        element.type = 'text/javascript';
        element.defer = true;
        element.id = id
        element.setAttribute('ace-dependecy-name', name)
        return document.head.appendChild(element);
    }
}
AwesomeCodeElement.details.log_facility = class {
    
    static #default_channels = {
        debug:  console.debug,
        error:  console.error,
        info:   console.info,
        log:    console.log,
        trace:  console.trace,
        warn:   console.warn
    }
    static #empty_function = (() => {
        let value = function(){}
            value.is_explicitly_empty = true
        return value
    })()

    static is_enabled(name) {
        return Boolean(console[name])
    }
    static enable(name) {
        if (name instanceof Array) {
            name.forEach(value => log_facility.enable(value))
            return
        }
        console[name] = AwesomeCodeElement.details.log_facility.#default_channels[name]
    }
    static disable(name) {
        if (name instanceof Array) {
            name.forEach(value => AwesomeCodeElement.details.log_facility.disable(value))
            return
        }
        console[name] = AwesomeCodeElement.details.log_facility.#empty_function
    }

    static get enabled() {
        return Object.entries(AwesomeCodeElement.details.log_facility.#default_channels)
            .map(element => element[0]).filter(
                element => !Boolean(console[element].is_explicitly_empty)
            ) 
    }
    static get disabled() {
        return Object.entries(AwesomeCodeElement.details.log_facility.#default_channels)
            .map(element => element[0]).filter(
                element => Boolean(console[element].is_explicitly_empty)
            ) 
    }
}

{   // development settings
    if (location.hostname !== 'localhost')
        AwesomeCodeElement.details.log_facility.disable(['log', 'debug', 'trace'])
    console.info(`AwesomeCodeElement.details.log_facility: channels enabled: [${AwesomeCodeElement.details.log_facility.enabled}], disabled: [${AwesomeCodeElement.details.log_facility.disabled}]`)
}

// ======================
// HTML_elements : details

AwesomeCodeElement.details.HTML_elements = {}
// TODO: should be replaced by dynamic CSS at some point
AwesomeCodeElement.details.HTML_elements.resize_observer = new ResizeObserver(entries => {

    for (let entry of entries) {
        entry.target.on_resize()
    }
});

AwesomeCodeElement.details.HTML_elements.buttons = {}
AwesomeCodeElement.details.HTML_elements.buttons.copy_to_clipboard = class CopyToClipboardButton extends HTMLButtonElement {
// Copy text context of this previousSibling HTMLelement

    static HTMLElement_name = 'ace-button-copy-to-clipboard'
    static title            = "Copy to clipboard"
    static copyIcon         = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`
    static successIcon      = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`
    static successDuration  = 980

    constructor() {
        super();
        this.setAttribute('is', CopyToClipboardButton.HTMLElement_name)

        this.title = CopyToClipboardButton.title
        this.innerHTML = CopyToClipboardButton.copyIcon

        AwesomeCodeElement.details.utility.apply_css(this, {
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
                    console.info('awesome-code-element.js:CopyToClipboardButton: success');
                },
                function(error) {
                    console.error(`awesome-code-element.js:CopyToClipboardButton: failed: ${error}`);
                }
            );
            window.setTimeout(() => {
                this.style.fill = 'black'
                this.innerHTML = CopyToClipboardButton.copyIcon
            }, CopyToClipboardButton.successDuration);
        })
    }
}
customElements.define(
    AwesomeCodeElement.details.HTML_elements.buttons.copy_to_clipboard.HTMLElement_name,
    AwesomeCodeElement.details.HTML_elements.buttons.copy_to_clipboard, {extends: 'button'}
);
AwesomeCodeElement.details.HTML_elements.buttons.show_in_godbolt = class ShowInGodboltButton extends HTMLButtonElement {

    static HTMLElement_name = 'ace-button-send-to-godbolt'
    static title            = 'Try this on godbolt.org (compiler-explorer)'
    static icon             = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32"><switch><g><path d="M58.6 46.5c-.3-.5-.3-1.2 0-1.7.3-.6.7-1.3 1-2 .2-.5-.1-1-.7-1h-5.8c-.6 0-1.2.3-1.4.8-.7 1.1-1.6 2.2-2.6 3.2-3.7 3.7-8.6 5.7-13.9 5.7-5.3 0-10.2-2-13.9-5.7-3.8-3.7-5.8-8.6-5.8-13.9s2-10.2 5.8-13.9c3.7-3.7 8.6-5.7 13.9-5.7 5.3 0 10.2 2 13.9 5.7 1 1 1.9 2.1 2.6 3.2.3.5.9.8 1.4.8h5.8c.5 0 .9-.5.7-1-.3-.7-.6-1.3-1-2-.3-.5-.3-1.2 0-1.7l1.9-3.5c.4-.7.3-1.5-.3-2.1l-4.9-4.9c-.6-.6-1.4-.7-2.1-.3l-3.6 2c-.5.3-1.2.3-1.7 0-1.7-.9-3.5-1.7-5.4-2.2-.6-.2-1-.6-1.2-1.2l-1.1-3.9C40.1.5 39.5 0 38.7 0h-6.9C31 0 30.2.5 30 1.3l-1.1 3.9c-.2.6-.6 1-1.2 1.2-1.9.6-3.6 1.3-5.3 2.2-.5.3-1.2.3-1.7 0l-3.6-2c-.7-.4-1.5-.3-2.1.3l-4.9 4.9c-.6.6-.7 1.4-.3 2.1l2 3.6c.3.5.3 1.2 0 1.7-.9 1.7-1.7 3.5-2.2 5.3-.2.6-.6 1-1.2 1.2l-3.9 1.1c-.7.2-1.3.9-1.3 1.7v6.9c0 .8.5 1.5 1.3 1.7l3.9 1.1c.6.2 1 .6 1.2 1.2.5 1.9 1.3 3.6 2.2 5.3.3.6.3 1.2 0 1.7l-2 3.6c-.4.7-.3 1.5.3 2.1L15 57c.6.6 1.4.7 2.1.3l3.6-2c.6-.3 1.2-.3 1.7 0 1.7.9 3.5 1.7 5.3 2.2.6.2 1 .6 1.2 1.2l1.1 3.9c.2.7.9 1.3 1.7 1.3h6.9c.8 0 1.5-.5 1.7-1.3l1.1-3.9c.2-.6.6-1 1.2-1.2 1.9-.6 3.6-1.3 5.4-2.2.5-.3 1.2-.3 1.7 0l3.6 2c.7.4 1.5.3 2.1-.3l4.9-4.9c.6-.6.7-1.4.3-2.1l-2-3.5z" fill="#67c52a"/><path d="M23.5 37.7v4.4h23.8v-4.4H23.5zm0-7.8v4.4h19.6v-4.4H23.5zm0-7.9v4.4h23.8V22H23.5z" fill="#3c3c3f"/></g></switch></svg>`;
    static successIcon      = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`

    constructor() {

        super();
        this.setAttribute('is', ShowInGodboltButton.HTMLElement_name)

        this.title = ShowInGodboltButton.title;
        this.innerHTML = ShowInGodboltButton.icon;

        AwesomeCodeElement.details.utility.apply_css(this, {
            zIndex      : 2,
            position    : 'absolute',
            top         : '5px',
            right       : '55px',
        })

        this.addEventListener(
            'click',
            () => {
                this.innerHTML = ShowInGodboltButton.successIcon
                this.style.fill = 'green'

                this.onClickSend()

                window.setTimeout(() => {
                    this.innerHTML = ShowInGodboltButton.icon
                    this.style.fill = 'black'
                }, 1000);
            }
        );
    }

    static #make_user_options_accessor(codeSectionElement) {
        return (() => {
            return {
                configuration : function() {

                    let configuration = AwesomeCodeElement.API.configuration.CE.get(codeSectionElement.language)
                    if (configuration === undefined)
                        throw new Error(`awesome-code-element.js:ShowInGodboltButton::onClickSend: missing configuration for language [${codeSectionElement.language}]`)
                    return configuration
                },
                ce_options : function() {
                    return codeSectionElement.ce_options || this.configuration()
                },
                language : function() {
                // translate hljs into CE language
                //      hljs    https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md
                //  vs. CE      https://godbolt.org/api/languages
                    return AwesomeCodeElement.details.remote.CE_API.languages.includes(this.ce_options().language)
                        ? this.ce_options().language
                        : this.configuration().language
                },
                code : function() {
                    let result = codeSectionElement.ce_code || codeSectionElement.code
                    if (result === undefined)
                        throw new Error(`awesome-code-element.js:ShowInGodboltButton::onClickSend: missing code`)
                    return result
                }
            }
        })()
    }

    onClickSend() {
        let codeSectionElement = this.parentElement.parentElement

        if (codeSectionElement === undefined
        ||  codeSectionElement.tagName.match(`\w+${AwesomeCodeElement.API.HTML_elements.CodeSection.HTMLElement_name.toUpperCase()}`) === '')
            throw new Error('awesome-code-element.js: ShowInGodboltButton.onClickSend: ill-formed element: unexpected parent.parent element (must be a CodeSection)')
        console.info('awesome-code-element.js: ShowInGodboltButton.onClickSend: sending request ...')

        let accessor = ShowInGodboltButton.#make_user_options_accessor(codeSectionElement)

        // build request as JSon
        let data = {
            "sessions": [{
                "id": 1,
                "language": accessor.language(),
                "source": accessor.code(),
                "compilers":  [
                    {
                        "id": accessor.ce_options().compiler_id || accessor.configuration().compiler_id,
                        "libs": accessor.ce_options().libs || [ ],
                        "options": accessor.ce_options().compilation_options || accessor.configuration().default_options
                    }
                ],
                "executors": [{
                    "compiler":
                    {
                        "id": accessor.ce_options().compiler_id || accessor.configuration().compiler_id,
                        "libs": accessor.ce_options().libs || [ ],
                        "options": accessor.ce_options().compilation_options || accessor.configuration().default_options
                    }
                    // TODO: exec
                }]
            }]
        };
        // CE /clientstate API
        AwesomeCodeElement.details.remote.CE_API.open_in_new_tab(data)
    }
}
customElements.define(
    AwesomeCodeElement.details.HTML_elements.buttons.show_in_godbolt.HTMLElement_name,
    AwesomeCodeElement.details.HTML_elements.buttons.show_in_godbolt, {extends: 'button'}
);
AwesomeCodeElement.details.HTML_elements.LoadingAnimation = class LoadingAnimation {
    
    static #cache = (function(){
    // TODO: loading_animation.* as opt-in, inline (raw github data) as fallback
        const loading_animation_fallback_url = 'https://raw.githubusercontent.com/GuillaumeDua/awesome-code-element/main/resources/images/loading_animation.svg'
        let value = document.createElement('img');
        value.src = loading_animation_fallback_url
        AwesomeCodeElement.details.utility.apply_css(value, {
            contain             : 'strict',
            border              : '1px solid var(--primary-color)',
            borderRadius        : '5px',
            width               : '100%',
            height              : '100%',
            boxSizing           : 'border-box',
            display             : 'none' // hidden by default
        })
        return value
    })()
    static get element() {
        return LoadingAnimation.#cache.cloneNode()
    }

    static inject_into({owner, target_or_accessor }) {
        LoadingAnimation.#inject_toggle_loading_animation({owner, target_or_accessor })
        LoadingAnimation.#inject_animate_loading_while({owner})
    }

    static #inject_toggle_loading_animation({
        owner,              // injects `owner.toggle_loading_animation`
        target_or_accessor  // target, or a parameterless function that returns the target (preserving access after potential dereferencement)
    }){
        const loading_animation_element = owner.appendChild(LoadingAnimation.element)
        const target_accessor = () => {
            return target_or_accessor instanceof Function
                ? target_or_accessor()
                : target_or_accessor
        }
        const target_visible_display = target_accessor().style.display || 'flex'

        Object.defineProperty(owner, 'toggle_loading_animation', {
            set: function(value){
                target_accessor().style.display         = Boolean(value) ? 'none' : target_visible_display
                loading_animation_element.style.display = Boolean(value) ? 'flex' : 'none'
            },
            get: function(){
                return Boolean(loading_animation_element.style.display !== 'none')
            }
        })
    }
    static async #inject_animate_loading_while({owner}){
    // injects `owner.animate_loading_while`
        owner.animate_loading_while = (task) => {
            owner.toggle_loading_animation = true
            let task_result = undefined
            try {
                task_result = task()
            }
            catch (error){
                owner.toggle_loading_animation = false
                throw (error instanceof Error ? error : new Error(error))
            }
            if (task_result instanceof Promise)
                return task_result.then(() => {
                    owner.toggle_loading_animation = false
                })
            owner.toggle_loading_animation = false
        }
    }
}
// TODO: flex-resizer between the two panels ?
AwesomeCodeElement.details.HTML_elements.CodeSectionHTMLElement = class CodeSectionHTMLElement extends HTMLElement {
// HTML layout/barebone for CodeSection

    static #id_generator = (() => {
        let counter = AwesomeCodeElement.details.utility.make_incremental_counter_generator()
        return () => { return `cs_${counter.next().value}` }
    })()

    #_parameters = { // temporary storage for possibly constructor-provided arguments
        style:{}
    }

    // HTMLElement
    constructor(parameters) {
        super();
        AwesomeCodeElement.details.utility.unfold_into({
            target: this.#_parameters,
            properties: parameters || {}
        })
    }

    connectedCallback() {
        console.debug('AwesomeCodeElement.details.HTML_elements.CodeSectionHTMLElement: connectedCallback')
        try {
            if (!this.acquire_parameters(this.#_parameters)) {
                console.debug('AwesomeCodeElement.details.HTML_elements.CodeSectionHTMLElement: create shadowroot slot')
                this.shadowroot_accessor = AwesomeCodeElement.details.utility.create_shadowroot_slot(
                    this,
                    () => { this.#shadow_root_callback() }
                )
            }
            else {
                console.debug('AwesomeCodeElement.details.HTML_elements.CodeSectionHTMLElement: no need for shadowroot slot')
                this.initialize()
            }
        }
        catch (error) {
            console.error(`${error}`)
            this.on_critical_internal_error(error)
        }
    }
    disconnectedCallback() {
        AwesomeCodeElement.details.HTML_elements.resize_observer.unobserve(this)
    }
    #shadow_root_callback() {
    // defered initialization
        let _this = this
        let error = (function(){
            try {
                return _this.acquire_parameters(_this.#_parameters)
                    ? undefined
                    : 'acquire_parameters failed with no detailed informations'
            }
            catch (error) {
                return error
            }
        })()

        this.shadowroot_accessor.remove()
        if (error) {
            console.error(_this)
            _this.on_critical_internal_error(error)
        }
    }

    // accessors
    #allowed_directions = [ 'row', 'column' ]
    set direction(value) {
        this.style.flexDirection = this.#allowed_directions.includes(value) ? value : this.#allowed_directions[0]
    }
    get direction() {
        return this.style.flexDirection || this.#allowed_directions[0]
    }

    // html layout
    html_elements = {
        panels: {
            left: {
                buttons: {
                    CE: undefined,
                    copy_to_clipboard: undefined
                }
            },
            right: {
                buttons: {
                    copy_to_clipboard: undefined
                }
            }
        },
        code: undefined,
        execution: undefined
    }
    #initialize_HTML() {

        if (!this.isConnected)
            throw new Error('CodeSectionHTMLElement:#initialize_HTML: not connected yet')

        this.innerHTML = ""
        // this element
        AwesomeCodeElement.details.utility.apply_css(this, {
            display         : 'flex',
            flexDirection   : this.direction,
            alignItems      : 'stretch',
            boxSizing       : 'border-box',
            width           : '100%',
            minHeight       : '50px'
        })

        // left panel: code content
        const {
            panel: left_panel,
            elements: left_panel_elements
        } = this.#make_HTML_left_panel()

        this.html_elements.code                 = left_panel_elements.code
        this.html_elements.panels.left          = left_panel
        this.html_elements.panels.left.buttons  = left_panel_elements.buttons
        AwesomeCodeElement.details.HTML_elements.LoadingAnimation.inject_into({
            owner:  this.html_elements.panels.left,
            target_or_accessor: this.html_elements.code
        })
        this.html_elements.panels.left  = this.appendChild(this.html_elements.panels.left)

        // right panel: execution
        const { 
            panel: right_panel,
            elements: right_panel_elements
        } = this.#make_HTML_right_panel()

        this.html_elements.execution            = right_panel_elements.execution
        this.html_elements.panels.right         = right_panel
        this.html_elements.panels.right.buttons = right_panel_elements.buttons
        
        AwesomeCodeElement.details.HTML_elements.LoadingAnimation.inject_into({
            owner:  this.html_elements.panels.right,
            target_or_accessor: () => { return this.html_elements.execution }
        })
        this.html_elements.panels.right      = this.appendChild(this.html_elements.panels.right)

        // panels: style (auto-resize, scroll-bar, etc.)
        let set_panel_style = (panel) => {
            AwesomeCodeElement.details.utility.apply_css(panel, {
                flex:       '1 1 min-content',
                overflow:   'auto',
                position:   'relative',
                top:        0,
                left:       0,
                width:      '100%',
                margin:     0
            })
        }
        set_panel_style(this.html_elements.panels.left)
        set_panel_style(this.html_elements.panels.right)
        
        // panels: add on_resize event
        let set_on_resize_event = ({panel, scrolling_element, elements_to_hide}) => {
            // left panel: resize event
            panel.on_resize = CodeSectionHTMLElement.#make_event_on_resize_maybe_hide_elements({
                owner: scrolling_element,
                elements: Object.entries(elements_to_hide).map(element => element[1]) // structure-to-array
            })
            AwesomeCodeElement.details.HTML_elements.resize_observer.observe(panel)
        }
        set_on_resize_event({
            panel: this.html_elements.panels.left,
            scrolling_element: this.html_elements.code,
            elements_to_hide: this.html_elements.panels.left.buttons
        })
        set_on_resize_event({
            panel: this.html_elements.panels.right,
            scrolling_element: this.html_elements.execution,
            elements_to_hide: this.html_elements.panels.right.buttons
        })

        this.#initialize_ids()
    }
    #make_HTML_left_panel() {
        let left_panel = document.createElement('pre');
            left_panel.name
            left_panel.style.overflow = 'auto'

        let code_element = document.createElement('code');
        AwesomeCodeElement.details.utility.apply_css(code_element, {
            width:      'auto',
            height:     '100%',
            boxSizing:  'border-box',
            display:    'block'
        })
        code_element = left_panel.appendChild(code_element)

        // buttons : copy-to-clipboard
        let copy_button = new AwesomeCodeElement.details.HTML_elements.buttons.copy_to_clipboard()
            copy_button.style.zIndex = left_panel.style.zIndex + 1
            copy_button = left_panel.appendChild(copy_button)

        let CE_button = new AwesomeCodeElement.details.HTML_elements.buttons.show_in_godbolt()
        AwesomeCodeElement.details.utility.apply_css(CE_button, {
            zIndex : left_panel.style.zIndex + 1,
            display : 'none' // hidden by default
        })
        CE_button = left_panel.appendChild(CE_button)

        return { 
            panel: left_panel,
            elements: {
                code : code_element,
                buttons : {
                    CE: CE_button,
                    copy_to_clipboard: copy_button
                }
            }
        }
    }
    #make_HTML_right_panel() {
        // right panel: execution
        let right_panel = document.createElement('pre')
            AwesomeCodeElement.details.utility.apply_css(right_panel, {
                display:    'none',
                alignItems: 'stretch',
                boxSizing:  'border-box'
            })
        let execution_element = document.createElement('code')
            AwesomeCodeElement.details.utility.apply_css(execution_element, {
                //display:    'flex', 'flex-direction' : 'column',
                display:    'block',
                width:      '100%',
                overflow:   'auto',
                margin:     'inherit',
                overflow:   'auto',
                borderRadius:'5px'
            })
            execution_element = right_panel.appendChild(execution_element)
        let copy_button = new AwesomeCodeElement.details.HTML_elements.buttons.copy_to_clipboard()
            copy_button = right_panel.appendChild(copy_button)
        return { 
            panel: right_panel,
            elements: {
                execution: execution_element,
                buttons: {
                    copy_to_clipboard: copy_button
                }
            }
        }
    }
    #initialize_ids() {
        this.id = this.id || CodeSectionHTMLElement.#id_generator()
        this.html_elements.panels.left.id   = `${this.id}.panels.left`
        this.html_elements.panels.right.id  = `${this.id}.panels.right`
        this.html_elements.code.id          = `${this.id}.code`
        this.html_elements.execution.id     = `${this.id}.execution`
        this.html_elements.panels.left.buttons.CE.id                    = `${this.id}.panels.left.buttons.CE`
        this.html_elements.panels.left.buttons.copy_to_clipboard.id     = `${this.id}.panels.left.buttons.copy_to_clipboard`
        this.html_elements.panels.right.buttons.copy_to_clipboard.id    = `${this.id}.panels.right.buttons.copy_to_clipboard`
    }

    // html-related events
    static #make_event_on_resize_maybe_hide_elements({ owner, elements }) {
        let auto_hide_elements = (container, elements) => {
            elements.forEach((element) => { element.style.display = 'none' })
            container.onmouseover   = () => { elements.forEach((element) => { element.style.display = 'block' }) }
            container.onmouseout    = () => { elements.forEach((element) => element.style.display = 'none') }
        }
        let no_auto_hide_elements = (container, elements) => {
            elements.forEach((element) => { element.style.display = 'block' })
            container.onmouseout = null
            container.onmouseover = null
        }
        return () => {
            // cheaper than a proper AABB to check if code's content overlap with other elements
            let functor = (
                    AwesomeCodeElement.API.configuration.auto_hide_buttons
                ||  AwesomeCodeElement.details.utility.is_scrolling(owner).horizontally
            )   ? auto_hide_elements
                : no_auto_hide_elements

            functor(owner, elements)
        }
    }

    // initialization
    acquire_parameters(parameters) {
        this.#_parameters.style.direction = this.#_parameters.style.direction || this.getAttribute('direction') || this.style.flexDirection
        return true
    }
    initialize() {
        this.direction = this.#_parameters.style.direction
        this.#initialize_HTML()
    }
    
    static get_hljs_language(code_tag) {
        if (code_tag === undefined || code_tag.tagName !== 'CODE')
            throw new Error(`awesome-code-element.js:CodeSectionHTMLElement.get_code_hljs_language: bad input`)

        let result = code_tag.classList.toString().match(/language-(\w+)/, '')
        return result ? result[1] : undefined // first capture group
    }

    on_critical_internal_error(error = "") {

        console.error(`awesome-code-element.js:CodeSectionHTMLElement.on_critical_internal_error : fallback rendering\n\t${error}`)

        if (!this.isConnected)
            return

        let error_element = document.createElement('pre')
            error_element.textContent = error || `awesome-code-element:CodeSectionHTMLElement: unknown error`
        AwesomeCodeElement.details.utility.apply_css(error_element, {
            color: "red",
            border : "2px solid red"
        })
        this.innerHTML = ""
        // this.childNodes.forEach((child) => { child.style.display = 'none' })
        this.replaceWith(error_element)
    }
}

// ==================
// HTML_elements : API

AwesomeCodeElement.API.HTML_elements = {}
AwesomeCodeElement.API.HTML_elements.CodeSection = class CodeSection extends AwesomeCodeElement.details.HTML_elements.CodeSectionHTMLElement {
// TODO: code loading policy/behavior - as function : default is textContent, but can be remote using an url, or another rich text area for instance

    // --------------------------------
    // accessors

    get code() {
        return this.#_toggle_parsing
            ? this.#_code.to_display
            : this.#_code.raw
    }
    set code(value) {

        if (value instanceof AwesomeCodeElement.details.ParsedCode)
            this.#_code = value
        else if (typeof value === 'string')
            this.#_code = new AwesomeCodeElement.details.ParsedCode(value, this.language)
        else throw new Error('SimpleCodeSection: set code: invalid input argument type')

        this.#view_update_code()
    }
    #view_update_code() {
        this.#error_view = false // clear possibly existing errors
        // update view
        this.html_elements.code.textContent = this.code || ""
        // update view syle
        this.#view_update_language()
        // trigger (refresh) execution panel if required
        this.toggle_execution = this.toggle_execution
    }
    
    #_language = undefined
    toggle_language_detection = true
    get #is_valid_language() {
        return hljs.getLanguage(this.#_language) !== undefined
    }
    get language() {

        if (this.#is_valid_language)
            return this.#_language
        if (this.html_elements.code) {
            console.info('CodeSection:language : invalid language, attempting a detection as fallback')
            let detected_language = AwesomeCodeElement.details.HTML_elements.CodeSectionHTMLElement.get_hljs_language(this.html_elements.code)
            return detected_language === 'undefined' ? undefined : detected_language
        }
        return undefined
    }
    set language(arg) {

        let value       = (typeof arg === "object" ? arg.value : arg)
        let update_view = (typeof arg === "object" ? arg.update_view : true)

        console.info(`AwesomeCodeElement.API.HTML_elements.CodeSection: set language to [${value}]`)

        this.#_language = (value || '').replace('language-', '')
        this.setAttribute('language', this.#_language)
        this.#_code.ce_options = AwesomeCodeElement.API.configuration.CE.get(this.#_language)

        if (!update_view)
            return

        this.toggle_language_detection = !this.#is_valid_language

        this.#view_update_language()
    }
    #view_update_language_hljs_highlightAuto() {
    // can specify user-provided language
        let hljs_result = (() => {
            if (this.toggle_language_detection)
                return hljs.highlightAuto(this.html_elements.code.textContent)
            else
                return hljs.highlightAuto(this.html_elements.code.textContent, [ this.#_language ])
        })()

        if (hljs_result.language === undefined && hljs_result.secondBest)
            hljs_result = hljs_result.secondBest

        return hljs_result
    }
    #view_update_language_hljs_highlightElement() {
    // fallback, cannot provide language as a parameter
        hljs.highlightElement(this.html_elements.code)
        return {
            language: AwesomeCodeElement.details.HTML_elements.CodeSectionHTMLElement.get_hljs_language(this.html_elements.code),
            relevance: 10 // max
        }
    }
    #view_update_language(){

        let update_code_classList = () => {
            this.html_elements.code.classList = [...this.html_elements.code.classList].filter(element => !element.startsWith('language-') && element !== 'hljs')
            this.html_elements.code.classList.add(`hljs`)
            this.html_elements.code.classList.add(`language-${this.#_language}`)
        }

        // retro-action: update language with view (hljs) detected one
        if (this.toggle_language_detection || !this.language) {
            let hljs_result = this.#view_update_language_hljs_highlightAuto()
            if (!hljs_result.language || hljs_result.relevance < 3)
                hljs_result = this.#view_update_language_hljs_highlightElement()
            else
                this.html_elements.code.innerHTML = hljs_result.value

            if (hljs_result.relevance < 5)
                console.warn(`CodeSection: ${hljs_result.relevance === 0 ? 'no' : 'poor'} language matching [${hljs_result.language}] (${hljs_result.relevance}/10). Maybe the code is too small ?`)
            this.language = {
                value: hljs_result.language,
                update_view: false // no recursion here
            }
            update_code_classList()
        }
        else {
            update_code_classList()
            hljs.highlightElement(this.html_elements.code)
        }

        // CE button visibility
        // Note that resize observer can still toggle `display: block|none`
        this.html_elements.panels.left.buttons.CE.style.visibility = Boolean(this.#is_valid_language && AwesomeCodeElement.API.configuration.CE.has(this.#_language))
            ? 'visible'
            : 'hidden'

        // trigger (refresh) execution panel if required
        this.toggle_execution = this.toggle_execution
    }

    // --------------------------------
    // construction/initialization

    constructor(parameters) {
        super(parameters)
    }
    #_parameters = {}
    acquire_parameters(parameters) {

        super.acquire_parameters(parameters)

        if (parameters) {
            this.#_parameters = { 
                ...this.#_parameters,
                ...parameters
            }
        }

        let maybe_use_attribute = (property_name) => {
            this.#_parameters[property_name] = this.#_parameters[property_name] || this.getAttribute(property_name) || undefined
        }
        maybe_use_attribute('language')
        maybe_use_attribute('toggle_parsing')
        maybe_use_attribute('toggle_execution')

        let cleanup_code = (value) => {
            return value && value
                // remove enclosing white-spaces
                .replace(/^\s*/, '').replace(/\s*$/, '')
        }

        // remove any interpretation of inner text
        let textContent = [...this.childNodes]
            .map(element => element.outerHTML ?? element.textContent)
            .join('')
        textContent = AwesomeCodeElement.details.utility.html_codec.decode(textContent)
            // quick-fix
            .replaceAll(/\<\/\w+\>/g, '')   // attempt to fix code previously interpreted as HTML.
                                            // Typically, `#include <smthg>` directive produce #include <smthg> ... </smthg>

        // try to acquire local code
        this.#_parameters.code = 
                cleanup_code(this.#_parameters.code)
            ||  cleanup_code(textContent)
            ||  cleanup_code(this.getAttribute('code'))
            ||  ''
        // otherwise, remote
        this.#_parameters.url = this.#_parameters.url || this.getAttribute('url') || ''

        // TODO: load attributes as function, that can possibly override non-existing parameters

        // post-condition: valid code content
        let is_valid = (this.#_parameters.code || this.#_parameters.url)
        if (is_valid)
            this.acquire_parameters = () => { throw new Error('CodeSection.acquire_parameters: already called') }
        return is_valid
    }
    initialize() {
        super.initialize()

        console.debug(`AwesomeCodeElement.details.HTML_elements.CodeSection: initializing with parameters [${JSON.stringify(this.#_parameters, null, 3)}]` )

        // defered initialiation
        this.#_language                  = this.#_parameters.language
        this.toggle_language_detection  = !this.#is_valid_language

        if (this.#_parameters.url)  // remote code
            this.url = this.#_parameters.url
        else                        // local code
            this.#_code = new AwesomeCodeElement.details.ParsedCode(this.#_parameters.code, this.language)  // only update code, not its view

        this.toggle_parsing             = this.#_parameters.toggle_parsing      // will update the code view
        this.toggle_execution           = this.#_parameters.toggle_execution

        this.initialize = () => { throw new Error('CodeSection.initialize: already called') }
    }

    // --------------------------------
    // core logic : parsing

    #_code = new AwesomeCodeElement.details.ParsedCode()
    #_toggle_parsing = false
    set toggle_parsing(value) {

        if (this.#_toggle_parsing == value)
            return

        this.#_toggle_parsing = value
        if (!this.#_toggle_parsing) {
            this.#view_update_code()
            return
        }

        try             { this.code = new AwesomeCodeElement.details.ParsedCode(this.#_code.raw, this.#_language) } // code setter will updates the view
        catch (error)   { this.on_critical_internal_error(error); return }
    }
    get toggle_parsing() {
        return this.#_toggle_parsing
    }

    // --------------------------------
    // core logic : execution

    get ce_options() {
        return this.#_code.ce_options
    }
    get ce_code() {
        return this.#_code.to_execute || this.code
    }
    get is_executable() {
        return Boolean(this.#_code.ce_options)
    }
    get executable_code() {
        if (!this.is_executable)
            throw new Error('CodeSection:get executable_code: not executable.')
        return this.toggle_parsing ? this.#_code.to_execute : this.#_code.raw
    }

    #_toggle_execution = false
    set toggle_execution(value) {

        this.#_toggle_execution = value

        if (this.#_toggle_execution) {
            this.html_elements.panels.right.style.display = 'flex'
            try {
                this.html_elements.panels.right.animate_loading_while(this.#fetch_execution.bind(this))
            }
            catch(error) {
                console.error(error)
            }
        }
        else {
            this.html_elements.panels.right.style.display = 'none'
        }
    }
    get toggle_execution() {
        return this.#_toggle_execution
    }
    #fetch_execution() {

        let set_execution_content = ({ is_fetch_success, content: { value, return_code } }) => {

            if (!is_fetch_success) {
                this.html_elements.execution.textContent = value
                this.html_elements.execution.title = '[error] execution failed'
                AwesomeCodeElement.details.utility.apply_css(this.html_elements.execution, {
                    border: '2px solid red',
                    color:  'red'
                })
                return
            }

            this.html_elements.execution.title = 'Compilation provided by Compiler Explorer at https://godbolt.org/'
            // force hljs bash language
            this.html_elements.execution.innerHTML = hljs.highlightAuto(value, [ 'bash' ]).value
            this.html_elements.execution.classList = [...this.html_elements.code.classList].filter(element => !element.startsWith('language-') && element !== 'hljs')
            this.html_elements.execution.classList.add(`hljs`)
            this.html_elements.execution.classList.add(`language-bash`)
            // automated hljs language
            //  this.html_elements.execution.textContent = result.value
            //  hljs.highlightElement(this.html_elements.execution)

            AwesomeCodeElement.details.utility.apply_css(this.html_elements.execution, {
                border: '',
                borderTop : '2px solid ' + (return_code == -1 ? 'red' : 'green'),
                color: ''
            })
        }

        if (!this.is_executable) {

            let error = `CodeSection:fetch_execution: not executable. No known valid configuration for language [${this.language}]`
            set_execution_content({
                is_fetch_success : false,
                content : {
                    return_code: -1,
                    value: error
                }
            })
            throw new Error(error)
        }

        // right panel: replace with result
        return AwesomeCodeElement.details.remote.CE_API.fetch_execution_result(this.#_code.ce_options, this.executable_code)
            .catch((error) => {
                this.on_critical_internal_error(`CodeSection:fetch_execution: CE_API.fetch_execution_result: failed:\n\t[${error}]`)
            })
            .then((result) => {

                // CE header: parse & remove
                let regex = new RegExp('# Compilation provided by Compiler Explorer at https://godbolt.org/\n\n(# Compiler exited with result code (-?\\d+))')
                let regex_result = regex.exec(result)

                if (regex_result === null || regex_result.length != 3)
                    return {
                        value : result,
                        error : 'unknown',
                        return_code : -1
                    }
                else
                    return {
                        value : result.substring(regex_result[0].length - regex_result[1].length), // trim off header
                        error : undefined,
                        return_code : regex_result[2]
                    }
            })
            .then((result) => {
                set_execution_content({ is_fetch_success : true, content : result })
            })
    }

    // --------------------------------
    // core logic: acquire code policies

    #_url = undefined
    get url() {
        return this.#_url
    }
    set url(value) {
    // TODO: Cancel or wait for pending resource acquisition
    //  issue: if `url` is set twice (in a short period of time), we have a race condition
        this.html_elements.panels.left.toggle_loading_animation = true
        if (this.toggle_execution)
            this.html_elements.panels.right.toggle_loading_animation = true

        this.#_url = value

        let _this = this
        AwesomeCodeElement.details.utility.fetch_resource(this.#_url, {
            on_error: (error) => {
                _this.on_error(`CodeSection: network error: ${error}`)
                this.html_elements.panels.left.toggle_loading_animation = false
            },
            on_success: (code) => {
                if (!code) {
                    _this.on_error('CodeSection: fetched invalid (possibly empty) remote code')
                }
                _this.language = AwesomeCodeElement.details.utility.get_url_extension(_this.#_url)
                _this.code = code
                this.html_elements.panels.left.toggle_loading_animation = false
            }
        })
    }

    on_error(error) {
    // soft (non-critical) error
        error = error || 'CodeSection: unknown non-critical error'

        // restore a stable status
        this.toggle_parsing = false
        this.toggle_execution = false
        this.#_code = ''
        this.#_language = undefined

        // show error
        this.code = error
        this.#error_view = true
    }
    set #error_view(value) {
        if (value)
            AwesomeCodeElement.details.utility.apply_css(this.html_elements.panels.left, {
                border: '1px solid red',
                borderRadius : '5px',
            })
        else
            AwesomeCodeElement.details.utility.apply_css(this.html_elements.panels.left, {
                border: '',
                borderRadius : '',
            })
    }

    static HTMLElement_name = 'code-section'
    static PlaceholdersTranslation = {
        type : CodeSection,
        query : `div[class=${CodeSection.HTMLElement_name}]`,
        translate : (element) => {
            // TODO: all attributes -> options
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
customElements.define(
    AwesomeCodeElement.API.HTML_elements.CodeSection.HTMLElement_name,
    AwesomeCodeElement.API.HTML_elements.CodeSection
);

// =====
// Theme

// TODO: check doxygen-awesome-css compatiblity
AwesomeCodeElement.details.Theme = class Theme {
// class-as-namespace

    static preferences = class ThemePreferences {

        static #prefersLightModeInDarkModeKey = "prefers-light-mode-in-dark-mode"
        static #prefersDarkModeInLightModeKey = "prefers-dark-mode-in-light-mode"

        static get system_prefers_dark_mode(){
            return window.matchMedia('(prefers-color-scheme: dark)').matches
        }
        static get is_dark_mode() {
            return Boolean(!ThemePreferences.system_prefers_dark_mode &&  localStorage.getItem(ThemePreferences.#prefersDarkModeInLightModeKey)
                ||  ThemePreferences.system_prefers_dark_mode && !localStorage.getItem(ThemePreferences.#prefersLightModeInDarkModeKey))
        }
        static set is_dark_mode(value) {
            if (!value) {
                if (ThemePreferences.system_prefers_dark_mode)
                    localStorage.setItem(ThemePreferences.#prefersLightModeInDarkModeKey, true)
                else
                    localStorage.removeItem(ThemePreferences.#prefersDarkModeInLightModeKey)
                document.documentElement.classList.remove("dark-mode")
                document.documentElement.classList.add("light-mode")
            }
            else {
                if (!ThemePreferences.system_prefers_dark_mode)
                    localStorage.setItem(ThemePreferences.#prefersDarkModeInLightModeKey, true)
                else
                    localStorage.removeItem(ThemePreferences.#prefersLightModeInDarkModeKey)
                document.documentElement.classList.add("dark-mode")
                document.documentElement.classList.remove("light-mode")
            }
        }
        static get dark_or_light() {
            return ThemePreferences.is_dark_mode ? 'dark' : 'light'
        }
    }
    static url_builder = class url_builder {

        static #base = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${AwesomeCodeElement.API.configuration.hljs.version}/styles/`
        static #ext = '.min.css'

        static build({ name, dark_or_light = Theme.preferences.dark_or_light }) {
            if (typeof name !== 'string' && !(name instanceof String))
                throw new Error('ThemeSelector.#url_builder.build : invalid argument [name]')
            if (dark_or_light && dark_or_light !== 'light' && dark_or_light !== 'dark')
                throw new Error('ThemeSelector.#url_builder.build : invalid argument : [dark_or_light]')

            dark_or_light = `${Boolean(dark_or_light) ? '-' : ''}${dark_or_light}`
            return `${url_builder.#base}${name}${dark_or_light}${url_builder.#ext}`
        }
        static retrieve(url) {
            let matches = url.match(`${url_builder.#base}(.*?)(\-dark|\-light){0,1}${url_builder.#ext}`)
            return {
                name: matches[1],
                dark_or_light_suffix: matches[2]
            }
        }
        static toggle_dark_mode(url) {
            return url.replace(/\-dark|\-light/, (match) => {
                return match === '-dark' ? '-light' : '-dark'
            })
        }
    }

    static get default_theme() {
        const theme_selector_default_option = (() => {
            let candidate_option = $(document).find('select[is=theme-selector]')
                .map((index, element) => { return element.options[0] })
                .filter((index, element) => element && element.value)
                [0]
            return candidate_option ? candidate_option.value : undefined
        })()
        return Boolean(theme_selector_default_option)
            ? theme_selector_default_option
            : AwesomeCodeElement.API.configuration.hljs.default_theme
    }

    static #stylesheet_element_id = 'code_theme_stylesheet'
    static initialize() {
        // generates the stylesheet HTML element used to import CSS content
        let stylesheet = document.createElement('link')
            stylesheet.rel = "stylesheet"
            stylesheet.id = Theme.#stylesheet_element_id
        document.head.appendChild(stylesheet)

        // switch to default theme, if any
        let default_theme_name = Theme.default_theme
        if (default_theme_name) {
            console.info(`AwesomeCodeElement.details.Theme.initialize: default theme name: [${default_theme_name}]`)
            Theme.value = default_theme_name
        }
        // dark/light-mode preference
        console.info(`AwesomeCodeElement.details.Theme.initialize: color-scheme preference: [${Theme.preferences.dark_or_light}]`)
        Theme.preferences.is_dark_mode = Theme.preferences.is_dark_mode

        // avoid any redundant call
        Theme.initialize = () => { console.error('AwesomeCodeElement.details.Theme.initialize: can only be called once') }
    }
    static get supports_dark_or_light_mode() {
        // Note: supports dark-mode by default (when not loaded yet)
        return !Theme.value.url || Theme.value.dark_or_light_suffix
    }

    // value
    static get value() {

        let element = document.getElementById(Theme.#stylesheet_element_id);
        if (!element)
            throw new Error('AwesomeCodeElement.details.Theme: missing stylesheet\n\tDid you forget to call AwesomeCodeElement.API.initialize(); ?')

        return {
            url:                    element.getAttribute('href'),
            name:                   element.getAttribute('theme_name'),
            dark_or_light_suffix:   element.getAttribute('theme_dark_or_light_suffix'),
            element:                element,
            get ['support_dark_or_light_mode']() {
                return Boolean(this.dark_or_light_suffix)
            },
            get ['fullname']() {
                return `${this.name}${this.dark_or_light_suffix}`
            }
        }
    }
    static set value(theme_name) {

        console.info(`AwesomeCodeElement.details.Theme: setting theme to [${theme_name}]`)

        try {
            if (Theme.value.name === theme_name) {
                console.info(`AwesomeCodeElement.details.Theme: already loaded`)
                return
            }
        } catch(error){}

        if (!theme_name) {
            Theme.value.element.setAttribute('href', '')
            Theme.value.element.setAttribute('theme_name', '')
            Theme.value.element.setAttribute('theme_dark_or_light_suffix', '')
            return
        }

        let set_stylesheet_content = ({ url }) => {
            Theme.value.element.setAttribute('href', url)

            let theme_infos = Theme.url_builder.retrieve(url)
            Theme.value.element.setAttribute('theme_name', theme_infos.name)
            Theme.value.element.setAttribute('theme_dark_or_light_suffix', theme_infos.dark_or_light_suffix || '')

            console.info(`AwesomeCodeElement.details.Theme.set[value]: stylesheet successfully loaded\n\t[${url}]`)
        }

        let try_to_load_stylesheet = ({ theme_name, dark_or_light, on_failure }) => {

            let url = Theme.url_builder.build({ name : theme_name, dark_or_light: dark_or_light })
            console.debug(`AwesomeCodeElement.details.Theme.set[value]: loading stylesheet\n\t[${url}] ...`)

            fetch(url, { method: 'GET' })
                .then(response => {
                    if (response.ok)
                        return response.ok
                    throw new Error('unreachable')
                })
                .then(() => set_stylesheet_content({ url: url }))
                .catch(error => {
                    let message = on_failure ? `\nBut a fallback strategy is provided (wait for it ...)` : ''
                    let console_stream = on_failure ? console.debug : console.error
                        console_stream(`AwesomeCodeElement.details.Theme: unable to load\n\t[${url}]\n${error}${message}`)
                    if (on_failure)
                        on_failure()
                })
            ;
        }

        let force_light_or_dark_mode = theme_name.search(/(-dark|-light)$/, '') !== -1
        try_to_load_stylesheet({
            theme_name: theme_name,
            dark_or_light: force_light_or_dark_mode ? '' : Theme.preferences.dark_or_light,
            on_failure: force_light_or_dark_mode ? undefined : () => {
                // handles themes that do not support light/dark variations
                try_to_load_stylesheet({
                    theme_name: theme_name,
                    dark_or_light: '', // no dark/light suffix
                })
            }
        })
    }

    static set is_dark_mode(value) {

        Theme.preferences.is_dark_mode = value

        if (!Theme.value.support_dark_or_light_mode) {
            console.info(`Theme.ToggleDarkMode: theme does not supports dark/light mode, aborting.`)
            return
        }
        if ((value  && Theme.value.dark_or_light_suffix === '-dark')
        ||  (!value && Theme.value.dark_or_light_suffix === '-light')) {
            console.info(`Theme.ToggleDarkMode: theme already has the right dark/light mode, aborting.`)
            return
        }
        Theme.value = Theme.url_builder.toggle_dark_mode(Theme.value.fullname)
    }
    static ToggleDarkMode() {
        Theme.is_dark_mode = !Theme.preferences.is_dark_mode
    }
}
// Events: monitor system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    $(document).find(`button[is=${AwesomeCodeElement.API.HTML_elements.ToggleDarkModeButton.HTMLElement_name}]`)
        .each((index, element) => { element.updateIcon() })
    AwesomeCodeElement.details.Theme.is_dark_mode = event.matches
})
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', event => {
    $(document).find(`button[is=${AwesomeCodeElement.API.HTML_elements.ToggleDarkModeButton.HTMLElement_name}]`)
        .each((index, element) => { element.updateIcon() })
    AwesomeCodeElement.details.Theme.is_dark_mode = !event.matches
})
AwesomeCodeElement.API.HTML_elements.ToggleDarkModeButton = class ToggleDarkModeButton extends HTMLButtonElement {

    static HTMLElement_name                 = "awesome-code-element-toggle-dark-mode-button"
    static title                            = "Toggle light/dark Mode"
    static lightModeIcon                    = `<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#FCBF00"><rect fill="none" height="24" width="24"/><circle cx="12" cy="12" opacity=".3" r="3"/><path d="M12,9c1.65,0,3,1.35,3,3s-1.35,3-3,3s-3-1.35-3-3S10.35,9,12,9 M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5 S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1 s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0 c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95 c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41 L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41 s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06 c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"/></svg>`
    static darkModeIcon                     = `<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#FE9700"><rect fill="none" height="24" width="24"/><path d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27 C17.45,17.19,14.93,19,12,19c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z" opacity=".3"/><path d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"/></svg>`

    constructor() {
        super()
    }
    connectedCallback() {
        this.setAttribute('is', ToggleDarkModeButton.HTMLElement_name)
        this.title = ToggleDarkModeButton.title
        this.addEventListener('click', this.#on_click);
        this.updateIcon()

        document.addEventListener("visibilitychange", visibilityState => {
            if (document.visibilityState === 'visible') {
                this.updateIcon()
            }
        });
    }
    #on_click(){
        AwesomeCodeElement.details.Theme.ToggleDarkMode()
        this.updateIcon()
    }

    updateIcon() {
    // show light-mode icon if dark-mode is activated, and vice-versa
        this.innerHTML = AwesomeCodeElement.details.Theme.preferences.is_dark_mode
            ? ToggleDarkModeButton.lightModeIcon
            : ToggleDarkModeButton.darkModeIcon
        ;
    }
}
customElements.define(
    AwesomeCodeElement.API.HTML_elements.ToggleDarkModeButton.HTMLElement_name,
    AwesomeCodeElement.API.HTML_elements.ToggleDarkModeButton, {extends: 'button'}
);
AwesomeCodeElement.API.HTML_elements.ThemeSelector = class ThemeSelector extends HTMLSelectElement {
// For themes, see https://cdnjs.com/libraries/highlight.js
// Note: The first one is the default
// Use theme name, without light or dark specification. Example : `tokyo-night`

    static HTMLElement_name = 'theme-selector'

    #parameters = undefined

    constructor(parameters) {
        super()
        this.#parameters = parameters
    }
    connectedCallback() {

        if (this.#parameters) {
            this.#initialize()
            return
        }
        try {
            var options = $(this).find('option');
            this.#parameters = options.map((index, element) => {
                return element.getAttribute('value')
            }).toArray()
            this.#initialize()
        }
        catch (error) {
            console.error(`${error}`)
            throw error
        }
    }

    #initialize() {

        this.setAttribute('is', ThemeSelector.HTMLElement_name)
        this.id = ThemeSelector.#id_generator()
        this.innerHTML = ""

        this.#parameters.forEach(element => {
            let option = document.createElement('option')
                option.value = element
                option.text  = element
            this.appendChild(option)
        })
        this.onchange = function(){

            let selected_option = $(this).find('option:selected')
            console.info(`AwesomeCodeElement.API.HTML_elements.ThemeSelector.onchange: switching to [${selected_option.text()}]`)
            AwesomeCodeElement.details.Theme.value = selected_option.text()
        }
    }

    static #id_generator = (() => {
        let counter = AwesomeCodeElement.details.utility.make_incremental_counter_generator()
        return () => { return `${ThemeSelector.HTMLElement_name}-${counter.next().value}` }
    })()
}
customElements.define(
    AwesomeCodeElement.API.HTML_elements.ThemeSelector.HTMLElement_name,
    AwesomeCodeElement.API.HTML_elements.ThemeSelector, { extends : 'select' }
);

// ==============
// Initialization

AwesomeCodeElement.API.initializers = {
    doxygenCodeSections : function() {
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
        console.info(`awesome-code-element.js:initialize_doxygenCodeSections : replacing ${place_holders.length} elements ...`)
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
        console.info(`awesome-code-element.js:initialize_doxygenCodeSections : replacing ${place_holders.length} elements ...`)
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
    
        // TODO: restore documentation reference links
        doc_ref_links.forEach((values, keys) => {
            // console.debug(">>>>>>> " + value.href + " => " + value.textContent)
            console.debug(">>>>>>> " + values + " => " + keys)
        })
    
        var place_holders = $('body').find('awesome-code-element_code-section pre code') // span or text
        place_holders.filter(function() {
            return $(this).text().replace(/toto/g, '<a href=".">toto</a>');
            })
    },
    // TODO: make sure that doxygen elements are also still clickable with pure doxygen (not doxygen-awesome-css)
    PreCodeHTML_elements : function() {

        $('body').find('pre code').each((index, value) => { // filter

            if ($(value).parent().parent().prop('nodeName').toLowerCase().startsWith("awesome-code-element_"))
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
}
AwesomeCodeElement.API.initialize = () => {
   
    $(function() {
        $(document).ready(function() {

            console.info('awesome-code-element.js:initialize ...')

            if (AwesomeCodeElement.API.configuration.toggle_dark_mode) {
                if (undefined === AwesomeCodeElement.ToggleDarkMode)
                    console.error(
                        'awesome-code-element.js:initialize: options toggle_dark_mode set to true, but awesome_doc_code_sections.ToggleDarkMode is undefined\n' +
                        'Did you forget to include awesome-code-element_dark-mode.js ?'
                    )
                else
                    AwesomeCodeElement.ToggleDarkMode.initialize()
            }

            AwesomeCodeElement.details.Theme.initialize()

            let ReplaceHTMLPlaceholders = (translation) => {

                let elements = $('body').find(translation.query)
                console.info(`awesome-code-element.js:ReplaceHTMLPlaceholders(${translation.type.name}) : replacing ${elements.length} element(s) ...`)
                elements.each((index, element) => {
                    let translated_element = translation.translate(element)
                    if (translated_element)
                        element.replaceWith(translated_element)
                })
            }
            [   // replace placeholders with proper HTML elements
                AwesomeCodeElement.API.HTML_elements.CodeSection
            ].forEach(html_component => ReplaceHTMLPlaceholders(html_component.PlaceholdersTranslation))

            if (AwesomeCodeElement.API.configuration.doxygen_awesome_css_compatibility === true) {
                console.info(`awesome-code-element.js:initialize: doxygen-awesome-css compatiblity ...`)
                AwesomeCodeElement.API.initializers.doxygenCodeSections()
            }

            if (AwesomeCodeElement.API.configuration.pre_code_compatibility) {
                console.info(`awesome-code-element.js:initialize: existing pre-code compatiblity ...`)
                AwesomeCodeElement.API.initializers.PreCodeHTML_elements
            }
        })
    })
}

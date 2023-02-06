// ----------------------------------------------------------------------------------------------------------------------------

const AwesomeCodeElement = {
    API : {
        configuration : {
            description: {},
            CE : {},
            CodeSection : {}
        }
    },
    details : {}
}

// ==================
// details.containers

AwesomeCodeElement.details.containers = {}
AwesomeCodeElement.details.containers.translation_map = class extends Map {
// Similar to `Map`, with non-mandatory translation for key, mapped
// example: upper-case keys
// value = new translation_map(
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
AwesomeCodeElement.API.CE_ConfigurationManager = class extends AwesomeCodeElement.details.containers.translation_map {
// similar to a Map, but use `hljs.getLanguage(key)` as a key translator
//
// key   : language (name or alias. e.g: C++, cpp, cc, c++ are equivalent)
// value : {
//      language,       // not mandatory, if same as key. Refers to https://godbolt.org/api/languages
//      compiler_id,    //     mandatory
//      default_options // not mandatory
// }
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
// =================
// API.configuration

AwesomeCodeElement.API.configuration = {
    description: {
        version:    '1.0.0',
        name:       'awesome-code-element.js',
        path_prefix: ((name) => {
        // quick-fix.
        // TODO:
        //  local:      this function
        //  otherwise:  path to deployed release
            const imported_modules = Array.from(document.querySelectorAll('script[type="module"]'));
            let result = ""
            const find_match = (value) => {
                let match = value.match(`(:?[^\"\']*)${name}`)
                if (match && match.length == 2)
                    result = match[1]
            }
            imported_modules
                .map(value => value.src)
                .forEach(find_match)
            if (result)
                return result

            imported_modules
                .filter(value => !value.src)
                .map(value => value.innerText)
                .forEach(find_match)
            return result
        })('awesome-code-element.js'),
        stylesheet_url: undefined // default: local
    },
    CE                                  : new AwesomeCodeElement.API.CE_ConfigurationManager,
    CodeSection                         : {
    // can be overrided locally
        language        : undefined,    // autodetect
        toggle_parsing  : true,
        toggle_execution: false,
        direction       : ''            // default: row
    },
    hljs                                : {
        // default_theme:   If no ace-theme-selector, then this is the default one.
        //                  Otherwise, the first valid option of the first ace-theme-selector is the default
        default_theme   : 'tokyo-night'  // supports dark/light variations
    },
    compatibility                       : {
        doxygen:                        undefined,
        doxygen_awesome_css:            false,  // TODO: autodetect
        pre_code:                       false
    },
    auto_hide_buttons                   : false, // TODO: rename force_ or always_
    force_dark_light_scheme             : (() => {
        return undefined // auto-detect
    })()
    
}
AwesomeCodeElement.API.configure = (arg) => {
    if (!arg)
        throw new Error('AwesomeCodeElement.API.configuration.configure: invalid argument')

    if (arg.CE && arg.CE instanceof Map)
        arg.CE = new AwesomeCodeElement.API.CE_ConfigurationManager([...arg.CE])
    if (arg.CE && !(arg.CE instanceof AwesomeCodeElement.API.CE_ConfigurationManager))
        throw new Error('AwesomeCodeElement.API.configure: invalid type for argument: [CE]')

    AwesomeCodeElement.details.utility.unfold_into({
        target : AwesomeCodeElement.API.configuration,
        properties : arg
    })
}

// ================
// internal details

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
AwesomeCodeElement.details.utility = class utility {
// TODO: move to another module ?

    static html_codec = class html_codec {
        static entities = new Array(
        //    [ '\\\\' , '\\'],
           [ '&gt;', '>' ],
           [ '&lt;', '<' ],
           [ '&amp;', '&' ],
           [ '&quot;', '"' ],
           [ '&#39;', '\'' ]
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

    static customElements_define_once(name, ...args) {
        if (!!customElements.get(name)) {
            console.warn(`AwesomeCodeElement.details.utility: AwesomeCodeElement.details.utility.customElements_define_once: [${name}] is already defined`)
            return
        }
        customElements.define(name, ...args);
    }
    static unfold_into({target, properties = {}}) {
        if (!target)
            throw new Error(`AwesomeCodeElement.details.utility: invalid argument [target] with value [${target}]`)

        for (const property in properties) {
            // HTMLElement
            if (target[property]
            &&  target[property] instanceof HTMLElement || properties[property] instanceof HTMLElement) {
                target[property] = properties[property]; // no unfolding here but assign, to preserve
                continue
            }
            // Map
            if (target[property]
            &&  target[property] instanceof Map && properties[property] instanceof Map) {
                properties[property].forEach((value, key) => target[property].set(key, value)); // no unfolding here but assign, to preserve
                continue
            }
            // object
            if (target[property]
            && typeof target[property] === 'object' && typeof properties[property] === 'object') {
                utility.unfold_into({ target: target[property], properties : properties[property]})
                continue
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
                return element
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
                on_error(`AwesomeCodeElement.details.utility.fetch_resource: network error on url [${url}]`)
            };
            xhr.onload = function() {

                if (xhr.status != 200) {
                    on_error(`AwesomeCodeElement.details.utility.fetch_resource: bad request status ${xhr.status} on url [${url}]`)
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
    static inject_field_proxy = function(target, property_name, { getter_payload, setter_payload } = {}) {
    // generate a proxy to a value's field, injecting optional payload
        
        var _target = target
        var storage = _target[property_name]
        const target_getter = _target.__lookupGetter__(property_name)
        const target_setter = _target.__lookupSetter__(property_name)
    
        const getter = function(){
            const value = target_getter ? target_getter.call(_target) : storage
            return getter_payload
                ? getter_payload(value) ?? value
                : value
        };
        const setter = function(newValue){
    
            if (setter_payload)
                newValue = setter_payload(newValue)
    
            if (target_setter)
                target_setter.call(_target, newValue)
            else
                storage = newValue
        };
    
        Object.defineProperty(_target, property_name, {
            get: getter,
            set: setter
        });
    
        return {
            get: _target.__lookupGetter__(property_name),
            set: _target.__lookupSetter__(property_name)
        }
    }
}
// details: code representation
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

// WIP: refactor code representation
class code_parser_policies {

    static result_type = class {
        constructor(arg){ Object.assign(this,arg) }
        
        raw        = undefined
        to_display = undefined
        to_execute = undefined
        ce_options = {}
    }

    static no_parser = class {
        static parse({ code }){
            return new code_parser_policies.result_type({
                raw: code,
                to_display: code,
                to_execute: code
            })
        }
    }
    static ace_metadata_parser = class ace_metadata_parser {
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

        static tag = '// @ace'// TODO:replace with `// @ace`
        static parse({ code }) {

            if (code === undefined)
                throw new Error('code_parser_policies.ace_metadata_parser.parse: invalid argument')

            let result = new code_parser_policies.result_type({ raw: code })
                result = ace_metadata_parser.#parse_impl({ result: result})
                result = ace_metadata_parser.#apply_ce_transformations({ result: result })

            // TODO: (elsewhere!!!) merge local with global
            // apply default configuration for a given - non-mandatory - language
            // Note: global configuration can be overrided locally in the configuration
            // if (AwesomeCodeElement.API.configuration.CE.has(language))
            //     this.ce_options = AwesomeCodeElement.API.configuration.CE.get(language)

            return result
        }
        static #parse_impl({ result }) {

            let code_content = result.raw
    
            {   // CE options
                const regexp = new RegExp(`^\\s*?${code_parser_policies.ace_metadata_parser.tag}::CE=({(.*?\n\\s*//.*?)+}\n?)`, 'gm')
                const matches = [...result.raw.matchAll(regexp)] // expect exactly 1 match
                if (matches.length > 1)
                    console.error(`code_parser_policies.ace_metadata_parser.parse: found multiples CE configurations`)
        
                matches.map((match) => {
                    const value = match[1].replaceAll(
                        new RegExp(`^\\s*?//`, 'gm'),
                        ''
                    )
                    // remove from original content
                    code_content = code_content.slice(0, match.index)
                                + code_content.slice(match.index + match[0].length)
                    return value
                }).forEach((value) => {
                    // Merge CE configuration. Local can override global.
                    result.ce_options = {
                        ...(result.ce_options || {}),
                        ...JSON.parse(value)
                    }
                })
            }
    
            // skip block, line (documentation & execution sides)
            // block
            code_content = code_content.replaceAll(
                new RegExp(`^\\s*?${code_parser_policies.ace_metadata_parser.tag}::skip::block::begin\n(.*?\n)*\\s*?${code_parser_policies.ace_metadata_parser.tag}::skip::block::end\\s*?$`, 'gm'),
                ''
            )
            // line
            code_content = code_content.replaceAll(
                new RegExp(`^.*?\\s+${code_parser_policies.ace_metadata_parser.tag}::skip::line\\s*$`, 'gm'),
                ''
            )
    
            // show block, line (documentation side)
            const code_only_show = (() => {
                const regex_show_block  = `(^\\s*?${code_parser_policies.ace_metadata_parser.tag}::show::block::begin\n(?<block>(^.*?$\n)+)\\s*${code_parser_policies.ace_metadata_parser.tag}::show::block::end\n?)`
                const regex_show_line   = `(^(?<line>.*?)\\s*${code_parser_policies.ace_metadata_parser.tag}::show::line\\s*?$)`
                const regexp = new RegExp(`${regex_show_block}|${regex_show_line}`, 'gm')
                const matches = [...code_content.matchAll(regexp)]
                return matches
                    .reverse()
                    .map((match) => {
                        const result = match.groups.block !== undefined
                            ? match.groups.block
                            : match.groups.line
                        // remove from original content
                        // code_content = code_content.replace(match[0], result) // really slower than 2 reverse + 2 substring ?
                        code_content = code_content.substring(0, match.index) + result + code_content.substring(match.index + match[0].length)
                        return result
                    })
                    .reverse()
                    .join('\n')
            })()
    
            result.to_display = (code_only_show !== "" ? code_only_show : code_content)
            result.to_execute = code_content

            return result
        }
        static #apply_ce_transformations({ result }) {
    
            // includes_transformation
            if (result.ce_options && result.ce_options.includes_transformation) {
                result.ce_options.includes_transformation.forEach((value) => {
                    // replace includes
    
                    const regex = new RegExp(`^(\\s*?\\#.*?[\\"|\\<"].*?)(${value[0]})(.*?[\\"|\\>"])`, 'gm')
                    result.to_execute = result.to_execute.replace(regex, `$1${value[1]}$3`)
                })
            }
            return result
        }
    }
}

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

    constructor(code_content, language = undefined) {

        // apply default configuration for a given - non-mandatory - language
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
AwesomeCodeElement.details.code_element = class code_element {
// acquire { model, view } from an HTMLElement
//  model: inner text considered as plain code: any invalid nodes injected by the HTML rendering are removed
//  view : either a pre>code or the given element, if the later contains valid HTML elements
    static html_parser = class html_parser {
        static is_valid_HTMLElement({ element }){
            if (element === undefined)
                throw new Error('ace.details.code_element.html_parser.is_valid_HTMLElement: invalid argument')
            return element instanceof HTMLElement && !(element instanceof HTMLUnknownElement)
        }
        static is_valid_tagName({ tagName }) {
            if (element === undefined)
                throw new Error('ace.details.code_element.html_parser.is_valid_tagName: invalid argument')
            if (!(typeof tagName === 'string') && !(tagName instanceof String))
                throw new Error('html_parser.is_valid_tagName: invalid argument')
            // TODO: cache tagname -> result, to decrease costly/useless element creation
            return html_parser.is_valid_HTMLElement({ element: document.createElement(tagName) })
        }
        static count_valid_childrens({ element, is_recursive = false }) {
            if (element === undefined)
                throw new Error('ace.details.code_element.html_parser.count_valid_childrens: invalid argument')
            return Array
                .from(element.children)
                .map((element) => {
                    return 0
                        + html_parser.is_valid_HTMLElement({ element: element })
                        + (is_recursive ? html_parser.count_valid_childrens({ element: element, is_recursive: is_recursive }) : 0)
                })
                .reduce((total, current) => total + current, 0)
        }
        static to_code({ elements }) {
        // expect Array.from(node.childNodes)
        // TODO?: faster approach?: use regex on outerHTML: \<(?'closing'\/?)(?'tagname'\w+\-?)+.*?\>
        // replace invalid HTMLElement by their localName as text
            if (elements === undefined)
                throw new Error('ace.details.code_element.html_parser.count_valid_childrens: invalid argument')
            return elements
                .map(element => {
                    switch (element.nodeType) {
                        case Node.TEXT_NODE:
                            return element.textContent
                        case Node.ELEMENT_NODE:
                            if (html_parser.is_valid_HTMLElement({ element: element }))
                                return html_parser.to_code({ elements: Array.from(element.childNodes) })
                            // invalid tagname are kept as text, to preserve include semantic.
                            //  e.g: `<iostream>` in `#include <iostream>`
                            return `<${element.localName}>${html_parser.to_code({ elements: Array.from(element.childNodes) })}`
                        case Node.COMMENT_NODE:
                        case Node.CDATA_SECTION_NODE:
                        default:
                            console.debug(`code_element.parser.to_code: unhandled tags [comment, cdata, etc.]`)
                            return ''                        
                    }
                })
                .join('')
        }
        static cleanup({ element }){
        // recursively replaces invalid childrens element by their tagname as text
            if (element === undefined)
                throw new Error('ace.details.code_element.html_parser.cleanup: invalid argument')

            let childNodes = Array.from(element.childNodes)
            childNodes
                .filter(element => element.nodeType === HTMLElement.ELEMENT_NODE)
                .forEach(element => {
                    html_parser.#cleanup_impl({ element: element })
                })
            return element
        }
        static #cleanup_impl({ element }){
        // recursively replaces invalid element by their tagname as text

            if (element === undefined)
                throw new Error('ace.details.code_element.html_parser.cleanup_impl: invalid argument')

            let childNodes = Array.from(element.childNodes)                                         // preserve reference/offset integrity
            if (!html_parser.is_valid_HTMLElement({ element: element })) {
                element.previousSibling.appendData(`<${element.localName}>`)                        // replace by text
                childNodes.forEach(node => element.parentNode.insertBefore(node, element))          // transfert childrensNodes to parent
                element = element.parentNode.removeChild(element)                                   // remove the element
            }
            childNodes
                .filter(element => element.nodeType === HTMLElement.ELEMENT_NODE)
                .forEach(element => {
                    html_parser.#cleanup_impl({ element: element })
                })
        }
    };

    get is_editable() { return !this.is_self_contained }

    constructor(argument) {

        if (argument instanceof code_element) {
            this.is_self_contained = argument.is_self_contained
            this.model = argument.model
            this.view = argument.view
            return;
        }

        this.#build_from(argument)

        // TODO? element.replaceWith(this.view)
    }

    static cleanup(code_as_text){
        if (!code_as_text)
            return ''

        return code_as_text.replace(/^\s*/, '').replace(/\s*$/, '') // remove enclosing white-spaces

        // const textContent = (() => {
        // // removes any interpretation of inner text
        //     const value = [...this.childNodes]
        //         .map(element => element.outerHTML ?? element.textContent)
        //         .join('')
        //     return AwesomeCodeElement.details.utility.html_codec.decode(value)
        //         .replaceAll(/\<\/\w+\>/g, '')   // Quick-fix: attempt to fix code previously interpreted as HTML.
        //                                         // Typically, `#include <smthg>` directive produce #include <smthg> ... </smthg>
        // })()
    }

    #build_from(argument){

        if (argument instanceof HTMLElement)
            this.#build_from_element(argument)
        else if (argument instanceof Array
              && argument.reduce((index, arg) => undefined !== arg.nodeType, true))
        {
            let only_one_valid_element = (() => {
                const no_ws_elements = argument.filter((element) => !(element.nodeType === Node.TEXT_NODE && /^\s+$/g.test(element.textContent)))
                return no_ws_elements.length === 1 && code_element.html_parser.is_valid_HTMLElement({ element: no_ws_elements[0] })
                    ? no_ws_elements[0]
                    : undefined
            })()
            return only_one_valid_element
                ? this.#build_from_element(only_one_valid_element)
                : this.#build_from_nodes(argument)
        }
        else if (argument.nodeType === document.TEXT_NODE)
            this.#build_from_text(argument.textContent)
        else
            this.#build_from_text(argument.toString())
    }
    #build_from_text(value){

        this.is_self_contained = false
        this.model = code_element.cleanup(value)
        this.view = (() => {
            let value = document.createElement('pre')
            let code_node = value.appendChild(document.createElement('code'))
                code_node.textContent = this.model
            return value
        })()
    }
    #build_from_element(element){

        if (!(element instanceof HTMLElement))
            throw new Error('code_element.#build_from_element: invalid argument')

        // TODO:WIP: set to always true?
        this.is_self_contained = Boolean(code_element.html_parser.count_valid_childrens({ element: element, is_recursive: true }))
        this.model = (() => {
            if (this.is_self_contained)
                element = code_element.html_parser.cleanup({ element: element })
            const textContent = code_element.html_parser.to_code({ elements: Array.from(element.childNodes) })
            return code_element.cleanup(textContent) || code_element.cleanup(element.getAttribute('code')) ||  ''
        })()
        if (!this.is_self_contained) {
            this.#build_from_text(this.model)
            return
        }
        this.view = element
    }
    #build_from_nodes(elements){
    // expected: Array.from(node.childNodes)

        if (!(elements instanceof Array)
        ||  !elements.reduce((index, arg) => undefined !== arg.nodeType, true))
            throw new Error('code_element.#build_from_nodes_array: invalid argument')

        this.is_self_contained = false
        this.model = (() => {
            
            elements.forEach((element) => code_element.html_parser.cleanup({ element: element }))
            const textContent = elements
                .map((element) => { 

                    let result = code_element.html_parser.to_code({
                        elements: [ element ]
                    })
                    return result
                })
                .join('')

            return code_element.cleanup(textContent)
        })()
        if (!this.is_self_contained) {
            this.#build_from_text(this.model)
            return
        }
        this.view = element
    }
}
// details: logging
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
    static copyIcon         = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="25" height="25"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`
    static successIcon      = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="25" height="25"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`
    static successDuration  = 980

    constructor() {
        super();
        this.setAttribute('is', CopyToClipboardButton.HTMLElement_name)

        this.title = CopyToClipboardButton.title
        this.innerHTML = CopyToClipboardButton.copyIcon

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
AwesomeCodeElement.details.utility.customElements_define_once(
    AwesomeCodeElement.details.HTML_elements.buttons.copy_to_clipboard.HTMLElement_name,
    AwesomeCodeElement.details.HTML_elements.buttons.copy_to_clipboard, {extends: 'button'}
);
AwesomeCodeElement.details.HTML_elements.buttons.show_in_godbolt = class ShowInGodboltButton extends HTMLButtonElement {

    static HTMLElement_name = 'ace-button-send-to-godbolt'
    static title            = 'Try this on godbolt.org (compiler-explorer)'
    static icon             = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="25" height="25"><switch><g><path d="M58.6 46.5c-.3-.5-.3-1.2 0-1.7.3-.6.7-1.3 1-2 .2-.5-.1-1-.7-1h-5.8c-.6 0-1.2.3-1.4.8-.7 1.1-1.6 2.2-2.6 3.2-3.7 3.7-8.6 5.7-13.9 5.7-5.3 0-10.2-2-13.9-5.7-3.8-3.7-5.8-8.6-5.8-13.9s2-10.2 5.8-13.9c3.7-3.7 8.6-5.7 13.9-5.7 5.3 0 10.2 2 13.9 5.7 1 1 1.9 2.1 2.6 3.2.3.5.9.8 1.4.8h5.8c.5 0 .9-.5.7-1-.3-.7-.6-1.3-1-2-.3-.5-.3-1.2 0-1.7l1.9-3.5c.4-.7.3-1.5-.3-2.1l-4.9-4.9c-.6-.6-1.4-.7-2.1-.3l-3.6 2c-.5.3-1.2.3-1.7 0-1.7-.9-3.5-1.7-5.4-2.2-.6-.2-1-.6-1.2-1.2l-1.1-3.9C40.1.5 39.5 0 38.7 0h-6.9C31 0 30.2.5 30 1.3l-1.1 3.9c-.2.6-.6 1-1.2 1.2-1.9.6-3.6 1.3-5.3 2.2-.5.3-1.2.3-1.7 0l-3.6-2c-.7-.4-1.5-.3-2.1.3l-4.9 4.9c-.6.6-.7 1.4-.3 2.1l2 3.6c.3.5.3 1.2 0 1.7-.9 1.7-1.7 3.5-2.2 5.3-.2.6-.6 1-1.2 1.2l-3.9 1.1c-.7.2-1.3.9-1.3 1.7v6.9c0 .8.5 1.5 1.3 1.7l3.9 1.1c.6.2 1 .6 1.2 1.2.5 1.9 1.3 3.6 2.2 5.3.3.6.3 1.2 0 1.7l-2 3.6c-.4.7-.3 1.5.3 2.1L15 57c.6.6 1.4.7 2.1.3l3.6-2c.6-.3 1.2-.3 1.7 0 1.7.9 3.5 1.7 5.3 2.2.6.2 1 .6 1.2 1.2l1.1 3.9c.2.7.9 1.3 1.7 1.3h6.9c.8 0 1.5-.5 1.7-1.3l1.1-3.9c.2-.6.6-1 1.2-1.2 1.9-.6 3.6-1.3 5.4-2.2.5-.3 1.2-.3 1.7 0l3.6 2c.7.4 1.5.3 2.1-.3l4.9-4.9c.6-.6.7-1.4.3-2.1l-2-3.5z" fill="#67c52a"/><path d="M23.5 37.7v4.4h23.8v-4.4H23.5zm0-7.8v4.4h19.6v-4.4H23.5zm0-7.9v4.4h23.8V22H23.5z" fill="#3c3c3f"/></g></switch></svg>`;
    static successIcon      = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="25" height="25"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`

    constructor() {

        super();
        this.setAttribute('is', ShowInGodboltButton.HTMLElement_name)

        this.title = ShowInGodboltButton.title;
        this.innerHTML = ShowInGodboltButton.icon;

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
AwesomeCodeElement.details.utility.customElements_define_once(
    AwesomeCodeElement.details.HTML_elements.buttons.show_in_godbolt.HTMLElement_name,
    AwesomeCodeElement.details.HTML_elements.buttons.show_in_godbolt, {extends: 'button'}
);
AwesomeCodeElement.details.HTML_elements.LoadingAnimation = class LoadingAnimation {
    
    static HTMLElement_name = 'ace-loading-animation'

    static #cache = (function(){
    // TODO: loading_animation.* as opt-in, inline (raw github data) as fallback
        const loading_animation_fallback_url = 'https://raw.githubusercontent.com/GuillaumeDua/awesome-code-element/main/resources/images/loading_animation.svg'
        let value = document.createElement('img');
            value.src = loading_animation_fallback_url
            value.id = LoadingAnimation.HTMLElement_name
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

        const target_visible_display = target_accessor().style.display

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
AwesomeCodeElement.details.HTML_elements.deferedHTMLElement = class extends HTMLElement {
// HTMLElements that handles defered initialization
//  if first added to the DOM empty, then triggers initialization when a first child is attached
//  otherwise, initialize when created

//  interface:
//  - acquire_parameters({}) -> bool(ready_to_initialize?)
//  - initialize()

    _parameters = {} // temporary storage for possibly constructor-provided arguments

    constructor(parameters) {
        super();

        console.debug('deferedHTMLElement', parameters, this._parameters)

        AwesomeCodeElement.details.utility.unfold_into({
            target: this._parameters,
            properties: parameters || {}
        })

        // explicit, user-provided attributes
        if (this._parameters.attributes) {
            console.debug(`AwesomeCodeElement.details.HTML_elements.deferedHTMLElement: constructor: explicit attributes:`, this._parameters.attributes)
            for (const property in this._parameters.attributes)
                this.setAttribute(property, this._parameters.attributes[property])
        }
    }
    connectedCallback() {
        console.debug('AwesomeCodeElement.details.HTML_elements.deferedHTMLElement: connectedCallback')
        try {
            if (!this.acquire_parameters(this._parameters)) {
                console.debug('AwesomeCodeElement.details.HTML_elements.deferedHTMLElement: create shadowroot slot')
                this.shadowroot_accessor = AwesomeCodeElement.details.utility.create_shadowroot_slot(
                    this, () => { this.#shadow_root_callback() }
                )
            }
            else {
                console.debug('AwesomeCodeElement.details.HTML_elements.deferedHTMLElement: no need for shadowroot slot')
                this.initialize()
            }
        }
        catch (error) {
            // TODO: error.stack seems to be truncated for some reasons ?
            console.error('ace.details.defered_HTMLElement: error:', error, error.stack)
            this.on_critical_internal_error(error)
        }
    }
    #shadow_root_callback() {
    // defered initialization
        let error = (() => {
            try {
                return this.acquire_parameters(this._parameters)
                    ? undefined
                    : 'acquire_parameters failed (no detailed informations)'
            }
            catch (error) {
                return error
            }
        })()

        // this.shadowroot_accessor.remove()

        if (error) {
            this.on_critical_internal_error(error)
            return
        }
        this.initialize()
    }
    acquire_parameters(parameters) {
    // acquire parameters for defered initialization
        // store everything
        
        AwesomeCodeElement.details.utility.unfold_into({
            target: this._parameters,
            properties: parameters || {}
        })

        return false
    }
}


// ----

class language_policies {

    static detectors = class {
        static check_concept = function(argument) {
            return argument
                && argument.is_valid_language
                && argument.get_language
                && argument.detect_language
        }

        static use_none = class {
            static is_valid_language(language){ return true; }
            static get_language_name(maybe_alias){ return maybe_alias; }
            static get_language(element){
                return 'n/a'
            }
            static detect_language(text){
                return {
                    language: 'n/a',
                    relevance: 10,
                    value: text
                }
            }
        }
        static use_hljs = class use_hljs_language_detector_policy {
            static is_valid_language(language){
                return hljs.getLanguage(language) !== undefined
            }
            static get_language_name(maybe_alias){
                const language = hljs.getLanguage(maybe_alias)
                return language ? language.name : undefined
            }
            static get_language(element){

                if (element === undefined || !(element instanceof HTMLElement))
                    throw new Error(`ace.language_policies.get_language(element): bad input`)

                const result = element.classList.toString().match(/language-(\w+)/, '') // expected: "hljs language-[name]"
                return Boolean(result && result.length === 1)
                    ? (result[1] === "undefined" ? undefined : result[1])
                    : undefined // first capture group
            }
            static detect_language(text){
                if (text === undefined || !(typeof text === 'string'))
                    throw new Error(`ace.language_policies.detect_language(text): bad input`)
                const result = hljs.highlightAuto(text) ?? {}
                return {
                    language: result.language,
                    relevance: result.relevance,
                    value: result.value
                }
            }
        }
    }

    static highlighters = class {
        static check_concept = function(argument) {
            return argument
                && argument.highlight
        }

        static use_none = class {
            static highlight({ code_element, language }){
                return {
                    relevance: 10,
                    language: language ?? 'n/a',
                    value: code_element.innerHTML
                }
            }
        }
        static use_hljs = class use_hljs {
    
            static #highlight_dry_run({ code_element, language }){
                if (!code_element || !(code_element instanceof HTMLElement))
                    throw new Error('use_hljs.highlight: invalid argument. Expect [code_element] to be a valid HTMLElement')
                if (language && !language_policies.detectors.use_hljs.is_valid_language(language)) {
                    console.warn(`use_hljs.highlight: invalid language [${language}], attempting fallback detection`)
                    language = undefined
                }
                
                const result = language
                    ? hljs.highlight(code_element.textContent, { language: language })
                    : hljs.highlightAuto(code_element.textContent)
                if (result.relevance < 5)
                    console.warn(
                        `use_hljs.highlight: poor language relevance [${result.relevance}/10] for language [${result.language}]\n`,
                        `Perhaps the code is too small ? (${code_element.textContent.length} characters):`, result
                    )
                return result
            }
            static highlight({ code_element, language }){
                const result = use_hljs.#highlight_dry_run({
                    code_element: code_element,
                    language: language
                })
                code_element.innerHTML = result.value
    
                language = language_policies.detectors.use_hljs.get_language_name(result.language)
                const update_classList = () => {
                    code_element.classList = [...code_element.classList].filter(element => !element.startsWith('language-') && element !== 'hljs')
                    code_element.classList.add(`hljs`)
                    code_element.classList.add(`language-${language}`) // TODO:useless?
                }
                update_classList()
                return result
            }
        }
    }
}

class utility {
    static inject_field_proxy = function(target, property_name, { getter_payload, setter_payload } = {}) {
    // generate a proxy to a value's field, injecting optional payload

        if (1 === (Boolean(target.__lookupSetter__(property_name) === undefined)
                +  Boolean(target.__lookupGetter__(property_name) === undefined)
        ))   console.warn(`utility.inject_field_proxy: target property [${target.constructor.name}.${property_name}] has a getter but no setter, or vice-versa`)
        
        var _target = target
        var storage = _target[property_name]
        const target_getter = (() => {
            const value = _target.__lookupGetter__(property_name)
            return value
                ? value.bind(target)
                : () => { return storage }
        })()
        const target_setter = (() => {
            const value = _target.__lookupSetter__(property_name)
            return value
                ? value.bind(_target)
                : (argument) => { storage = argument }
        })()
        
        Object.defineProperty(_target, property_name, {
            get: getter_payload
                ? () => {
                    const value = target_getter()
                    return getter_payload(value) ?? value
                }
                : () => { return target_getter() },
            set: setter_payload
                ? (value) => {
                    value = setter_payload(value)
                    target_setter(value)
                }
                : (value) => { target_setter(value) }
        });
    
        return {
            get: _target.__lookupGetter__(property_name),
            set: _target.__lookupSetter__(property_name)
        }
    }
}

class code_policies {

    static parser = class parser {

        static check_concept = function(argument) {
            return argument
                && argument.parse
        }

        static result_type = class {
            constructor(arg){ Object.assign(this,arg) }
            
            raw        = undefined
            to_display = undefined
            to_execute = undefined
            ce_options = {}
        }

        static no_parser = class {
            static parse({ code }){
                return new code_policies.parser.result_type({
                    raw: code,
                    to_display: code,
                    to_execute: code
                })
            }
        }
        static ace_metadata_parser = class ace_metadata_parser {
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

            static tag = '// @ace'
            static parse({ code }) {

                if (code === undefined)
                    throw new Error('code_policies.parser.ace_metadata_parser.parse: invalid argument')

                let result = new code_policies.parser.result_type({ raw: code })
                    result = ace_metadata_parser.#parse_impl({ result: result})
                    result = ace_metadata_parser.#apply_ce_transformations({ result: result })

                // TODO: (elsewhere!!!) merge local with global
                // apply default configuration for a given - non-mandatory - language
                // Note: global configuration can be overrided locally in the configuration
                // if (AwesomeCodeElement.API.configuration.CE.has(language))
                //     this.ce_options = AwesomeCodeElement.API.configuration.CE.get(language)

                return result
            }
            static #parse_impl({ result }) {

                let code_content = result.raw
        
                {   // CE options
                    const regex_match_json_pattern = '\{(?:[^{}]|(?:\{[^{}]*\}))*\}'
                    const regexp = new RegExp(`^\\s*?${code_policies.parser.ace_metadata_parser.tag}::CE=(${regex_match_json_pattern})\s*?\n?`, 'gm')
                    const matches = [...result.raw.matchAll(regexp)] // expect exactly 1 match
                    if (matches.length > 1)
                        console.warn(
                            `code_policies.parser.ace_metadata_parser.parse: found multiples CE configurations\n`,
                            ...matches.map((value) => value.at(0))
                        )
            
                    // reversed twiced array: because we are altering the original `code_content` here, yet prevalence matters
                    matches.reverse().map((match) => {
                        const value = match[1].replaceAll(
                            new RegExp(`^\\s*?//`, 'gm'),
                            ''
                        )
                        // remove from original content
                        code_content = code_content.slice(0, match.index)
                                    + code_content.slice(match.index + match[0].length)
                        return value
                    }).reverse().forEach((value) => {

                        // Merge CE configuration. Local can override global.
                        result.ce_options = {
                            ...(result.ce_options || {}),
                            ...JSON.parse(value)
                        }
                    })
                }
        
                // skip block, line (documentation & execution sides)
                // block
                code_content = code_content.replaceAll(
                    new RegExp(`^\\s*?${code_policies.parser.ace_metadata_parser.tag}::skip::block::begin\n(.*?\n)*\\s*?${code_policies.parser.ace_metadata_parser.tag}::skip::block::end\\s*?$`, 'gm'),
                    ''
                )
                // line
                code_content = code_content.replaceAll(
                    new RegExp(`^.*?\\s+${code_policies.parser.ace_metadata_parser.tag}::skip::line\\s*$`, 'gm'),
                    ''
                )
        
                // show block, line (documentation side)
                const code_only_show = (() => {
                    const regex_show_block  = `(^\\s*?${code_policies.parser.ace_metadata_parser.tag}::show::block::begin\n(?<block>(^.*?$\n)+)\\s*${code_policies.parser.ace_metadata_parser.tag}::show::block::end\n?)`
                    const regex_show_line   = `(^(?<line>.*?)\\s*${code_policies.parser.ace_metadata_parser.tag}::show::line\\s*?$)`
                    const regexp = new RegExp(`${regex_show_block}|${regex_show_line}`, 'gm')
                    const matches = [...code_content.matchAll(regexp)]
                    return matches
                        .reverse()
                        .map((match) => {
                            const result = match.groups.block !== undefined
                                ? match.groups.block
                                : match.groups.line
                            // remove from original content
                            // code_content = code_content.replace(match[0], result) // really slower than 2 reverse + 2 substring ?
                            code_content = code_content.substring(0, match.index) + result + code_content.substring(match.index + match[0].length)
                            return result
                        })
                        .reverse()
                        .join('\n')
                })()
        
                result.to_display = (code_only_show !== "" ? code_only_show : code_content)
                result.to_execute = code_content

                return result
            }
            static #apply_ce_transformations({ result }) {
        
                // includes_transformation
                if (result.ce_options && result.ce_options.includes_transformation) {
                    result.ce_options.includes_transformation.forEach((value) => {
                        // replace includes
        
                        const regex = new RegExp(`^(\\s*?\\#.*?[\\"|\\<"].*?)(${value[0]})(.*?[\\"|\\>"])`, 'gm')
                        result.to_execute = result.to_execute.replace(regex, `$1${value[1]}$3`)
                    })
                }
                return result
            }
        }
    }
}

class code_mvc_factory {
// acquire { model, view } from an HTMLElement
//  model: inner text considered as plain code: any invalid nodes injected by the HTML rendering are removed
//  view : either a pre>code or the given element, if the later contains valid HTML elements
    static html_parser = class html_parser {
        static is_valid_HTMLElement({ element }){
            if (element === undefined)
                throw new Error('ace.details.code_mvc_factory.html_parser.is_valid_HTMLElement: invalid argument')
            return element instanceof HTMLElement && !(element instanceof HTMLUnknownElement)
        }
        static #valid_tagName_cache = new Map
        static is_valid_tagName({ tagName }) {
            if (element === undefined)
                throw new Error('ace.details.code_mvc_factory.html_parser.is_valid_tagName: invalid argument')
            if (!(typeof tagName === 'string') && !(tagName instanceof String))
                throw new Error('html_parser.is_valid_tagName: invalid argument')

            return (() => {
                let value = this.#valid_tagName_cache.get(tagName)
                if (!value) {
                    value = html_parser.is_valid_HTMLElement({ element: document.createElement(tagName) })
                    this.#valid_tagName_cache.set(tagName, value)
                }
                return value
            })()
        }
        static count_valid_childrens({ element, is_recursive = false }) {
            if (element === undefined)
                throw new Error('ace.details.code_mvc_factory.html_parser.count_valid_childrens: invalid argument')
            return Array
                .from(element.children)
                .map((element) => {
                    return 0
                        + html_parser.is_valid_HTMLElement({ element: element })
                        + (is_recursive ? html_parser.count_valid_childrens({ element: element, is_recursive: is_recursive }) : 0)
                })
                .reduce((total, current) => total + current, 0)
        }
        static to_code({ elements }) {
        // expect Array.from(node.childNodes)
        // TODO?: faster approach?: use regex on outerHTML: \<(?'closing'\/?)(?'tagname'\w+\-?)+.*?\>
        // replace invalid HTMLElement by their localName as text
            if (elements === undefined)
                throw new Error('ace.details.code_mvc_factory.html_parser.count_valid_childrens: invalid argument')
            return elements
                .map(element => {
                    switch (element.nodeType) {
                        case Node.TEXT_NODE:
                            return element.textContent
                        case Node.ELEMENT_NODE:
                            if (html_parser.is_valid_HTMLElement({ element: element }))
                                return html_parser.to_code({ elements: Array.from(element.childNodes) })
                            // invalid tagname are kept as text, to preserve include semantic.
                            //  e.g: `<iostream>` in `#include <iostream>`
                            return `<${element.localName}>${html_parser.to_code({ elements: Array.from(element.childNodes) })}`
                        case Node.COMMENT_NODE:
                        case Node.CDATA_SECTION_NODE:
                        default:
                            console.debug(`code_mvc_factory.parser.to_code: unhandled tags [comment, cdata, etc.]`)
                            return ''                        
                    }
                })
                .join('')
        }
        static cleanup({ element }){
        // recursively replaces invalid childrens element by their tagname as text
            if (element === undefined)
                throw new Error('ace.details.code_mvc_factory.html_parser.cleanup: invalid argument')

            let childNodes = Array.from(element.childNodes)
            childNodes
                .filter(element => element.nodeType === HTMLElement.ELEMENT_NODE)
                .forEach(element => {
                    html_parser.#cleanup_impl({ element: element })
                })
            return element
        }
        static #cleanup_impl({ element }){
        // recursively replaces invalid element by their tagname as text

            if (element === undefined)
                throw new Error('ace.details.code_mvc_factory.html_parser.cleanup_impl: invalid argument')

            let childNodes = Array.from(element.childNodes)                                         // preserve reference/offset integrity
            if (!html_parser.is_valid_HTMLElement({ element: element })) {
                const nodes_attr_as_text = `${element.attributes.length ? '/' : ''}${Array.from(element.attributes).map(value => value.name).join('/')}`
                const node_text          = `<${element.localName}${nodes_attr_as_text}>`            // #include <toto/b.hpp> : `toto` is the invalid tag, `b.hpp` its attribute
                element.previousSibling.appendData(node_text)                                       // replace by text
                childNodes.forEach(node => element.parentNode.insertBefore(node, element))          // transfert childrensNodes to parent
                element = element.parentNode.removeChild(element)                                   // remove the element
            }
            childNodes
                .filter(element => element.nodeType === HTMLElement.ELEMENT_NODE)
                .forEach(element => {
                    html_parser.#cleanup_impl({ element: element })
                })
        }
    };

    static result_type = class {

        constructor(argument){

            Object.assign(this, argument)
            Object.seal(this)
        }

        model = undefined
        view = { top_parent: undefined, code_container: undefined }

        is_mutable = false
    }

    static is_expected_layout(element){
        if (!(element instanceof HTMLElement))
            throw new Error('code_mvc_factory.is_expected_layout: invalid argument')
        return (element.localName === 'pre'
             && element.childElementCount === 1
             && element.children[0].nodeType === Node.ELEMENT_NODE
             && element.children[0].localName === 'code'
        )
    }

    static build_from(argument) {

        if (argument instanceof code_mvc_factory.result_type)
            return argument

        argument ??= ''

        let result = (() => {

            if (undefined === argument
            ||  argument.text !== undefined)
                return code_mvc_factory.#build_from_text(argument.text)
            if (argument.element !== undefined)
                return code_mvc_factory.#build_from_element(argument.element)
            if (argument.nodes !== undefined)
                return code_mvc_factory.#build_from_nodes(argument.nodes)

            return code_mvc_factory.#build_from(argument)
        })()
            result.model = (result.model ?? '')
                .replace(/^\s*/, '')
                .replace(/\s*$/, '') // remove enclosing white-spaces
            if (result.is_mutable)
                result.view.code_container.textContent = result.model
        return result
    }

    static #build_from(argument){

        if (argument instanceof HTMLElement)
            return code_mvc_factory.#build_from_element(argument)
        else if (argument instanceof Array
              && argument.reduce((index, arg) => undefined !== arg.nodeType, true))
        {
            let only_one_valid_element = (() => {
                const no_ws_elements = argument.filter((element) => !(element.nodeType === Node.TEXT_NODE && /^\s+$/g.test(element.textContent)))
                return no_ws_elements.length === 1 && code_mvc_factory.html_parser.is_valid_HTMLElement({ element: no_ws_elements[0] })
                    ? no_ws_elements[0]
                    : undefined
            })()
            return only_one_valid_element
                ? code_mvc_factory.#build_from_element(only_one_valid_element)
                : code_mvc_factory.#build_from_nodes(argument)
        }
        else if (argument.nodeType === document.TEXT_NODE)
            return code_mvc_factory.#build_from_text(argument.textContent)
        else
            return code_mvc_factory.#build_from_text(argument.toString())
    }
    static #build_from_text(value){

        return new code_mvc_factory.result_type({
            is_mutable : true,
            model : value ?? '',
            view : (() => {
                let value = document.createElement('pre')
                let code_node = value.appendChild(document.createElement('code'))
                    code_node.textContent = value
                return { top_parent: value, code_container: code_node }
            })()
        })
    }
    static #build_from_element(element){

        if (!(element instanceof HTMLElement))
            throw new Error('code_mvc_factory.#build_from_element: invalid argument')

        const view = {
            top_parent : element,
            code_container : code_mvc_factory.is_expected_layout(element)
                ? element.firstElementChild
                : element
        }

        const is_mutable = !Boolean(code_mvc_factory.html_parser.count_valid_childrens({ element: view.code_container, is_recursive: true }))

        return new code_mvc_factory.result_type({
            is_mutable : is_mutable,
            model : (() => {
                element = code_mvc_factory.html_parser.cleanup({ element: view.code_container })
                return code_mvc_factory.html_parser.to_code({ elements: Array.from(view.code_container.childNodes) })
            })(),
            view : view
        })
    }
    static #build_from_nodes(elements){
    // expected: Array.from(node.childNodes)

        if (!(
            elements instanceof Array
        &&  elements.length !== 0
        &&  elements.reduce((index, arg) => undefined !== arg.nodeType, true)
        ))  throw new Error('code_mvc_factory.#build_from_nodes(array): invalid argument')

        // const parent = (() => { // have common parent
        //     const parent = elements[0].parentNode
        //     if (elements.reduce((index, arg) => arg.parentNode !== parent, true))
        //         throw new Error('code_mvc_factory.#build_from_nodes(array): nodes does not have a common parentNode')
        //     return parent
        // })()

        const code_content = (() => {
            
            elements.forEach((element) => code_mvc_factory.html_parser.cleanup({ element: element }))
            return elements
                .map((element) => { 
                    return code_mvc_factory.html_parser.to_code({
                        elements: [ element ]
                    })
                })
                .join('')
        })()
        // return new code_mvc_factory.result_type({
        //     is_mutable : false,
        //     model : code_content,
        //     view : { top_parent: element, code_container: element }
        // })
        return code_mvc_factory.#build_from_text(code_content)
    }
}

class NotifyPropertyChangedInterface {

    #handlers = new Map

    constructor(args){
        if (!args)
            return
        if (!(arg instanceof Array))
            throw new Error('NotifyPropertyChangedInterface.constructor: invalid argument')

        args.forEach((value, index) => {
            if (!(value instanceof Array) || value.length !== 2)
                throw new Error(`NotifyPropertyChangedInterface.constructor: invalid argument (at index ${index})`)
            this.add_OnPropertyChangeHandler(value[0], value[1])
        })
    }

    add_OnPropertyChangeHandler({property_name, handler}) {
        if (!(handler instanceof Function))
            throw new Error('NotifyPropertyChangedInterface.add_OnPropertyChangeHandler: invalid argument')
        this.#handlers.set(property_name, handler)
    }
    remove_OnPropertyChangeHandler({property_name}) {
        this.#handlers.delete(property_name)
    }

    NotifyPropertyChanged({property_name}){
        const handler = this.#handlers.get(property_name)
        if (handler)
            handler({
                property_name: property_name,
                value: this[property_name]
            })
    }
}

class code_mvc extends NotifyPropertyChangedInterface{

    #language_policies = {
        detector: undefined,
        highlighter: undefined
    }
    #parser = undefined

    // language
    #language = undefined
    get language() {

        const value = (() => {
            if (this.#language_policies.detector.is_valid_language(this.#language))
                return this.#language
        
            console.info('ace.code.get(language) : invalid language, attempting fallback detections')
            return this.#language_policies.detector.get_language(this.view.code_container)
                ?? this.#language_policies.detector.detect_language(this.model).language
        })()
        if (this.toggle_language_detection)
            this.#language = value
        return value
    }
    set language(value) {

        const argument = (() => {
            const language_name = this.#language_policies.detector.get_language_name(value)
            const is_valid_input = Boolean(language_name)
            return {
                language_name: language_name,
                is_valid: is_valid_input
            }
        })()

        if (this.#language === argument.language_name && argument.is_valid)
            return

        if (this.toggle_language_detection = !argument.is_valid)
            console.warn(`ace.details.code.set(language): invalid input [${value}], attempting fallback detection.`)

        const result = this.is_mutable
            ? this.#language_policies.highlighter.highlight({
                code_element: this.view.code_container,
                language: this.toggle_language_detection ? undefined : argument.language_name
            })
            : this.#language_policies.detector.detect_language(this.model)

        // if (this.toggle_language_detection)
        this.#language = this.#language_policies.detector.get_language_name(result.language) // note: possibly not equal to `value.input`
        this.toggle_language_detection = Boolean(result.relevance <= 5)
        // this.ce_options = AwesomeCodeElement.API.configuration.CE.get(this.#language) // TODO: uncomment when integrated

        this.NotifyPropertyChanged('language')
    }

    // language_detection
    #toggle_language_detection = true
    set toggle_language_detection(value) {
        this.#toggle_language_detection = value
        this.NotifyPropertyChanged('toggle_language_detection')
    }
    get toggle_language_detection() {
        return  this.#toggle_language_detection
            || !this.#language_policies.detector.is_valid_language(this.#language)
    }

    #toggle_parsing = undefined
    #model = undefined

    static default_arguments = {
        options: {
            language : undefined, // TODO: global configuration < local < in-code (ce_options)
            toggle_parsing : false,
            toggle_language_detection : true
        },
        language_policy: {
            detector:    language_policies.detectors.use_hljs,
            highlighter: language_policies.highlighters.use_hljs
        }
    }

    view = undefined
    model = undefined
    is_mutable = undefined
    toggle_parsing = undefined

    constructor({
        code_origin,
        language_policy = code_mvc.default_arguments.language_policy,
        options = code_mvc.default_arguments.options
    }){
        super()

        Object.assign(this, code_mvc_factory.build_from(code_origin))
        
        const is_mutable = this.is_mutable
        Object.defineProperty(this, 'is_mutable', {
            get: () => { return is_mutable },
            set: () => { console.warn('ace.details.code.set(is_mutable): no-op, const property') },
        })

        this.#language_policies = language_policy
        this.#initialize_behaviors(options)
        this.#language = this.#language_policies.detector.get_language_name(this.#model.ce_options.language ?? options.language)
        this.toggle_language_detection = Boolean(options.toggle_language_detection) && !Boolean(this.#model.ce_options.language)
        this.#toggle_parsing |= Boolean(this.#model.ce_options)
        this.update_view()
    }

    #initialize_behaviors(options){
    // [ const | mutable ] specific behaviors

        this.#parser = this.is_mutable
            ? code_policies.parser.ace_metadata_parser
            : code_policies.parser.no_parser

        if (!this.is_mutable) {
            console.warn(
                'ace.details.code.constructor: invalid language_policies.highlighter for non-mutable/const code mvc\n',
                `was [${this.#language_policies.highlighter.name}], switching to fallback [language_policies.highlighters.use_none]`
            )
            this.#language_policies.highlighter = language_policies.highlighters.use_none
        }

        if (!language_policies.detectors.check_concept(this.#language_policies.detector))
            throw new Error('ace.details.code.constructor: invalid argument (language_policy.detector)')
        if (!language_policies.highlighters.check_concept(this.#language_policies.highlighter))
            throw new Error('ace.details.code.constructor: invalid argument (language_policy.highlighter)')
        if (!code_policies.parser.check_concept(this.#parser))
            throw new Error('ace.details.code.constructor: invalid argument (parser)')

        this.update_view = this.is_mutable
            ? () => {
                this.view.code_container.textContent = this.model
                if (this.toggle_language_detection)
                    this.language = undefined // will trigger auto-detect
                else
                    this.#language_policies.highlighter.highlight({ code_element: this.view.code_container, language: this.language })
            }
            : () => {}

        this.#model = (() => {

            const value = this.#parser.parse({ code: this.model })
            Object.defineProperty(this, 'model', {
                get: this.is_mutable
                    ? () => { return this.toggle_parsing ? this.#model.to_display : this.#model.raw }
                    : () => { return this.#model.raw },
                set: (value) => {
                    this.#model = this.#parser.parse({ code: value })
                    this.update_view()
                    this.NotifyPropertyChanged('model')
                }
            })
            return value
        })()
        this.#toggle_parsing = (() => {

            Object.defineProperty(this, 'toggle_parsing', {
                get: () => { return this.#toggle_parsing },
                set: this.is_mutable
                    ? (value) => { 
                        this.#toggle_parsing = value
                        this.update_view()
                        this.NotifyPropertyChanged('toggle_parsing')
                    }
                    : ()      => { console.warn('code.set(toggle_parsing): no-op: not editable') }
            })
            return Boolean(options.toggle_parsing)
        })()
    }
}

// TODO:
//  - resize observer
//  - DeferedHTMLElement
class ace_cs_HTMLElement_factory {
// HTML layout/barebone for CodeSection

    static layout_policies = class layout_policies {
        static basic = class {
            static make(argument){
                if (!(argument instanceof code_mvc)
                 || !argument.is_mutable
                 || !code_mvc_factory.is_expected_layout(argument.view.top_parent)
                )   throw new Error('ace_cs_HTMLElement_factory.layout_policies.basic: invalid argument')
                return {
                    container: argument.view.top_parent,
                    content: argument.view.top_parent.firstElementChild
                }
            }
        }
        static wrap = class {
            static make(argument){
                if (!(argument instanceof code_mvc))
                    throw new Error('ace_cs_HTMLElement_factory.layout_policies.wrap: invalid argument')
                if (code_mvc_factory.is_expected_layout(argument.view.top_parent))
                    console.warn('ace_cs_HTMLElement_factory.layout_policies.wrap: wrapping on an default layout. Consider using layout_policies.basic instead')

                let container = document.createElement('div')
                let content   = container.appendChild(target)
                return {
                    container: container,
                    content: content
                }
            }
        }

        static always_best = class {
            static make(argument){
                if (!(argument instanceof code_mvc))
                    throw new Error('ace_cs_HTMLElement_factory.layout_policies.select_best_for: invalid argument')
                const best_policy = argument.is_mutable && code_mvc_factory.is_expected_layout(argument.view.top_parent)
                    ? layout_policies.basic
                    : layout_policies.wrap
                return best_policy.make(argument)
            }
        }
    }

    static make_HTML_layout(argument) {

        if (!(argument instanceof code_mvc)) 
            throw new Error('ace_cs_HTMLElement_factory.make_HTML_layout: invalid argument')

        let left_panel = (() => {

            let { container, content } = this.layout_policies.always_best.make(argument)

            let copy_button = new AwesomeCodeElement.details.HTML_elements.buttons.copy_to_clipboard()
                copy_button.style.zIndex = container.style.zIndex + 1
                copy_button = container.appendChild(copy_button)

            let CE_button = new AwesomeCodeElement.details.HTML_elements.buttons.show_in_godbolt()
                CE_button.style.zIndex = CE_button.style.zIndex + 1
                CE_button = container.appendChild(CE_button)

            AwesomeCodeElement.details.HTML_elements.LoadingAnimation.inject_into({
                owner:  container,
                target_or_accessor: content
            })

            return {
                container: container,
                content: content,
                buttons: {
                    CE: CE_button,
                    copy_to_clipboard: copy_button
                }
            }
        })()
        let right_panel = (() => {
            let container = document.createElement('pre')
            let content = document.createElement('code')
                content = container.appendChild(content)
            let copy_button = new AwesomeCodeElement.details.HTML_elements.buttons.copy_to_clipboard()
                copy_button = container.appendChild(copy_button)

            AwesomeCodeElement.details.HTML_elements.LoadingAnimation.inject_into({
                owner:  container,
                target_or_accessor: content
            })

            return { 
                container: container,
                content: content,
                buttons: {
                    copy_to_clipboard: copy_button
                }
            }
        })()

        // panels: add on_resize event
        const set_on_resize_event = ({panel, scrolling_element, elements_to_hide}) => {
            panel.on_resize = ace_cs_HTMLElement_factory.#make_event_on_resize_maybe_hide_elements({
                owner: scrolling_element,
                elements: Object.entries(elements_to_hide).map(element => element[1]) // structure-to-array
            })
            AwesomeCodeElement.details.HTML_elements.resize_observer.observe(panel)
        }
        set_on_resize_event({
            panel: left_panel.container,
            scrolling_element: left_panel.content,
            elements_to_hide: left_panel.buttons
        })
        set_on_resize_event({
            panel: right_panel.container,
            scrolling_element: right_panel.content,
            elements_to_hide: right_panel.buttons
        })

        return {
            panels: {
                left: left_panel,
                right: right_panel
            }
        }
    }
    static add_HTML_layout_to({owner, argument}) {

        if (!(owner instanceof HTMLElement))
            throw new Error('ace_cs_HTMLElement_factory.add_HTML_layout_to: invalid argument')
        
        let { panels } = ace_cs_HTMLElement_factory.make_HTML_layout(argument)
        owner.html_elements = { panels : panels }

        // add to owner
        owner.innerHTML = ""
        owner.appendChild(panels.left.container)
        owner.appendChild(panels.right.container)

        const initialize_ids = () => {
        // TODO: also dedicated classes?
            owner.id = owner.id || ace_cs_HTMLElement_factory.#id_generator()
            owner.html_elements.panels.left.container.id   = `${owner.id}.panels.left.container`
            owner.html_elements.panels.right.container.id  = `${owner.id}.panels.right.container`
            owner.html_elements.panels.left.content.id     = `${owner.id}.panels.left.content`
            owner.html_elements.panels.right.content.id    = `${owner.id}.panels.right.content`
            owner.html_elements.panels.left.buttons.CE.id                    = `${owner.id}.panels.left.buttons.CE`
            owner.html_elements.panels.left.buttons.copy_to_clipboard.id     = `${owner.id}.panels.left.buttons.copy_to_clipboard`
            owner.html_elements.panels.right.buttons.copy_to_clipboard.id    = `${owner.id}.panels.right.buttons.copy_to_clipboard`
        }
        initialize_ids()

        return owner
    }
    static #id_generator = (() => {
        const counter = (function*(){
            let i = 0;
            while (true) { yield i++; }
        })()
        return () => { return `cs_${counter.next().value}` }
    })()

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
}

// value = '';
// [ 'test_1', 'test_2', 'test_3', 'test_4', 'test_5 ].forEach((test_name, index) => {
//     console.debug(`processing test: ${test_name} ...`)
//     value = new code({
//         code_origin: document.getElementById(test_name),
//         language_policy: {
//             detector: language_policies.detectors.use_hljs,
//             highlighter: language_policies.highlighters.use_hljs
//         }
//     })
//     value.model
// })
// value.toggle_parsing = true
// value.language = 'cpp'

// TEST: cpp code -> bash
// value = new code({
//     code_origin: document.getElementById('test_1'),
//     language_policy: {
//        detector: language_policies.detectors.use_hljs,
//        highlighter: language_policies.highlighters.use_hljs
//     }
//  })
// value.model
// value.model = '[[ $0 ]] && echo "qwe"'
// value.language

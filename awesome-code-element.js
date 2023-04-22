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

// TODO: name: not `ace` (already exists: Ajax.org Cloud9 Editor)
// TODO: Documentation
// TODO: decoupled highlighter
//  - highlightjs
//  - https://github.com/EnlighterJS/EnlighterJS
// TODO: compatibility with Marp
// TODO: interface with [CodeMirror](https://codemirror.net/)
// -----
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
// TODO: use ?? vs ||
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
// TODO: console.xxx -> replace '\n\t' by ','-separated arguments ?
//          -  arguments homogeneity console.xxx(this.toString(), ...)
// TODO: remove useless funcs, class (if any)
// TODO: awesome-code-element.js: sub-modules aggregator
// TODO: style : px vs. em
// TODO: get rid of jquery ? -> document.querySelector
//      - check $.getScript for script loading
// TODO: wraps around a rich code editor block
// TODO: cleanup logs
// TODO: cleanup module: ease code navigation
//          - class-as-namespace
// TODO: unfold_to -> use Object.assign(a, b) ?
// TODO: naming consistency
// TODO: remove unused or unecessary code
// TODO: extends HTMLElements: prefix this lib methods => `ace_cs_${NAME}` ?
// TODO: opt-in: godbolt /api/shortener instead of ClientState ?
// TODO: feature: add compilation/execution duration information (useful for quick-performance comparisons)
// TODO: get [Symbol.toStringTag]()
// TODO: use synthax qwe?.asd?.zxc rather than ternary expressions
// TODO: avoid useless calls (get/set)
// TODO: test all network errors (url, execution)
// TODO: online/offline
//          - offline: local CE, existing dependencies
//          - online: at least one dependency is not local
// TODO: log debug sub-channels/contexts
// TODO: custom hljs language for execution output ? (and reduce "poor language relevance" noise)
// TODO: ace.cs: change url dynamically (attr binding)
// TODO: try/catch -> finally
// TODO: hljs: web-worker https://github.com/highlightjs/highlight.js/#using-web-workers
// TODO: static member ref: this.constructor.<name> rather than classname redundancy
// TODO: on page focus -> refresh toggle light/dark button icon

export { AwesomeCodeElement as default }

// ----------------------------------------------------------------------------------------------------------------------------

const AwesomeCodeElement = {
    API : {},
    details : {}
}

// ====================
// details.dependencies

AwesomeCodeElement.details.dependency_descriptor = class {
    constructor(args) {
        for (const property in args)
            this[property] = args[property]
        
        if (!this.name)
            throw new Error('AwesomeCodeElement.details.dependency_descriptor: invalid input: missing mandatory parameter [name]')
        if (!this.version_detector)
            throw new Error('AwesomeCodeElement.details.dependency_descriptor: invalid input: missing mandatory parameter [version_detector]')
    }

    name                = undefined
    version_detector    = () => { return undefined }
    url                 = ""
    is_mandatory        = false
    // TODO: post-dl configure ?
}
AwesomeCodeElement.details.dependency_manager = new class dependency_manager {

    dependencies = {}

    constructor(args = []) {
        if (!(args instanceof Array))
            throw new Error('AwesomeCodeElement.details.dependency_manager: invalid input: expect Array of dependency_descriptor')
        args.forEach(element => {
            element.version = element.version_detector()
            this.dependencies[element.name] = element
        })
    }

    async load_missing_dependencies() {
    // include missing mandatory dependencies asynchronously
        console.info('AwesomeCodeElement.details.dependency_manager: loading missing dependencies (this can take some time...)')
        let promises = Object.entries(this.dependencies)
            .map(([key, value]) => value)
            .filter(element => element.is_mandatory)
            .map(async element => {
                if (element.version_detector())
                    return
                const url = (element.url instanceof Function) ? element.url() : element.url
                if (!url)
                    throw new Error(`AwesomeCodeElement.details.dependency_manager: missing mandatory dependency [${element.name}], no fallback provided`)
                return dependency_manager
                    .include({name : element.name, url: url })
                    .then(() => {
                        // update version after loading
                        element.version = element.version_detector()
                    })
            })
        await Promise.all(promises)
    }

    static include({ name, url }) {
        console.info(`AwesomeCodeElement.details.dependency_manager.include: including dependency [${name}]`, `using url [${url}]`)

        let id = `ace-dependency_${name}`

        let element = document.getElementById(id)
        if (element && element.src === url)
            return

        element = document.createElement('script'); // TODO: link ?
        element.src  = url;
        element.type = 'text/javascript';
        element.defer = false;
        element.async = false;
        element.id = id;
        element.setAttribute('ace-dependecy-name', name)
        element = document.head.appendChild(element)

        return new Promise((resolve, reject) => {
            element.addEventListener('error', () => {
                reject(new Error(`AwesomeCodeElement.details.dependency_manager.include: failure: [${name}] using url [${url}]`))
            })
            element.addEventListener('load', () => {
                element.is_loaded = true
                console.info(`AwesomeCodeElement.details.dependency_manager.include: loaded: [${name}]`)
                resolve(element)
            })
        })
    }
    static get_imported_module_path(name) {
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
    }
}([
    new AwesomeCodeElement.details.dependency_descriptor({
        name:               'jquery',
        version_detector:   function(){ return (typeof jQuery !== "undefined") ? jQuery.fn.jquery : undefined },
        url :               'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js',
        is_mandatory:       true,

    }),
    new AwesomeCodeElement.details.dependency_descriptor({
        name:               'hljs',
        version_detector:   function(){ return (typeof hljs !== "undefined") ? hljs.versionString : undefined },
        is_mandatory:       true,
        url:                'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js'
    }),
    // todo: doxygen-awesome-css
    new AwesomeCodeElement.details.dependency_descriptor({
        name:               'doxygen_awesome_css_dark_mode',
        is_mandatory:       false,
        version_detector:   function(){
            return (typeof DoxygenAwesomeDarkModeToggle !== 'undefined')
                ? "not_impl_yet"
                : undefined
        }
    }),
    new AwesomeCodeElement.details.dependency_descriptor({
        name:               'doxygen',
        is_mandatory:       false,
        version_detector:   function(){
            let result = document.querySelector('meta[name=generator][content^=Doxygen]')
            if (!result)
                return undefined
            return result.getAttribute('content').replace('Doxygen ', '')
        }
    })
])
await AwesomeCodeElement.details.dependency_manager.load_missing_dependencies()

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
// TODO: as details
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

AwesomeCodeElement.API.configuration = class configuration {
    static #value = {
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
            doxygen:                        Boolean(AwesomeCodeElement.details.dependency_manager.dependencies.doxygen.version), // default: enabled if detected
            doxygen_awesome_css:            false,  // TODO: autodetect
            pre_code:                       false
        },
        auto_hide_buttons                   : false, // TODO: rename force_ or always_
        force_dark_light_scheme             : (() => {
            if (Boolean(AwesomeCodeElement.details.dependency_manager.dependencies.doxygen_awesome_css_dark_mode.version))
                return 'dark'
            if (Boolean(AwesomeCodeElement.details.dependency_manager.dependencies.doxygen.version))
                return 'light' // assuming doxygen does not handle light/dark-mode by default
            return undefined // auto-detect
        })()
    }
    static get value(){ return configuration.#value }

    static configure(arg){
        if (!arg)
            throw new Error('AwesomeCodeElement.API.configuration.configure: invalid argument')
    
        if (arg.CE && arg.CE instanceof Map)
            arg.CE = new AwesomeCodeElement.API.CE_ConfigurationManager([...arg.CE])
        if (arg.CE && !(arg.CE instanceof AwesomeCodeElement.API.CE_ConfigurationManager))
            throw new Error('AwesomeCodeElement.API.configure: invalid type for argument: [CE]')
    
        AwesomeCodeElement.details.utility.unfold_into({
            target : configuration.#value,
            properties : arg
        })

        configuration.#when_ready()
    }

    static #is_ready = false
    static get is_ready(){ return configuration.#is_ready }

    static #when_ready(){
        configuration.#is_ready = true
        configuration.#when_ready_callbacks.forEach((handler) => handler())
        configuration.#when_ready_callbacks = []
    }
    static #when_ready_callbacks = []
    static when_ready_then({ handler }){

        if (!handler || !(handler instanceof Function))
            throw new Error('configuration.when_ready_then: invalid argument type')

        if (configuration.#is_ready)
            handler()
        else configuration.#when_ready_callbacks.push(handler)
    }
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

    static accumulate_objects = (lhs, rhs) => {
        lhs ??= {}
        rhs ??= {}
        let result = { ...lhs }
        
        const keys = new Set([ ...Object.keys(lhs), ...Object.keys(rhs) ])
        keys.forEach((key) => {
            result[key] = rhs[key] ?? lhs[key]
        })
        return result
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
    // TODO: AddEventListener("abort", ...)
    // TODO: report progress
    // if (event.lengthComputable)
    //  const percentComplete = (event.loaded / event.total) * 100;

        let xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onerror = function() {
                on_error(`ace.details.utility.fetch_resource: network error on url [${url}]`)
            };
            xhr.onload = function() {

                if (xhr.status != 200) {
                    on_error(`ace.details.utility.fetch_resource: bad request status ${xhr.status} on url [${url}]`)
                    return;
                }
                on_success(xhr.responseText)
            };
            xhr.send();
        return xhr;
    }
    static make_incremental_counter_generator = function*(){
        let i = 0;
        while (true) { yield i++; }
    }
    static inject_field_proxy = function(target, property_name, { getter_payload, setter_payload } = {}) {
    // generate a proxy to a value's field, injecting optional payload
    //  getter: post-op
    //  setter: pre-op

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
                    return getter_payload(value)// ?? value
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
    // WIP: proxy on proxy: how to avoid multiples getter/setter calls
    static inject_on_property_change_proxy = function({ target, property_name, on_property_change } = {}) {
    // calls `on_property_change` when target[property_name] change
    // on_property_change: ({ argument, old_value, new_value }) => { ... }
    //  warning: assumes target[property_name] get/set reciprocity
    //  warning: the setter will call the getter

        const property_descriptor = Object.getOwnPropertyDescriptor(target, property_name)
                                 ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), property_name)
        if (property_descriptor === undefined
         || !property_descriptor.configurable)
            throw new Error(`ace.details.utility.inject_on_property_change_proxy: invalid property descriptor: ${target.toString()}[${property_name}] is not configurable`)

        var storage = target[property_name]
        delete target[property_name]

        const target_getter = (() => {
            if (property_descriptor.get)
                return property_descriptor.get.bind(target)
            return property_descriptor.value
                ? () => { return storage }
                : undefined
        })()
        const target_setter = (() => {
            if (property_descriptor.set)
                return property_descriptor.set.bind(target)
            return property_descriptor.value
                ? (value) => { return storage = value }
                : undefined
        })()

        let descriptor = {
            configurable: true,
            enumerable: true
        }
        if (target_getter)
            descriptor.get = () => {

                const result = target_getter()
                if (result === storage) return result

                const notify_property_changed = {
                    origin_op: 'get',
                    property_name: property_name,
                    old_value: storage,
                    new_value: result
                }
                storage = result
                // console.debug('proxy %cgetter:', 'color:green', target.toString(), notify_property_changed)
                on_property_change(notify_property_changed)

                return storage
            }
        if (target_setter)
            descriptor.set = (value) => {

                if (value === storage) return

                target_setter(value)

                const notify_property_changed = {
                    origin_op: 'set',
                    property_name: property_name,
                    old_value: storage,
                    new_value: value
                }
                storage = value
                // console.debug('proxy %csetter:', 'color:red', target.toString(), notify_property_changed)
                on_property_change(notify_property_changed)
            }

        Object.defineProperty(target, property_name, descriptor);

        return {
            origin: {
                get: target_getter,
                set: target_setter
            },
            transformed: {
                get: target.__lookupGetter__(property_name),
                set: target.__lookupSetter__(property_name)
            },
            revoke: () => Object.defineProperty(target, property_name, property_descriptor)
        }
    }
    static cancelable_setTimeout = function(func, delay){
        let update_controler = { canceled: false }
        setTimeout(() => {
            if (!update_controler.canceled)
                func()
        }, delay);
        return update_controler
    }

    static types = class types {
        static typename_of({ value }){
            if (!(value instanceof Object))
                throw new Error('ace.details.utility.types.typename_of: invalid argument')
            const matches = value.toString().match(/\[object (.+)\]/)
            return matches.length === 2 ? matches[1] : undefined
        }
        static is_string(value){ return typeof value === 'string' || value instanceof String }
        static is_int(value){ return !isNaN(value) && parseInt(Number(value)) == value }
        static is_empty(value){
            return Boolean(value)
                && Object.keys(value).length === 0
                && Object.getPrototypeOf(value) === Object.prototype
        }
        static projections = class {
            static no_op = {
                from: (value) => { return value },
                to:   (value) => { return value }
            }
            static boolean = {
                from: (value) => { return String(value) },
                to:   (value) => { return value === 'true' || false }
            }
            static integer = {
                from: (value) => { return String(value) },
                to:   (value) => { return parseInt(value) }
            }
            static float = {
                from: (value) => { return String(value) },
                to:   (value) => { return parseFloat(value) }
            }
            static string = {
                from: (value) => { return types.is_string(value) ? value : String(value) },
                to:   (value) => { return String(value) }
            }
        }
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

class data_binder{

    static get default_projection(){
        return {
            from: (value) => { return value },
            to:   (value) => { return value + '' },
        }
    }

    static get_property_descriptor({ owner, property_name }){
        return Object.getOwnPropertyDescriptor(owner, property_name)
            || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(owner), property_name)
            || {}
    }

    static #make_attribute_bound_adapter({ target, attribute_name, on_value_changed }){

        attribute_name = attribute_name.replace(/\s+/g, '_') // whitespace are not valid in attributes names
        if (!target || !(target instanceof HTMLElement) || !attribute_name)
            throw new Error('data_binder.#make_attribute_bound_adapter: invalid argument')
    
        let observer = (() => {
            let observer = undefined
            observer = new MutationObserver((mutationsList) => {
                for (let mutation of mutationsList) {
    
                    const value = mutation.target.getAttribute(mutation.attributeName)
                    if (mutation.oldValue === value)
                        continue
    
                    // console.debug('intercept mutation:', mutation.attributeName, ':', mutation.oldValue, '->', value)

                    if (on_value_changed)
                        on_value_changed(value)
                    else{
                    // reset to old value
                        observer.suspend_while(() => target.setAttribute(attribute_name, mutation.oldValue))
                        console.warn(
                            'data_binder.bound_attribute_adapter: data-source is read-only',
                            '\n\tcanceling requested attr change [', mutation.oldValue, '->', value, ']',
                            '\n\tinspect property [', attribute_name, '] of target', target
                        )
                    }
                }
            });
            observer.suspend_while = (action) => {
            //  warning: can result in race conditions
            //  TODO: process pending records ? MutationObserver.`takeRecords`
                observer.disconnect()
                action()
                observer.observe(target, { attributeFilter: [ attribute_name ], attributeOldValue: true });
            }
            observer.observe(target, { attributeFilter: [ attribute_name ], attributeOldValue: true });
            return observer
        })()
    
        return {
            owner: target,
            attribute_name: attribute_name,
            initiale: {
                get: () => target.getAttribute(attribute_name),
                set: (value) => observer.suspend_while(() => target.setAttribute(attribute_name, value))
            },
            revoke: () => { observer.disconnect() }
        }
    }
    
    static #make_property_bound_adapter({ owner, property_name, on_value_changed }){
    // uniform access to properties. for descriptor= { get and/or set, value }
        if (!owner || !property_name || !(property_name in owner) || !on_value_changed)
            throw new Error('data_binder.#make_property_bound_adapter: invalid argument')
    
        const descriptor = data_binder.get_property_descriptor({ owner: owner, property_name: property_name })
    
        let storage = descriptor.value // descriptor.value is mutable but mutating it has no effect on the original property's configuration
    
        const initiale = {
            get: (() => {
                if (descriptor.get)
                    return descriptor.get.bind(owner)
                if ('value' in descriptor)
                    return () => storage
                return undefined
            })(),
            set: (() => {
                if (descriptor.set)
                    return descriptor.set.bind(owner)
                if ('value' in descriptor)
                    return (value) => storage = value
                return undefined
            })()
        }

        const getter = initiale.get
            ? () => { 
                const value = initiale.get()
                on_value_changed(value)
                return value
            }
            : undefined
        const setter = initiale.set
            ? (value) => {
                initiale.set(value)
                on_value_changed(initiale.get ? initiale.get() : value)
            }
            : undefined

        Object.defineProperty(owner, property_name, {
            get: getter,
            set: setter,
            configurable: true
        })

        return {
            owner: owner,
            property_name: property_name,
            initiale: initiale,
            revoke: () => Object.defineProperty(owner, property_name, descriptor),
        }
    }

    static bind_attr({ data_source, attributes, projection }){
    // bind one data-source to {1,} attributes

        if (!data_source || !attributes || !(attributes instanceof Array) || attributes.length === 0)
            throw new Error('data_binder.bind_attr: invalid argument')

        projection ??= data_binder.default_projection

        // special case: rebinding (extending existing binding)
        const previous_binding = (({owner, property_name}) => {
            const descriptor = data_binder.get_property_descriptor({ owner: owner, property_name: property_name })
            return descriptor.get?.data_binding || descriptor.set?.data_binding
        })(data_source)

        if (previous_binding)
            return previous_binding.extend_binding({
                attributes: attributes,
                projection: projection
            })

        let attributes_adapters = undefined
        const broadcast_to_attributes = (value) => attributes_adapters.forEach((accessor) => accessor.initiale.set(value))
        const source_adapter = (({owner, property_name}) => {
            return data_binder.#make_property_bound_adapter({
                owner: owner,
                property_name: property_name,
                on_value_changed: broadcast_to_attributes
            })
        })(data_source)
        attributes_adapters = attributes.map(({target, attribute_name}, index) => {
            return data_binder.#make_attribute_bound_adapter({
                target: target,
                attribute_name: attribute_name,
                on_value_changed: source_adapter.initiale.set
                    ? (value) => data_source.owner[data_source.property_name] = projection.from(value) // update overrided model (will then broadcast to attributes)
                    : undefined // data-source is read-only
            })
        })

        const accessors = [ source_adapter, ...attributes_adapters ];
        // tag binding
        (({owner, property_name}) => {
            const descriptor = data_binder.get_property_descriptor({ owner: owner, property_name: property_name })
            const bound_attributes = attributes
            const data_binding = {
                extend_binding: ({ attributes, projection }) => {

                    if (!(attributes instanceof Array) || attributes.length === 0)
                        throw new Error('data_binder.make_binding: extend_binding: invalid argument')

                    // console.debug('extend_binding: from', bound_attributes, 'to', [ ...bound_attributes, ...attributes ])

                    accessors.forEach(({revoke}) => revoke())

                    return data_binder.bind_attr({
                        data_source: data_source,
                        attributes: [ ...bound_attributes, ...attributes ],
                        projection: projection
                    })
                }
            }
            if (descriptor.get) descriptor.get.data_binding = data_binding
            if (descriptor.set) descriptor.set.data_binding = data_binding
        })(source_adapter)

        // spread data_source initiale value
        if (source_adapter.initiale.get === undefined){
            console.debug(source_adapter)
            console.error('data_binder.bind_attr: data-source is write-only. Initiale value is undefined.', data_source)
            broadcast_to_attributes(undefined)
        }
        else broadcast_to_attributes(source_adapter.initiale.get())

        return { revoke: () => accessors.forEach((accessor) => accessor.revoke()) }
    }
    static synced_attr_view_controler({ target, data_sources }){
    // make target[attr] view-controler to data-source
        
        if (!target || !(target instanceof HTMLElement)
            || !data_sources || !(data_sources instanceof Array) || data_sources.length === 0
        ) throw new Error('make_attr_binding: invalid argument')
    
        return data_sources.map(({ owner, property_name, projection }) => {
    
            const { revoke } = data_binder.bind_attr({ 
                data_source: { owner: owner, property_name: property_name },
                attributes: [
                    { target: target,  attribute_name: property_name },
                ],
                projection: projection
            })
            return revoke
        })
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
    console.info(
        'ace.details.log_facility:',
        `\n\tchannels enabled : [${AwesomeCodeElement.details.log_facility.enabled}]`,
        `\n\tchannels disabled: [${AwesomeCodeElement.details.log_facility.disabled}]`
    )
}

// ======================
// HTML_elements : details

AwesomeCodeElement.details.HTML_elements = {}
// TODO: should be replaced by dynamic CSS at some point ?
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
    static copyIcon         = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`
    static successIcon      = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`
    static successDuration  = 980

    constructor() {
        super();
        this.setAttribute('is', CopyToClipboardButton.HTMLElement_name)

        this.title = CopyToClipboardButton.title
        this.innerHTML = CopyToClipboardButton.copyIcon

        this.addEventListener('click', function(){

            this.innerHTML = CopyToClipboardButton.successIcon
            this.style.fill = 'green'

            console.log(this)

            let text = this.parentElement.textContent
            navigator.clipboard.writeText(text).then(
                function() {
                    console.info('awesome-code-element.js:CopyToClipboardButton: success');
                },
                function(error) {
                    console.error(`awesome-code-element.js:CopyToClipboardButton: failed: ${error}`);
                }
            );
            window.setTimeout(() => {
                this.style.fill = ''
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
    static icon             = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><switch><g><path d="M58.6 46.5c-.3-.5-.3-1.2 0-1.7.3-.6.7-1.3 1-2 .2-.5-.1-1-.7-1h-5.8c-.6 0-1.2.3-1.4.8-.7 1.1-1.6 2.2-2.6 3.2-3.7 3.7-8.6 5.7-13.9 5.7-5.3 0-10.2-2-13.9-5.7-3.8-3.7-5.8-8.6-5.8-13.9s2-10.2 5.8-13.9c3.7-3.7 8.6-5.7 13.9-5.7 5.3 0 10.2 2 13.9 5.7 1 1 1.9 2.1 2.6 3.2.3.5.9.8 1.4.8h5.8c.5 0 .9-.5.7-1-.3-.7-.6-1.3-1-2-.3-.5-.3-1.2 0-1.7l1.9-3.5c.4-.7.3-1.5-.3-2.1l-4.9-4.9c-.6-.6-1.4-.7-2.1-.3l-3.6 2c-.5.3-1.2.3-1.7 0-1.7-.9-3.5-1.7-5.4-2.2-.6-.2-1-.6-1.2-1.2l-1.1-3.9C40.1.5 39.5 0 38.7 0h-6.9C31 0 30.2.5 30 1.3l-1.1 3.9c-.2.6-.6 1-1.2 1.2-1.9.6-3.6 1.3-5.3 2.2-.5.3-1.2.3-1.7 0l-3.6-2c-.7-.4-1.5-.3-2.1.3l-4.9 4.9c-.6.6-.7 1.4-.3 2.1l2 3.6c.3.5.3 1.2 0 1.7-.9 1.7-1.7 3.5-2.2 5.3-.2.6-.6 1-1.2 1.2l-3.9 1.1c-.7.2-1.3.9-1.3 1.7v6.9c0 .8.5 1.5 1.3 1.7l3.9 1.1c.6.2 1 .6 1.2 1.2.5 1.9 1.3 3.6 2.2 5.3.3.6.3 1.2 0 1.7l-2 3.6c-.4.7-.3 1.5.3 2.1L15 57c.6.6 1.4.7 2.1.3l3.6-2c.6-.3 1.2-.3 1.7 0 1.7.9 3.5 1.7 5.3 2.2.6.2 1 .6 1.2 1.2l1.1 3.9c.2.7.9 1.3 1.7 1.3h6.9c.8 0 1.5-.5 1.7-1.3l1.1-3.9c.2-.6.6-1 1.2-1.2 1.9-.6 3.6-1.3 5.4-2.2.5-.3 1.2-.3 1.7 0l3.6 2c.7.4 1.5.3 2.1-.3l4.9-4.9c.6-.6.7-1.4.3-2.1l-2-3.5z" fill="#67c52a"/><path d="M23.5 37.7v4.4h23.8v-4.4H23.5zm0-7.8v4.4h19.6v-4.4H23.5zm0-7.9v4.4h23.8V22H23.5z" fill="#3c3c3f"/></g></switch></svg>`;
    static successIcon      = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`
    static failureIcon      = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><line x1="2" y1="22" x2="22" y2="2" stroke="red" stroke-width="3"/><line x1="2" y1="2" x2="22" y2="22" stroke="red" stroke-width="3"/></svg>`

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
                this.style.borderColor = ''

                window.setTimeout(() => {
                    this.innerHTML = ShowInGodboltButton.icon
                    this.style.borderColor = ''
                    this.style.fill = 'black'
                }, 1000);

                try {
                    this.onClickSend()
                }
                catch (error){
                    this.innerHTML = ShowInGodboltButton.failureIcon
                    this.style.borderColor = 'red'
                    this.style.fill = 'red'
                    throw error
                }
            }
        );
    }

    onClickSend() {

        const code_mvc_HTMLelement_value = this.parentElement
        const code_mvc_value = (() => {
            if (!(code_mvc_HTMLelement_value instanceof code_mvc_HTMLElement))
                throw new Error('awesome-code-element.js: ShowInGodboltButton.onClickSend: ill-formed element: unexpected parentElement.parentElement layout (must be an ace.code_mvc_HTMLElement)')
            const value = code_mvc_HTMLelement_value.code_mvc
            if (!(value instanceof code_mvc))
                throw new Error('awesome-code-element.js: ShowInGodboltButton.onClickSend: ill-formed element: unexpected parentElement.parentElement.code_mvc (must be an ace.code_mvc)')
            return value
        })()

        console.info('awesome-code-element.js: ShowInGodboltButton.onClickSend: sending request ...')

        const accessor = {
            get ce_options(){
                return code_mvc_value.model_details.ce_options
                    || AwesomeCodeElement.API.configuration.value.CE.get(code_mvc_value.controler.language)
            },
            get language(){ return this.ce_options.language },
            get code(){ return code_mvc_value.model_details.to_execute }
        }

        try {
            if (!accessor.ce_options)
                throw new Error(`awesome-code-element.js:ShowInGodboltButton::onClickSend: missing CE configuration for language: [${code_mvc_value.controler.language}]`)

            if (!AwesomeCodeElement.details.remote.CE_API.languages.includes(accessor.language))
                //      hljs    https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md
                //  vs. CE      https://godbolt.org/api/languages
                throw new Error(`awesome-code-element.js:ShowInGodboltButton::onClickSend: invalid CE API language: [${accessor.language}]`);
        }
        catch (error){
            code_mvc_HTMLelement_value.status_for = { value: "error-CE-button", message: error, duration: 2000 }
            throw error
        }

        // build request as JSon
        const data = {
            "sessions": [{
                "id": 1,
                "language": accessor.language,
                "source": accessor.code,
                "compilers":  [
                    {
                        "id": accessor.ce_options.compiler_id || accessor.ce_options.compiler_id,
                        "libs": accessor.ce_options.libs || [],
                        "options": accessor.ce_options.compilation_options || accessor.ce_options.default_options
                    }
                ],
                "executors": [{
                    "compiler":
                    {
                        "id": accessor.ce_options.compiler_id,
                        "libs": accessor.ce_options.libs || [ ],
                        "options": accessor.ce_options.compilation_options || accessor.ce_options.default_options
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
AwesomeCodeElement.details.HTML_elements.defered_HTMLElement = class extends HTMLElement {
// HTMLElements that handles defered initialization
//  if first added to the DOM empty, then triggers initialization when a first child is attached
//  otherwise, initialize when created

//  interface:
//  - acquire_parameters({}) -> bool(ready_to_initialize?)
//  - initialize()

    _parameters = {} // temporary storage for possibly constructor-provided arguments

    constructor(parameters) {
        super();

        this.#acquire_parameters_impl(parameters)

        // TODO: useless ?
        // explicit, user-provided attributes
        if (this._parameters.attributes) {
            console.debug(`AwesomeCodeElement.details.HTML_elements.defered_HTMLElement: constructor: explicit attributes:`, this._parameters.attributes)
            for (const property in this._parameters.attributes)
                this.setAttribute(property, this._parameters.attributes[property])
        }
    }
    #initialization_promise = undefined
    get initialization_promise(){
        return this.#initialization_promise
    }
    connectedCallback() {

        const initialize_when_ready = () => {

            if (!this.acquire_parameters(this._parameters)) {
                console.debug('AwesomeCodeElement.details.HTML_elements.defered_HTMLElement: create shadowroot slot')
                this.shadowroot_accessor = AwesomeCodeElement.details.utility.create_shadowroot_slot(
                    this, () => {
                        if (!this.acquire_parameters(this._parameters))
                            throw new Error('acquire_parameters failed (no detailed informations)')
                        this.initialize()
                    }
                )
            }
            else {
                console.debug('AwesomeCodeElement.details.HTML_elements.defered_HTMLElement: no need for shadowroot slot')
                this.initialize()
            }
        }
        this.#initialization_promise = new Promise((resolve, reject) => {
            initialize_when_ready()
            resolve()
        })
        .catch((error) => {
            console.error('ace.details.defered_HTMLElement: error:', error)
            this.on_critical_internal_error(error)
        })

        this.connectedCallback = () => {}
    }

    acquire_parameters(parameters) {
    // acquire parameters for defered initialization
    // store everything
        this.#acquire_parameters_impl(parameters)
        return false
    }
    #acquire_parameters_impl(parameters){
        this._parameters = {
            ...this._parameters,
            ...(parameters || {})
        }
    }

    on_critical_internal_error(error = "") {

        console.error('ace.details.HTML_elements.defered_HTMLElement.on_critical_internal_error: fallback rendering (No recovery possible)\n\t', error)

        if (!this.isConnected)
            return

        let error_element = document.createElement('pre')
            error_element.textContent = `ace.details.HTML_elements.defered_HTMLElement.on_critical_internal_error:\n\t${error || 'unknown error'}\n\t(No recovery possible)`
        // TODO: status => error + CSS style for such status
        AwesomeCodeElement.details.utility.apply_css(error_element, {
            color: "red",
            border : "2px solid red"
            // overflow-wrap: break-word;
            // word-break: break-all;
        })
        this.innerHTML = ""
        this.replaceWith(error_element)
    }
}

// ============================
// details: code representation

class language_policies {

    static define_ce_output_language = (() => {
        // WIP
        if (undefined === hljs)
            throw new Error('language_policies.define_ce_output_language: only supports hljs')

        const ce_output_language = () => {
            return {
                case_insensitive: true,
                keywords: '',
                contains: [
                    hljs.COMMENT(
                        '^# Compiler exited with result code', // begin
                        '$', // end
                        { relevance: 10 }
                    )
                ]
            }
        }
        hljs.registerLanguage('ce_output', ce_output_language)
        return hljs.getLanguage('ce_output')
    })()

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
            static initialize_ce_output_language(){}
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
                if (result.relevance < 5 && code_element.textContent.length > 0)
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
                // if (AwesomeCodeElement.API.configuration.value.CE.has(language))
                //     this.ce_options = AwesomeCodeElement.API.configuration.value.CE.get(language)

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

class code_mvc_details {
// acquire { model, view } from an HTMLElement or text
//  model : inner text considered as plain code: any invalid nodes injected by the HTML rendering are removed
//  view  : either an `HTMLCodeElement` (expected layout), a given HTMLElement (wrap mode) or if the later contains valid HTML elements
    
    static html_parser = class html_parser {
        static is_valid_HTMLElement({ element }){
            if (element === undefined)
                throw new Error('ace.details.code_mvc_details.html_parser.is_valid_HTMLElement: invalid argument')
            return element instanceof HTMLElement && !(element instanceof HTMLUnknownElement)
        }
        static #valid_tagName_cache = new Map
        static is_valid_tagName({ tagName }) {
            if (element === undefined)
                throw new Error('ace.details.code_mvc_details.html_parser.is_valid_tagName: invalid argument')
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
                throw new Error('ace.details.code_mvc_details.html_parser.count_valid_childrens: invalid argument')
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
                throw new Error('ace.details.code_mvc_details.html_parser.count_valid_childrens: invalid argument')
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
                            console.debug(`code_mvc_details.parser.to_code: unhandled tags [comment, cdata, etc.]`)
                            return ''                        
                    }
                })
                .join('')
        }
        static cleanup({ element }){
        // recursively replaces invalid childrens element by their tagname as text
            if (element === undefined)
                throw new Error('ace.details.code_mvc_details.html_parser.cleanup: invalid argument')

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
                throw new Error('ace.details.code_mvc_details.html_parser.cleanup_impl: invalid argument')

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

    static factory = class factory {

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
                throw new Error('code_mvc_details.factory.is_expected_layout: invalid argument')
            return element.localName === 'code'
        }

        static build_from(argument) {

            if (argument instanceof code_mvc_details.factory.result_type)
                return argument

            argument ??= ''

            let result = (() => {

                if (undefined === argument
                ||  argument.text !== undefined)
                    return code_mvc_details.factory.#build_from_text(argument.text)
                if (argument.element !== undefined)
                    return code_mvc_details.factory.#build_from_element(argument.element)
                if (argument.nodes !== undefined)
                    return code_mvc_details.factory.#build_from_nodes(argument.nodes)

                return code_mvc_details.factory.#build_from(argument)
            })()
                result.model = (result.model ?? '')
                    .replace(/^\s*/, '')
                    .replace(/\s*$/, '') // remove enclosing white-spaces
                if (result.is_mutable)
                    result.view.textContent = result.model
            return result
        }

        static #build_from(argument){

            if (argument instanceof HTMLElement)
                return code_mvc_details.factory.#build_from_element(argument)
            else if (argument instanceof Array
                && argument.reduce((index, arg) => undefined !== arg.nodeType, true))
            {
                let only_one_valid_element = (() => {
                    const no_ws_elements = argument.filter((element) => !(element.nodeType === Node.TEXT_NODE && /^\s+$/g.test(element.textContent)))
                    return no_ws_elements.length === 1 && code_mvc_details.html_parser.is_valid_HTMLElement({ element: no_ws_elements[0] })
                        ? no_ws_elements[0]
                        : undefined
                })()
                return only_one_valid_element
                    ? code_mvc_details.factory.#build_from_element(only_one_valid_element)
                    : code_mvc_details.factory.#build_from_nodes(argument)
            }
            else if (argument.nodeType === document.TEXT_NODE)
                return code_mvc_details.factory.#build_from_text(argument.textContent)
            else
                return code_mvc_details.factory.#build_from_text(argument.toString())
        }
        static #build_from_text(value){

            return new code_mvc_details.factory.result_type({
                is_mutable : true,
                model : value ?? '',
                view : (() => {
                    let code_node = document.createElement('code')
                        code_node.textContent = value
                    return code_node
                })()
            })
        }
        static #build_from_element(element){

            if (!(element instanceof HTMLElement))
                throw new Error('code_mvc_details.factory.#build_from_element: invalid argument')

            const is_mutable = !Boolean(code_mvc_details.html_parser.count_valid_childrens({ element: element, is_recursive: true }))

            return new code_mvc_details.factory.result_type({
                is_mutable : is_mutable,
                model : (() => {
                    element = code_mvc_details.html_parser.cleanup({ element: element })
                    const result = code_mvc_details.html_parser.to_code({ elements: Array.from(element.childNodes) })
                    element.innerHTML = ""
                    return result
                })(),
                view : element
            })
        }
        static #build_from_nodes(elements){
        // expected: node.childNodes, or a filtered subset of Array.from(node.childNodes)

            if (elements instanceof NodeList)
                elements = Array.from(elements)

            if (!(
                (elements instanceof Array)
            &&  elements.length !== 0
            &&  elements.reduce((index, arg) => undefined !== arg.nodeType, true)
            ))  throw new Error('code_mvc_details.factory.#build_from_nodes(array): invalid argument')

            // const parent = (() => { // have common parent
            //     const parent = elements[0].parentNode
            //     if (elements.reduce((index, arg) => arg.parentNode !== parent, true))
            //         throw new Error('code_mvc_details.factory.#build_from_nodes(array): nodes does not have a common parentNode')
            //     return parent
            // })()

            const code_content = (() => {
                
                elements.forEach((element) => code_mvc_details.html_parser.cleanup({ element: element }))
                return elements
                    .map((element) => { 
                        return code_mvc_details.html_parser.to_code({
                            elements: [ element ]
                        })
                    })
                    .join('')
            })()
            elements.forEach((element) => element.parentElement.removeChild(element))
            // return new code_mvc_details.factory.result_type({
            //     is_mutable : false,
            //     model : code_content,
            //     view : { top_parent: element, code_container: element }
            // })
            return code_mvc_details.factory.#build_from_text(code_content)
        }
    }
}

class code_mvc {
// enhanced { model, view, controler } to represent some code as a (possibly-existing) html-element

    get [Symbol.toStringTag](){ return 'code_mvc' }

    // API: accessors
    is_mutable = undefined // is_owning
    view = undefined
    model = undefined
    controler = undefined

    // model
    #model_parser = undefined
    #model = undefined
    get model_details(){
        this.#model_update_ce_options()
        return this.#model
    }
    #model_update_ce_options(){
    // TODO: decouple this and is_executable
    // TODO: model change -> same language -> keep ce_options
        this?.controler?.is_executable // call getter
    }

    static controler_type = class {

        get [Symbol.toStringTag](){ return `code_mvc.controler_type` }

        #target = undefined
        toggle_parsing = undefined

        constructor({ target, language_policy, options }){
            
            if (!(target instanceof code_mvc))
                throw new Error('code_mvc.controler_type.constructor: invalid argument (invalid type for argument `target`)')

            this.#target = target
            this.#language_policies = language_policy

            const language_argument = options.language ?? this.#target.model_details.ce_options.language
            this.#language = this.#language_policies.detector.get_language_name(language_argument)
            if (this.#language === undefined && language_argument)
                console.warn(`code_mvc.controler_type.constructor: invalid user-provided language: [${language_argument}]`)

            this.toggle_language_detection = options.language // if a user-provided valid language exists, then toggle_language-deteciton is set to false
                ? !Boolean(this.#language)
                : options.toggle_language_detection

            this.#initialize_behaviors(options)
        }
        #initialize_behaviors(options){
        // [ const | mutable ] specific behaviors
        
            if (!this.#target.is_mutable) {
                console.warn(
                    'ace.details.code.constructor: invalid language_policies.highlighter for non-mutable/const code mvc\n',
                    `was [${this.language_policies.highlighter.name}], switching to fallback [language_policies.highlighters.use_none]`
                )
                this.language_policies.highlighter = language_policies.highlighters.use_none
            }
    
            if (!language_policies.detectors.check_concept(this.language_policies.detector))
                throw new Error('ace.details.code.constructor: invalid argument (language_policy.detector)')
            if (!language_policies.highlighters.check_concept(this.language_policies.highlighter))
                throw new Error('ace.details.code.constructor: invalid argument (language_policy.highlighter)')
            
            this.#toggle_parsing = (() => {
    
                Object.defineProperty(this, 'toggle_parsing', {
                    get: () => { return Boolean(this.#toggle_parsing) },
                    set: this.#target.is_mutable
                        ? (value) => {
                            value = AwesomeCodeElement.details.utility.types.is_string(value)
                                ? Boolean(value === 'true')
                                : Boolean(value)
                            if (value === this.#toggle_parsing)
                                return
                            this.#toggle_parsing = value
                            this.#target.update_view()
                        }
                        : () => { console.warn('code.set(toggle_parsing): no-op: not editable') }
                })
                return this.#target.is_mutable
                    ? Boolean(options.toggle_parsing) ?? Boolean(this.#target.model_details.ce_options)
                    : false
            })()
        }

        // policies, behaviors
        get language_policies(){ return this.#language_policies }
        #language_policies = {
            detector: undefined,
            highlighter: undefined
        }

        // language
        #language = undefined
        set #language_impl(value){

            this.#language = this.#language_policies.detector.get_language_name(value)
            if (this.#target.is_mutable &&
                this.#language_policies.detector.get_language(this.#target.view) !== this.#language
            )
                this.#language_policies.highlighter.highlight({
                    code_element: this.#target.view,
                    language: this.#language
                })
            this.#target.#model_update_ce_options()
        }
        get language() {

            let value = (() => {
                if (this.language_policies.detector.is_valid_language(this.#language))
                    return this.#language

                console.info(`code_mvc.controler.get(language) : invalid language [${this.#language}], attempting fallback detections`)
                return this.language_policies.detector.get_language(this.#target.view)
                    ?? this.language_policies.detector.detect_language(this.#target.#model.to_display).language
            })()
            value = this.#language_policies.detector.get_language_name(value)

            // autodetect
            if (this.toggle_language_detection)
                this.#language_impl = value

            return value
        }
        set language(value) {

            const argument = (() => {
                const language_name = this.language_policies.detector.get_language_name(value)
                const is_valid_input = Boolean(language_name)
                return {
                    language_name: language_name,
                    is_valid: is_valid_input
                }
            })()

            if (this.#language === argument.language_name && argument.is_valid)
                return

            this.toggle_language_detection = !argument.is_valid;
            if (!argument.is_valid)
                console.warn(`ace.details.code.language(set): invalid input [${value}], attempting fallback detection.`)

            const result = this.#target.is_mutable
                ? this.#language_policies.highlighter.highlight({
                    code_element: this.#target.view,
                    language: this.#toggle_language_detection ? undefined : argument.language_name
                })
                : this.#language_policies.detector.detect_language(this.#target.model)

            if (undefined === argument.language_name
             || this.#language !== argument.language_name
            ){
                this.#language_impl = result.language // note: possibly not equal to `value`
                this.toggle_language_detection = Boolean(result.relevance <= 5)
            }
        }

        // language_detection
        #toggle_parsing = undefined
        #toggle_language_detection = true
        get toggle_language_detection() {
            return  this.#toggle_language_detection
                || !this.language_policies.detector.is_valid_language(this.#language)
        }
        set toggle_language_detection(value) {
            value = AwesomeCodeElement.details.utility.types.is_string(value)
                ? Boolean(value === 'true')
                : Boolean(value)
            this.#toggle_language_detection = value
        }

        // is_executable
        get is_executable() {

            if (!this.#target.#model.to_execute)
                return false

            const language = this.#language
            if (!language)
                return false
    
            if (AwesomeCodeElement.API.configuration.is_ready
             && language !== this.language_policies.detector.get_language_name(this.#target.#model.ce_options?.language)
             && AwesomeCodeElement.API.configuration.value.CE.has(language)
            ){  // attempt to load the appropriate ce options
                this.#target.#model.ce_options = AwesomeCodeElement.API.configuration.value.CE.get(language)
                console.info(`code_mvc.is_executable(get): loaded matching CE configuration for language [${language}]: `, this.#target.#model.ce_options)
            }

            return Boolean(
                language === this.language_policies.detector.get_language_name(this.#target.#model.ce_options?.language)
             && !AwesomeCodeElement.details.utility.types.is_empty(this.#target.#model.ce_options)
            )
        }
    }
    static #modelChanged_Mutations_handler = new class cancelable_MutationObserver {
        #pending_update_controler = { canceled: false }
        #observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {

                const code_mvc_element = (() => {
                    let candidate = mutation.target.nodeType === Node.ELEMENT_NODE
                        ? mutation.target
                        : mutation.target.parentElement
                    const expected_element_localName = 'ace-cs-code-mvc'
                    return candidate.localName === expected_element_localName
                        ? candidate
                        : candidate.closest(expected_element_localName)
                })()
                if (!code_mvc_element)
                    throw new Error('ace.cs.code_mvc: MutationObserver: model change: invalid target')
                const code_mvc = code_mvc_element.code_mvc

                if (mutation.type !== 'characterData'
                || code_mvc.controler.toggle_parsing
                || code_mvc.model === code_mvc.view.textContent
                ) return

                // update every seconds if no new user input
                this.#pending_update_controler.canceled = true;
                this.#pending_update_controler = AwesomeCodeElement.details.utility.cancelable_setTimeout(() => {
                    // TODO: save cursor position
                    // let previous_selection = window.getSelection()
                    code_mvc.model = code_mvc.view.childNodes // will invoke code_mvc.update_view()
                    // TODO: restore cursor
                }, 1000)
            });
        })
        observe(element, configuration){
            return this.#observer.observe(element, configuration)
        }
    }

    // initialization
    static get default_arguments(){ return {
        controler_options: {
            language : undefined, // TODO: global configuration < local < in-code (ce_options)
            toggle_parsing : true,
            toggle_language_detection : true
        },
        language_policy: {
            detector:    language_policies.detectors.use_hljs,
            highlighter: language_policies.highlighters.use_hljs
        }
    }}

    constructor({
        code_origin,
        language_policy = { ...code_mvc.default_arguments.language_policy },
        controler_options = { ...code_mvc.default_arguments.controler_options }
    }){
        Object.assign(this, code_mvc_details.factory.build_from(code_origin))

        const is_mutable = this.is_mutable // or seal/non-writable ?
        Object.defineProperty(this, 'is_mutable', {
            get: () => { return is_mutable },
            set: () => { console.warn('ace.details.code.set(is_mutable): no-op, const property') },
        })

        this.#initialize_behaviors()
        this.controler = new code_mvc.controler_type({
            target: this,
            language_policy: language_policy,
            options: AwesomeCodeElement.details.utility.accumulate_objects(code_mvc.default_arguments.controler_options, controler_options)
        })
        this.update_view() // might trigger language auto-detect

        AwesomeCodeElement.API.configuration.when_ready_then({ handler: () => {
            this.#model_update_ce_options()
        } })
    }

    #initialize_behaviors(){
    // [ const | mutable ] specific behaviors

        this.#model_parser = this.is_mutable
            ? code_policies.parser.ace_metadata_parser
            : code_policies.parser.no_parser

        if (!code_policies.parser.check_concept(this.#model_parser))
            throw new Error('ace.details.code_mvc.#initialize_behaviors: invalid argument (parser)')

        this.update_view = this.is_mutable
            ? () => {
                this.view.textContent = this.model
                if (this.controler.toggle_language_detection)
                    this.controler.language = undefined // will trigger auto-detect
                else
                    this.controler.language_policies.highlighter.highlight({ code_element: this.view, language: this.controler.language })
            }
            : () => {}
        this.#model = (() => {
            const value = this.#model_parser.parse({ code: this.model })
            Object.defineProperty(this, 'model', {
                get: this.is_mutable
                    ? () => { return this.controler.toggle_parsing ? this.#model.to_display : this.#model.raw }
                    : () => { return this.#model.raw },
                set: (value) => {

                    if (value instanceof NodeList)
                        value = (() => {
                        // convert NodeList to code
                            let elements = Array.from(value);
                            elements.forEach((element) => code_mvc_details.html_parser.cleanup({ element: element }))
                            return code_mvc_details.html_parser.to_code({
                                elements: elements
                            })
                        })()

                    if (!AwesomeCodeElement.details.utility.types.is_string(value))
                        throw new Error('code_mvc.set(model): invalid parameter')

                    if (value === this.#model.raw)
                        return
                    this.#model = this.#model_parser.parse({ code: value })
                    this.#model_update_ce_options()
                    this.update_view()
                }
            })
            if (this.is_mutable)
                code_mvc.#modelChanged_Mutations_handler.observe(
                    this.view,
                    { characterData: true, subtree: true }
                )
            return value
        })()
    }
}

AwesomeCodeElement.details.code_utility = {
    policies: {
        language: language_policies,
        code: code_policies
    },
    mvc: {
        details: code_mvc_details,
        type: code_mvc
    }
}

class animation {
    
    static get HTMLElement_tagName() { return 'ace-animation' }
    get [Symbol.toStringTag](){ return animation.HTMLElement_tagName }

    static #cache = (function(){
    // TODO: loading_animation.* as opt-in, inline (raw github data) as fallback
        const loading_animation_fallback_url = 'https://raw.githubusercontent.com/GuillaumeDua/awesome-code-element/main/resources/images/loading_animation.svg'
        let value = document.createElement('img');
            value.src = loading_animation_fallback_url
            value.id = animation.HTMLElement_tagName
            value.className = animation.HTMLElement_tagName
            value.style.display = 'none'
        return value
    })()
    static get element() {
        return animation.#cache.cloneNode()
    }

    static controler = class controler {

        get [Symbol.toStringTag](){ return `animation.controler` }

        #owner = undefined
        #target = undefined
        #target_visible_display = undefined
        #element = undefined

        static counter_type = class {

            #on_value_changed = undefined

            constructor({ on_value_changed }){
                if (!on_value_changed || !(on_value_changed instanceof Function))
                    throw new Error('counter_type.constructor: invalid argument')
                this.#on_value_changed = on_value_changed
            }

            #value = 0
            get value(){ return this.#value }
            set value(value){ this.#on_value_changed(this.#value = value) }
        }
        #animate_while_counter = undefined

        constructor({ owner, target }) {

            if (!(owner instanceof HTMLElement)
             || !(target instanceof HTMLElement)
            ) throw new Error('animation.controler: invalid argument type')

            this.#owner = owner
            this.#target = target
            this.#target_visible_display = target.style.display

            this.#element = this.#owner.appendChild(animation.element)

            this.#animate_while_counter = new controler.counter_type({ on_value_changed: (value) => {

                if (value === 0 && this.toggle_animation){
                    this.toggle_animation = false
                    return
                }
                if (value !== 0 && !this.toggle_animation)
                    this.toggle_animation = true
            }})
        }

        set toggle_animation(value){
            this.#target.style.display  = Boolean(value) ? 'none' : this.#target_visible_display
            this.#element.style.display = Boolean(value) ? 'flex' : 'none'
        }
        get toggle_animation(){
            return Boolean(this.#element.style.display !== 'none')
        }

        animate_while({ promise }){

            if (!(promise instanceof Promise))
                throw new Error('animation.controler.animate_while: invalid argument type')

            if (this.toggle_animation)
                console.warn('animation.controler.animate_while: already animating')

            ++this.#animate_while_counter.value
            promise.then(() => {
                --this.#animate_while_counter.value
            })
        }
    }
}

class status_display extends HTMLElement {
    
    static get HTMLElement_tagName() { return 'ace-cs-status-display' }
    get [Symbol.toStringTag](){ return status_display.HTMLElement_tagName }

    #value = 'unknown'
    #message = ''

    set({ value, message }){
        this.#value = value
        this.#message = message

        this.textContent = `[${value}]${message ? ':\n' : ''}${message}`
    }
    get(){
        return {
            value: this.#value,
            message: this.#message
        }
    }

    get value(){ return this.#value }
    get message(){ return this.#message }
}
customElements.define(status_display.HTMLElement_tagName, status_display);

class code_mvc_HTMLElement extends AwesomeCodeElement.details.HTML_elements.defered_HTMLElement {

    static get HTMLElement_tagName() { return 'ace-cs-code-mvc' }
    get [Symbol.toStringTag](){ return code_mvc_HTMLElement.HTMLElement_tagName }

    static get named_parameters(){ return [
        'language',
        'toggle_parsing',
        'toggle_language_detection',
        'code'
    ]}

    constructor(parameters = {}) {
        if (typeof parameters !== "object")
            throw new Error(
                `code_mvc_HTMLElement.constructor: invalid argument.
                Expected object layout: { ${code_mvc_HTMLElement.named_parameters } }
                or valid childs/textContent when onConnectedCallback triggers`)
        
        if (parameters instanceof code_mvc){
        // direct initialization from code_mvc value,
        // by-pass defered_HTMLElement
            super()
            this.acquire_parameters = () => { return true }
            this.#code_mvc_initializer = () => parameters 
        }
        else {
            super(parameters)
            this.#code_mvc_initializer = () => new code_mvc({
                code_origin: this._parameters.code,
                // TODO: language_policies ?
                // this._parameters.toggle_parsing ? no_parser : ace-metadata-parser
                controler_options: {
                    language: this._parameters.language,
                    toggle_language_detection: this._parameters.toggle_language_detection,
                    toggle_parsing: this._parameters.toggle_parsing
                }
            })
        }
    }
    #code_mvc_initializer = undefined

    acquire_parameters(parameters) {

        super.acquire_parameters(parameters)

        const load_parameter = ({ property_name }) => {
            this._parameters[property_name] = this._parameters[property_name] ?? this.getAttribute(property_name) ?? undefined
        }
        code_mvc_HTMLElement.named_parameters.forEach((property_name) => load_parameter({ property_name: property_name }))

        this._parameters.code ||= (() => { 
            return this.childNodes.length ? Array.from(this.childNodes) : undefined
        })()

        // post-condition: valid code content
        const is_valid = Boolean(this._parameters.code)
        if (is_valid)
            this.acquire_parameters = () => { throw new Error('code_mvc_HTMLElement.acquire_parameters: already called') }

        console.debug(`${this.toString()}.acquire_parameters ... ${is_valid}`, this._parameters)
        return is_valid
    }
    initialize(){
        // console.debug(`code_mvc_HTMLElement.initialize: parameters:`, this._parameters)

        this.status_display = this.appendChild(new status_display)
        this.code_mvc = this.#code_mvc_initializer()
        this.appendChild(this.code_mvc.view)

        // this as proxy to code_mvc ?

        delete this._parameters
        this.removeAttribute('code')

        this.loading_animation_controler = new animation.controler({ owner: this, target: this.code_mvc.view })
        const { copy_to_clipboard, CE } = code_mvc_HTMLElement.add_buttons_to({ value: this })
        code_mvc_HTMLElement.set_on_resize_event({
            panel: this,
            scrolling_element: this.code_mvc.view,
            elements_to_hide: [ copy_to_clipboard, CE ]
        })

        const projections = AwesomeCodeElement.details.utility.types.projections
        data_binder.synced_attr_view_controler({
            target: this,
            data_sources: [
                { property_name: 'language',                    owner: this.code_mvc.controler, projection: projections.string },
                { property_name: 'toggle_parsing',              owner: this.code_mvc.controler, projection: projections.boolean },
                { property_name: 'toggle_language_detection',   owner: this.code_mvc.controler, projection: projections.boolean },
                { property_name: 'is_executable',               owner: this.code_mvc.controler, projection: projections.boolean },
            ]
        })
        // data_binder.bind_attr({ 
        //     data_source: { owner: this.status_display, property_name: 'value' },
        //     attributes: [
        //         { target: this,  attribute_name: 'status' },
        //     ]
        // })
    }

    static add_buttons_to = ({ value }) => {

        if (!(value instanceof code_mvc_HTMLElement))
            throw new Error('code_mvc_HTMLElement.add_buttons_to: invalid argument type')

        let copy_to_clipboard_button = new AwesomeCodeElement.details.HTML_elements.buttons.copy_to_clipboard()
            copy_to_clipboard_button = value.appendChild(copy_to_clipboard_button)

        let CE_button = new AwesomeCodeElement.details.HTML_elements.buttons.show_in_godbolt()
            CE_button = value.appendChild(CE_button)

        return value.ace_cs_buttons = {
            copy_to_clipboard: copy_to_clipboard_button,
            CE: CE_button
        }
    }
    static set_on_resize_event({ panel, scrolling_element, elements_to_hide }){

        const make_event_on_resize_maybe_hide_elements = ({ owner, elements }) => {
            let auto_hide_elements = (container, elements) => {
                elements.forEach((element) => { element.style.display = 'none' })
                container.onmouseover   = () => { elements.forEach((element) => element.style.display = '') }
                container.onmouseout    = () => { elements.forEach((element) => element.style.display = 'none') }
            }
            let no_auto_hide_elements = (container, elements) => {
                elements.forEach((element) => { element.style.display = '' })
                container.onmouseover = null
                container.onmouseout = null
            }
            return () => {
                // cheaper than a proper AABB to check if code's content overlap with other elements
                let functor = (
                        AwesomeCodeElement.API.configuration.value.auto_hide_buttons
                    ||  AwesomeCodeElement.details.utility.is_scrolling(owner).horizontally
                )   ? auto_hide_elements
                    : no_auto_hide_elements
    
                functor(owner, elements)
            }
        }

        panel.on_resize = make_event_on_resize_maybe_hide_elements({
            owner: scrolling_element,
            elements: Object.entries(elements_to_hide).map(element => element[1]) // structure-to-array
        })
        AwesomeCodeElement.details.HTML_elements.resize_observer.observe(panel)
    }

    // status: error|success|failure tracking/display
    set status({ value, message }){
        
        if (!value)
            throw new Error('ace.code_mvc_HTMLElement.status(set): invalid argument')

        if (!this.isConnected)
            return

        this.setAttribute('status', value)
        this.status_display.set({ value: value, message: message })
    }
    get status(){ return this.status_display.get() }
    set status_for({ value, message, duration }){

        if (!value || !AwesomeCodeElement.details.utility.types.is_int(duration))
            throw new Error('ace.code_mvc_HTMLElement.status_for(set): invalid argument')

        const status = this.status
        this.status = { value: value, message: message }
        setTimeout(() => this.status = status, duration)
    }
}
customElements.define(code_mvc_HTMLElement.HTMLElement_tagName, code_mvc_HTMLElement);

// ==================
// HTML_elements : API

// TODO: presentation.view is mutable and the user changed the textContent -> update model
AwesomeCodeElement.API.HTML_elements = {}
AwesomeCodeElement.API.HTML_elements.CodeSection = class cs extends AwesomeCodeElement.details.HTML_elements.defered_HTMLElement {

    static get HTMLElement_tagName() { return 'ace-code-section' }
    get [Symbol.toStringTag](){ return cs.HTMLElement_tagName }

    static get named_parameters(){ return [
        'language',
        'toggle_parsing',
        'toggle_execution',
        'url',
        'code'
    ]}

    // WIP: controler + make such controler a proxy to panels code_mvc for relevant actions
    // WIP: proxy to panels (or listeners to property changed)
    //  - refresh execution if presentation model change
    //  - not executable presentation: hide execution or show error message

    constructor(parameters = {}){
        if (!new.target || typeof parameters !== "object")
            throw new Error(
                `code_mvc_HTMLElement.constructor: invalid argument.
                Expected object layout: { ${cs.named_parameters } }
                or valid childs/textContent when onConnectedCallback triggers`)
        super(parameters)
    }

    acquire_parameters(parameters) {

        super.acquire_parameters(parameters)

        const load_parameter = ({ property_name }) => {
            this._parameters[property_name] = this._parameters[property_name] || this.getAttribute(property_name) || undefined
        }
        cs.named_parameters.forEach((property_name) => load_parameter({ property_name: property_name }))

        this.removeAttribute('code') // meant to only be a one-time, alternative argument provider

        this._parameters.code ||= (() => {
            const nodes = Array.from(this.childNodes)
            return nodes.length === 0
               || (nodes.length === 1 && nodes[0].nodeType === Node.TEXT_NODE && /^\s+$/g.test(nodes[0].textContent))
               ? undefined
               : nodes
        })()

        if (this._parameters.code && this._parameters.url){
            const is_code_empty = AwesomeCodeElement.details.utility.types.is_string(this._parameters.code) &&  /^\s+$/.test(this._parameters.code);
            if (!is_code_empty)
            // warn only if code is non-empty (either a string or seq of nodes)
                console.warn(
                    this.toString(), 'both parameters [code] and [url] provided.\n\tfallback behavior: use only [url]',
                    `\t\ncode = [${this._parameters.code}]`,
                    `\t\nurl  = [${this._parameters.url}]`
                )
            delete this._parameters.code
            this.innerHTML = ''
        }

        // post-condition: valid code content
        const is_valid = Boolean(this._parameters.code ?? this._parameters.url)
        if (is_valid)
            this.acquire_parameters = () => { throw new Error('CodeSection.acquire_parameters: already called') }
        return is_valid
    }
    initialize() {
        console.debug(`AwesomeCodeElement.details.HTML_elements.CodeSection.initialize: initializing with parameters:`, this._parameters)

        this.ace_cs_panels = (() => {

            let [ presentation, execution ] = [
                // new code_mvc_HTMLElement(this._parameters),
                new code_mvc_HTMLElement(new code_mvc({
                    code_origin: this._parameters.code,
                    controler_options:{
                        language: this._parameters.language,
                        toggle_parsing: this._parameters.toggle_parsing,
                        toggle_language_detection: this._parameters.toggle_language_detection
                    }
                    // auto:
                    // language_policy: {
                    //     detector:    language_policies.detectors.use_hljs,
                    //     highlighter: language_policies.highlighters.use_hljs
                    // }
                })),
                new code_mvc_HTMLElement(new code_mvc({
                    code_origin: '',
                    controler_options:{
                        language: 'ce_output',
                        toggle_parsing : false,
                        toggle_language_detection : false
                    },
                    language_policy: {
                        detector:    language_policies.detectors.use_none,
                        highlighter: language_policies.highlighters.use_hljs
                    }
                }))
            ];

            [ presentation, execution ].forEach((panel) => this.appendChild(panel));

            execution.title = 'Compilation provided by Compiler Explorer at https://godbolt.org/';

            return {
                presentation,
                execution
            }
        })()

        if (this._parameters.url)
            this.url = this._parameters.url // initiate loading
            // this.ace_cs_panels.presentation.initialization_promise.then(() => {
            //     this.url = this._parameters.url // initiate loading
            // })

        this.toggle_execution = false; // false, until a valid configuration is loaded
        (() => {
        // not an IIFE assignement to avoid race
            const value = this._parameters.toggle_execution
            AwesomeCodeElement.API.configuration.when_ready_then({
                handler: () => this.toggle_execution = value ?? (() => AwesomeCodeElement.API.configuration.value.CodeSection.toggle_execution)()
            })
        })()

        this.#initialize_ids()

        // bindings
        const projections = AwesomeCodeElement.details.utility.types.projections
        const attributes_binder = data_binder.synced_attr_view_controler({
            target: this,
            data_sources: [
                { property_name: 'url',                        owner: this },
                { property_name: 'language',                   owner: this.ace_cs_panels.presentation.code_mvc.controler },
                { property_name: 'toggle_parsing',             owner: this.ace_cs_panels.presentation.code_mvc.controler, projection: projections.boolean },
                { property_name: 'toggle_language_detection',  owner: this.ace_cs_panels.presentation.code_mvc.controler, projection: projections.boolean },
                { property_name: 'toggle_execution',           owner: this,                                               projection: projections.boolean },
                { property_name: 'is_executable',              owner: this.ace_cs_panels.presentation.code_mvc.controler, projection: projections.boolean },
            ]
        })
        /* const { origin, transformed, revoke } = */ AwesomeCodeElement.details.utility.inject_on_property_change_proxy({
            target: this.ace_cs_panels.presentation.code_mvc,
            property_name: 'model',
            on_property_change: ({ new_value, old_value, origin_op }) => {
                if (origin_op !== 'set' || new_value === old_value || !this.toggle_execution)
                    return
                this.#fetch_execution_controler.fetch()
            }
        })
        /* const { origin, transformed, revoke } = */ AwesomeCodeElement.details.utility.inject_on_property_change_proxy({
            target: this.ace_cs_panels.presentation.code_mvc.controler,
            property_name: 'language',
            on_property_change: ({ new_value, old_value, origin_op }) => {
                if (origin_op !== 'set' || new_value === old_value || !this.toggle_execution)
                    return
                this.#fetch_execution_controler.fetch()
            }
        })

        // TODO: one MutationObserver for all ace.cs instances
        let id_attribute_mutation_observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.oldValue === this.id)
                    return
                this.#initialize_ids()
            })
        })
        id_attribute_mutation_observer.observe(this, { attributeFilter: ['id'], attributeOldValue: true })

        // callable once
        // delete this._parameters
        this.initialize = () => { throw new Error('AwesomeCodeElement.details.HTML_elements.CodeSection.initialize: already called') }
    }

    static #id_generator = (() => {
        const counter = (function*(){
            let i = 0;
            while (true) { yield i++; }
        })()
        return () => { return `cs_${counter.next().value}` }
    })()
    #initialize_ids(){
        this.id ||= cs.#id_generator()
        this.ace_cs_panels.presentation.id                                    = `${this.id}.panels.presentation`
        this.ace_cs_panels.execution.id                                       = `${this.id}.panels.execution`
        this.ace_cs_panels.presentation.ace_cs_buttons.CE.id                  = `${this.id}.panels.presentation.buttons.CE`
        this.ace_cs_panels.presentation.ace_cs_buttons.copy_to_clipboard.id   = `${this.id}.panels.presentation.buttons.copy_to_clipboard`
        this.ace_cs_panels.execution.ace_cs_buttons.CE.id                     = `${this.id}.panels.execution.buttons.CE`
        this.ace_cs_panels.execution.ace_cs_buttons.copy_to_clipboard.id      = `${this.id}.panels.execution.buttons.copy_to_clipboard`
    }

    #toggle_execution = false
    set toggle_execution(value) {

        value = AwesomeCodeElement.details.utility.types.is_string(value)
                ? Boolean(value === 'true')
                : Boolean(value)

        this.#toggle_execution = value

        if (this.#toggle_execution)
            this.#fetch_execution_controler.fetch()
    }
    get toggle_execution() { return this.#toggle_execution }

    static fetch_execution_controler_t = class {
    // warning: operations are not guarantee to be concurrency safe

        get [Symbol.toStringTag](){ return `cs.fetch_execution_controler_t` }

        #target = undefined
        constructor(target){
            if (!target || !(target instanceof cs))
                throw new Error('cs.fetch_execution_controler: invalid input')
            this.#target = target
        }

        #is_loading = false
        get is_loading(){ return this.#is_loading }
        // get is_loading(){ return this.#target.ace_cs_panels.execution.loading_animation_controler.toggle_animation }

        #last_input = undefined
        get last_input(){ return this.#last_input }

        get #expect_target_is_executable(){

            if (!this.#target.#toggle_execution)
                throw new Error('ace.cs.fetch_execution_controler_t.expect_target_is_executable: prerequisite: target.toggle_execution')

            const execution_panel = this.#target.ace_cs_panels.execution

            if (this.#target.ace_cs_panels.presentation.code_mvc.controler.is_executable){
                execution_panel.status = {
                    value: 'ready-to-fetch',
                    message: ``
                }
                return true
            }
            
            const error = `${this.toString()}.get(expect_target_is_executable):\n\tnot executable (yet?)\n\tmissing configuration for language [${this.#target.ace_cs_panels.presentation.code_mvc.controler.language}]`
            execution_panel.status = {
                value: 'error-not-executable',
                message: `${error}`
            }
            console.warn(error)
            return false
        }

        fetch(){

            if (!this.#target.#toggle_execution
             || !this.#expect_target_is_executable
            ) return
            if (this.last_input === this.#target.ace_cs_panels.presentation.code_mvc.model_details.to_execute){
                console.warn(this.toString(), '.fetch: no-op: already fetching or fetched')
                return
            }
            this.#last_input = this.#target.ace_cs_panels.presentation.code_mvc.model_details.to_execute
            if (this.is_loading){
                console.warn(this.toString(), 'already loading')
                return
            }

            try             { this.#target.ace_cs_panels.execution.loading_animation_controler.animate_while({ promise: this.#make_fetch_promise() }) }
            catch (error)   { console.error(error) } // TODO: throw ? target internal error ?
        }
        #make_fetch_promise() {

            this.#is_loading = true

            const set_execution_content = ({ content: { value, return_code } }) => {
    
                const execution_panel = this.#target.ace_cs_panels.execution
                execution_panel.code_mvc.model = value
                execution_panel.status = {
                    value: `${return_code < 0 ? 'failure' : 'success'}-compilation`,
                    message: `compilation: ${return_code < 0 ? 'failure' : 'success'}`
                }
                this.#is_loading = false
            }
            const set_error = ({ error }) => {
                const execution_panel = this.#target.ace_cs_panels.execution
                execution_panel.status = {
                    value: 'error-compilation',
                    message: `compilation failed with error:\n\t${error}`
                }
                this.#is_loading = false
            }
    
            if (!this.#target.ace_cs_panels.presentation.code_mvc.controler.is_executable) {
                const error = `CodeSection:fetch_execution: not executable.\n\tNo known valid configuration for language [${this.#target.ace_cs_panels.presentation.code_mvc.controler.language}]`
                set_error({ error: error })
            }
    
            // execution panel: replace with result
            return AwesomeCodeElement.details.remote.CE_API.fetch_execution_result(
                this.#target.ace_cs_panels.presentation.code_mvc.model_details.ce_options,
                this.#target.ace_cs_panels.presentation.code_mvc.model_details.to_execute
            )
                .then((result) => {
                    // CE header: parse & remove
                    let regex = new RegExp('# Compilation provided by Compiler Explorer at https://godbolt.org/\n\n(# Compiler exited with result code (-?\\d+))')
                    let regex_result = regex.exec(result)
    
                    const content = regex_result === null
                        ? {
                            value : result,
                            error : 'unknown',
                            return_code : undefined
                        }
                        : {
                            value : result.substring(regex_result[0].length - regex_result[1].length), // trim off header
                            error : undefined,
                            return_code :  regex_result.length != 3 ? undefined : parseInt(regex_result[2])
                        }
                    set_execution_content({ content : content })
                })
                .catch((error) => {
                    error = `CodeSection:fetch_execution: CE_API.fetch_execution_result: failed:\n\t[${error}]`
                    set_error({ error: error })
                })
        }
    }
    #fetch_execution_controler = new cs.fetch_execution_controler_t(this)

    #url = undefined
    get url() { return this.#url }
    set url(value) {
    // TODO: Async task cancelation: 
    //  Cancel or wait for pending resource acquisition
    //  issue:  if `url` is set twice (in a short period of time), we have a race condition
    //          can be fix with some internal state management

        if (!value || value === 'undefined')
            value = undefined
        if (this.#url === value)
            return

        this.#url = value

        const presentation_panel = this.ace_cs_panels.presentation
        if (!this.#url){
            presentation_panel.status = {
                value: 'error-network-invalid-url',
                message: `ace.cs.set(url): network error:\n\tinvalid or empty url`
            }
            return
        }
        presentation_panel.status = {
            value: 'network-fetching',
            message: `ace.cs.set(url): fetching:\n\turl = [${this.#url}]`
        }

        let fetch_url_result_promise = new Promise((resolve, reject) => {

            AwesomeCodeElement.details.utility.fetch_resource(this.#url, {
                on_error: (error) => reject({
                    value: 'error-network-invalid-url',
                    message: `ace.cs.set(url): network error:\n\t${error}`
                }),
                on_success: (code) => {

                    if (!code) {
                        reject({
                            value: 'error-network-invalid-fetched-code',
                            message: `ace.cs.set(url): network error:\n\tfetched invalid (possibly empty) result\n\tcode=[${code}]`
                        })
                    }
    
                    if (this.ace_cs_panels.presentation.code_mvc.controler.toggle_language_detection) {
                    // use url extension as language, if valid
                        const url_extension = AwesomeCodeElement.details.utility.get_url_extension(this.#url)
                        if (url_extension
                         && this.ace_cs_panels.presentation.code_mvc.controler.language_policies.detector.is_valid_language(url_extension)){
                            this.ace_cs_panels.presentation.code_mvc.controler.language = url_extension
                            this.ace_cs_panels.presentation.code_mvc.controler.toggle_language_detection = false
                        }
                    }
                    
                    // setTimeout(() => { // simulate slow network for test purpose
                    //     this.ace_cs_panels.presentation.code_mvc.model = code
                    //     resolve('on_success')
                    // }, 2000)

                    // update status with success
                    presentation_panel.status = {
                        value: 'success-network-fetch',
                        message: `ace.cs.set(url): network success:\n\tfetched [${this.url}]`
                    }
                    // update model
                    this.ace_cs_panels.presentation.code_mvc.model = code
                    resolve('ace.cs.set(url) -> on_success')
                }
            })
        })
        .catch((error) => {

            const { value, message } = error
            value ??= 'error-network-unknown'
            message ??= 'ace.cs.set(url): network error:\n\tunknown'

            presentation_panel.status = {
                value: value,
                message: message
            }
            console.error(presentation_panel.status.message)
        })
        .then(
            (result) => {
                // presentation panel: use url extension as language, if valid
                const presentation_controler = presentation_panel.code_mvc.controler;
                if (presentation_controler.toggle_language_detection) {
                    const url_extension = AwesomeCodeElement.details.utility.get_url_extension(this.#url)
                    if (url_extension && presentation_controler.language_policies.detector.is_valid_language(url_extension)) {
                        presentation_controler.toggle_language_detection = false
                        presentation_controler.language = url_extension
                    }
                }
                // execution panel: fetch execution result
                this.#fetch_execution_controler.fetch()
            },
            (error) => { 
                presentation_panel.status = {
                    value: 'error-network-fetch-failed',
                    message: `${cs.HTMLElement_tagName}.set(url): fetch failed\n\t${error}`
                }
            }
        );

        this.ace_cs_panels.presentation.loading_animation_controler.animate_while({ promise: fetch_url_result_promise })
        this.ace_cs_panels.execution.loading_animation_controler.animate_while({ promise: fetch_url_result_promise })
    }

    static get HTML_element_placeholder_translation(){
        return {
            translate: function(element_placeholder){

                const attributes = (() => {
                    element_placeholder.classList.remove(this.tag_name)
                    if (element_placeholder.classList.length === 0)
                        element_placeholder.removeAttribute('class')
                    return Array
                        .from(element_placeholder.attributes)
                        .filter(a => a.specified)
                })() 

                let parameters = {}
                // unrelated attributes
                parameters.attributes = Object.fromEntries(
                    attributes
                        .filter(a => this.type.named_parameters.indexOf(a.name) === -1)
                        .map((attribute) => {
                            return [ attribute.name, attribute.value ]
                        })
                )
                // code
                parameters.code = code_mvc_details.html_parser.to_code({ elements: [ element_placeholder ] })

                // related attributes
                parameters = AwesomeCodeElement.details.utility.accumulate_objects(
                    parameters,
                    Object.fromEntries(attributes
                        .filter(a => this.type.named_parameters.indexOf(a.name) !== -1)
                        .map((attribute) => {
                            return [ attribute.name, attribute.value ]
                        }))
                )

                return new this.type(parameters)
            }
        }
    }
}
customElements.define(
    AwesomeCodeElement.API.HTML_elements.CodeSection.HTMLElement_tagName,
    AwesomeCodeElement.API.HTML_elements.CodeSection
);

// =====
// Style

AwesomeCodeElement.details.Style = class Style {
// class-as-namespace, for structuring styles, not cosmetic themes

    static #stylesheet_element_id = 'ace-stylesheet'
    static initialize() {

        if (document.getElementById(Style.#stylesheet_element_id)) {
            console.info(`AwesomeCodeElement.details.Style.initialize: user provided (valid element with id="${Style.#stylesheet_element_id}")`)
            return;
        }

        console.info(`AwesomeCodeElement.details.Style.initialize: automated loading ...`)

        let stylesheet = document.createElement('link')
            stylesheet.rel = "stylesheet"
            stylesheet.id = Style.#stylesheet_element_id
            stylesheet.href = (() => {
                // user-provided
                if (AwesomeCodeElement.API.configuration.value.description.stylesheet_url)
                    return AwesomeCodeElement.API.configuration.value.description.stylesheet_url;

                // local
                let root = (() => {
                    let value = AwesomeCodeElement.API.configuration.value.description.path_prefix || ""
                    return value.replace(/\/$/, '')
                })()

                return AwesomeCodeElement.API.configuration.value.compatibility.doxygen
                    ? `${root}/default.css` // doxygen: assuming plain hierarchy
                    : `${root}/styles/default.css`
                ;
            })()

            console.info(`AwesomeCodeElement.details.Style.initialize: loading using url [${stylesheet.href}]`)

        document.head.appendChild(stylesheet)
    }
}

// =====
// Theme

// TODO: check doxygen-awesome-css compatiblity
AwesomeCodeElement.details.Theme = class Theme {
// class-as-namespace, for syntactic coloration and toggling dark/light mode

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

        static #base = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${AwesomeCodeElement.details.dependency_manager.dependencies.hljs.version}/styles/`
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
            let candidate_option = $(document).find(`select[is=${AwesomeCodeElement.API.HTML_elements.ThemeSelector.HTMLElement_name}]`)
                .map((index, element) => { return element.options[0] })
                .filter((index, element) => element && element.value)
                [0]
            return candidate_option ? candidate_option.value : undefined
        })()
        return Boolean(theme_selector_default_option)
            ? theme_selector_default_option
            : AwesomeCodeElement.API.configuration.value.hljs.default_theme
    }

    static #stylesheet_element_id = 'code_theme_stylesheet'
    static initialize({force_dark_mode = undefined}) {
        // generates the stylesheet HTML element used to import CSS content
        let stylesheet = document.createElement('link')
            stylesheet.rel = "stylesheet"
            stylesheet.id = Theme.#stylesheet_element_id
        document.head.appendChild(stylesheet)

        // dark/light-mode preference
        console.info(`AwesomeCodeElement.details.Theme.initialize: color-scheme preference: [${Theme.preferences.dark_or_light}]`)
        Theme.preferences.is_dark_mode = force_dark_mode ?? Theme.preferences.is_dark_mode

        // switch to default theme, if any
        let default_theme_name = Theme.default_theme
        if (default_theme_name) {
            console.info(`AwesomeCodeElement.details.Theme.initialize: default theme name: [${default_theme_name}]`)
            Theme.value = default_theme_name
        }

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
            throw new Error(`AwesomeCodeElement.details.Theme: missing stylesheet [${Theme.#stylesheet_element_id}]\n\tDid you forget to call AwesomeCodeElement.API.initialize(); ?`)

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

    static HTMLElement_name                 = "ace-toggle-dark-mode-button"
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

    static HTMLElement_name = 'ace-theme-selector'

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
// TODO: cleanup, refactor

AwesomeCodeElement.API.initializers = {
    // TODO: global configuration for default/forced ace.CS options: language, toggle_*
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
        console.info(`awesome-code-element.js:initialize_doxygenCodeSections : replacing [${place_holders.length}] elements ...`)
        place_holders.each((index, value) => {
    
            let lines = $(value).find('div[class=fragment] div[class=line]')
    
            // WIP: keep doc ref links,
            //      or wrap with specific CS mode that does not alter content
            let links = lines.find('a[class="code"]')
            links.each((index, value) => {
                doc_ref_links.set(value.textContent, value.href)
            })
            // /WIP
    
            let code = $.map(lines, function(value) { return value.textContent }).join('\n')
            let node = new AwesomeCodeElement.API.HTML_elements.CodeSection({ code: code });
                $(value).replaceWith(node)
        })
    
        var place_holders = $('body').find('div[class=fragment]')
        console.info(`awesome-code-element.js:initialize_doxygenCodeSections : replacing [${place_holders.length}] elements ...`)
        place_holders.each((index, value) => {
    
            let lines = $(value).find('div[class=line]')
    
            // WIP
            let links = lines.find('a[class="code"]')
            links.each((index, value) => {
                doc_ref_links.set(value.textContent, value.href)
            })
            // /WIP
    
            let code = $.map(lines, function(value) { return value.textContent }).join('\n')
            let node = new AwesomeCodeElement.API.HTML_elements.CodeSection({ code: code });
                $(value).replaceWith(node)
        })
    
        // TODO: restore documentation reference links
        doc_ref_links.forEach((values, keys) => {
            // console.debug(">>> " + value.href + " => " + value.textContent)
            console.debug(">>> " + values + " => " + keys)
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

            let node = new AwesomeCodeElement.API.HTML_elements.CodeSection({ code: code, language: language });
                // node.setAttribute('language', language)
            existing_node.replaceWith(node);
        })

        // TODO: same for only code elements ?
    }
}
AwesomeCodeElement.API.initialize = () => {

    $(function() {
        $(document).ready(function() {

            console.info('awesome-code-element.js:initialize ...')

            let replace_HTML_element_placeholders = (type) => {

                if (!type)
                    throw new Error('ace.API.initialize: invalid argument')

                const translation = AwesomeCodeElement.details.utility.accumulate_objects(
                    {
                        type: type,
                        tag_name: type.HTMLElement_tagName,
                        query: `div[class=${type.HTMLElement_tagName}]`,
                        translate: function(){
                            console.warn('ace.API.initialize: replace_HTML_element_placeholders: using default/fallback translation.translate')
                            return new this.type()
                        }
                    },
                    type.HTML_element_placeholder_translation
                )

                let elements = $('body').find(translation.query)
                console.info(`ace.API.initialize: replace_HTML_element_placeholders: [${translation.type.name}] : replacing [${elements.length}] element(s) ...`)
                elements.each((index, element) => {
                    let translated_element = translation.translate(element)
                    if (translated_element)
                        element.replaceWith(translated_element)
                })
            }
            [   // replace placeholders (<div class="...tagname...">) with matching HTML elements
                AwesomeCodeElement.API.HTML_elements.CodeSection,
                code_mvc_HTMLElement
            ].forEach(html_component => replace_HTML_element_placeholders(html_component))

            // WIP:
            // if (AwesomeCodeElement.API.configuration.value.compatibility.doxygen) {
            //     console.info(`awesome-code-element.js:initialize: doxygen compatiblity ...`)
            //     AwesomeCodeElement.API.initializers.doxygenCodeSections()
            // }

            if (AwesomeCodeElement.API.configuration.value.compatibility.pre_code) {
                console.info(`awesome-code-element.js:initialize: existing pre-code compatiblity ...`)
                AwesomeCodeElement.API.initializers.PreCodeHTML_elements()
            }

            AwesomeCodeElement.details.Style.initialize()
            AwesomeCodeElement.details.Theme.initialize({ force_dark_mode: (() => {
                switch (AwesomeCodeElement.API.configuration.value.force_dark_light_scheme) {
                    case 'light':   return false;
                    case 'dark':    return true;
                    default:        return undefined
                }
            })() })
        })
    })
}

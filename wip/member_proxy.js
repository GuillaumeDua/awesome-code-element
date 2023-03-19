
// IDEA: controler as a public-exposed proxy to monitored values ?

function property_accessor(owner, property_name){

    if (!owner || !property_name || !(property_name in owner))
        throw new Error('property_accessor: invalid argument')

    const descriptor = Object.getOwnPropertyDescriptor(owner, property_name) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(owner), property_name) || {}

    let storage = descriptor.value // descriptor.value is mutable but mutating it has no effect on the original property's configuration

    return {
        owner: owner,
        property_name: property_name,
        descriptor: descriptor,
        get: (() => {
            if (descriptor.get)
                return descriptor.get.bind(owner)
            if (descriptor.value)
                return () => storage
            return undefined
        })(),
        set: (() => {
            if (descriptor.set)
                return (value) => descriptor.set.bind(owner)(value)
            if (descriptor.value)
                return (value) => storage = value
            return undefined
        })()
    }
}

function bind_values(descriptors){

    if (!(descriptors instanceof Array) || descriptors.length === 0)
        throw new Error('bind_values: invalid argument')

    const accessors = descriptors.map(({owner, property_name}) => {
        if (!owner || !property_name)
            throw new Error('bind_values: ill-formed argument element')
        return property_accessor(owner, property_name)
    })

    let initializer = undefined

    const result = descriptors.map(({owner, property_name}, index) => {
        const others = accessors.filter((elem, elem_index) => elem_index != index)
        const notify_others = (value) => others.forEach((accessor) => accessor.set(value))
        initializer ??= () => { notify_others(accessors[index].get()) }

        Object.defineProperty(owner, property_name, {
            get: () => {
                const value = accessors[index].get()
                console.log('bind_values: get:', value)
                return value
            },
            set: (value) => {
                console.log('bind_values: set:', value)
                accessors[index].set(value)
                notify_others(value)
            },
            configurable: true
        })

        return {
            owner: owner,
            property_name: property_name,
            revoke: () => Object.defineProperty(owner, property_name, accessors[index].descriptor),
            notify_others: notify_others,
            get: accessors[index].get,
            set: accessors[index].set
        }
    })

    // initial value
    initializer()

    return {
        revoke: () => accessors.forEach(({owner, property_name, descriptor}) => Object.defineProperty(owner, property_name, descriptor)),
        per_properties: result
    }
}

owner_a = { value: 42, name:'a' }
owner_b = { value: 42, name:'b' }

const { revoke } = bind_values([
    { owner: owner_a, property_name: 'value' },
    { owner: owner_b, property_name: 'value' },
])

function make_attribute_ref(owner, attribute_name){
    return {
        is_ref: true,
        get[attribute_name]() {
            return owner.getAttribute(attribute_name);
        },
        set[attribute_name](arg) {
            owner.setAttribute(attribute_name, arg);
        }
        // TODO: mutation observer
    };
}

function test(){
    qwe = { a : 'toto'}
    elem = document.getElementsByTagName('awesome_code_element_test-utility-toolbar')[0];

    binder = bind_values([
        { owner: qwe, property_name: 'a' },
        { owner: make_attribute_ref(elem, 'id'), property_name: 'id' }
    ])

    elem.setAttribute('id', 'NEW_ID') // WIP: disconnected attr here
    // elem.attributes[id] !== id_storage
}


// ---

function merge_functions(lhs, rhs){
    let origin = lhs
    lhs = function(){
        origin.apply(this, arguments)
        rhs.apply(this, arguments)
    }
    return lhs
}

class on_property_changed {
    static inject_property_proxy({ target, property_name, callback }){
    
        if (!target || !property_name || !callback)
            throw new Error('inject_property_proxy: invalid argument')

        const descriptor = Object.getOwnPropertyDescriptor(target, property_name) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), property_name) || {}
        if (!descriptor.configurable)
            throw new Error(`inject_property_proxy: [${property_name}] is not configurable`)

        // already proxied
        let proxy_payload = descriptor.get?.proxy_payload || descriptor.set?.proxy_payload
        if (proxy_payload) {
            console.log('>>> proxied_payload:', property_name)
            callback = merge_functions(callback, proxy_payload)
        }

        let storage = undefined
        const payload = (value) => {
            if (value !== storage){
                console.debug('proxy for [', property_name, '] with value = [', value, '](', typeof value, ') with storage=[', storage, '](', typeof storage, ')')
                storage = value
                callback(value)
            }
        }
        const bypass = {
            getter: (() => {
                if (descriptor.get)
                    return function(){ 
                        const value = descriptor.get.call(target);
                        storage = value
                        return value
                    }
                if (descriptor.value)
                    return function(){ return storage = descriptor.value }
                return undefined
            })(),
            setter: (() => {
                if (descriptor.set)
                    return function(value){
                        descriptor.set.call(target, value);
                        storage = descriptor.get ? descriptor.get.call(this) : value
                    }
                if (descriptor.value)
                    return function(value){
                        descriptor.value = value
                        storage = value
                        console.log('>>> bypass setter:', property_name, ' => ', value)
                        console.log('>>> proxy_payload:', proxy_payload)
                    }
                return undefined
            })()
        }
        const new_descriptor = {
            get: (() => {
                if (descriptor.get)
                    return function(){
                        const value = descriptor.get.call(this);
                        payload(value);
                        return value
                    }
                if (descriptor.value)
                    return function(){ payload(descriptor.value); return descriptor.value }
                return undefined
            })(),
            set: (() => {
                if (descriptor.set)
                    return function(value){
                        descriptor.set.call(this, value);
                        payload(descriptor.get ? descriptor.get.call(this) : value)
                    }
                if (descriptor.value)
                    return function(value){
                        descriptor.value = value
                        payload(value);
                    }
                return undefined
            })(),
            configurable: true,
        }
        Object.defineProperty(target, property_name, new_descriptor);

        // annotation
        if (new_descriptor.get)
            new_descriptor.get.proxy_payload = payload
        if (new_descriptor.set)
            new_descriptor.set.proxy_payload = payload
        // existing_proxy_payload = payload // update payload

        // spread initiale value, if any
        target[property_name]

        return {
            revoke: () => { Object.defineProperty(target, property_name, descriptor) },
            bypass: bypass,
            initiale_descriptor: descriptor
        }
    }
}
class synced_attributes_controler{
    #target = undefined
    #properties_descriptor = undefined
    #options = undefined
    
    properties_accessor = {}

    static get default_options(){
        return {
            start_after_construction: true,
            create_undefined_properties: false
        }
    }
    static get default_projection(){
        return {
            from: (value) => { return value },
            to:   (value) => { return value + '' },
        }
    }

    constructor({ target, properties_descriptor, options }){
    // target: valid HTMLElement
    // properties_descriptor: { owner?, name, projection?.{from?,to?} }
    // options: { create_undefined_properties }

        if (!target || !(target instanceof HTMLElement))
            throw new Error('synced_attributes_controler: invalid argument `target`')
        if (!(properties_descriptor instanceof Array) || properties_descriptor.size === 0)
            throw new Error('synced_attributes_controler: invalid argument `properties_descriptor`')

        this.#target = target
        this.#properties_descriptor = properties_descriptor
        this.#options = { ...synced_attributes_controler.default_options, ...options }

        if (this.#options.start_after_construction)
            this.start()
    }

    start(){
        this.stop()

        if (!this.#target.isConnected)
            throw new Error('synced_attributes_controler: target is not connected')

        this.#properties_descriptor.forEach((property_descriptor) => this.#initialize_one_property(property_descriptor))
    }
    stop(){
        Object.values(this.properties_accessor).forEach((accessor) => accessor.revoke())
        this.properties_accessor = {}
    }

    #initialize_attribute_mutation_observer({ accessor }){

        accessor.observer = undefined
        accessor.observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {

                if (mutation.oldValue === mutation.target.getAttribute(mutation.attributeName))
                    continue

                const value = accessor.projection.from(mutation.target.getAttribute(mutation.attributeName))
                console.log(
                    'intercept mutation:', mutation.attributeName, ':', mutation.oldValue, '->', value,
                    '[', accessor.property_traits.readonly ? 'REJECTED' : 'ACCEPTED', ']'
                )
                
                accessor.observer.suspend_observer_while(() => {
                    if (accessor.property_traits.readonly){
                        console.warn('define_bound_attributes_properties: property', accessor.name, ' is readonly, reject value', value)
                        mutation.target.setAttribute(mutation.attributeName, mutation.oldValue)
                        return
                    }
                    if (accessor.property_traits.setter){
                        accessor.property_traits.setter(value)
                        mutation.target.setAttribute(
                            mutation.attributeName,
                            accessor.property_traits.getter ? accessor.property_traits.getter() : value
                        )
                    }
                })
            }
        });
        accessor.observer.suspend_observer_while = (action) => {
        // read-only attribute, reset previous value
        //  warning: can result in race conditions
        //  TODO: process pending records ? MutationObserver.`takeRecords`
            accessor.observer.disconnect()
            action()
            accessor.observer.observe(this.#target, { attributeFilter: [ accessor.name ], attributeOldValue: true });
        }
        accessor.observer.observe(this.#target, { attributeFilter: [ accessor.name ], attributeOldValue: true });
    }
    #initialize_one_property({ owner, name, projection }){

        if (!name)
            throw new Error('synced_attributes_controler: invalid property descriptor')

        let accessor = this.properties_accessor[name] = {
            name: name,
            owner: owner ?? this.#target,
            projection: { ...synced_attributes_controler.default_projection, ...projection },
            property_traits: undefined
        }
        if (!(name in accessor.owner) && !this.#options.create_undefined_properties)
            throw new Error(`synced_attributes_controler: missing property [${name}] in [${accessor.owner}]. use option [create_undefined_properties] to force creation`)

        // attributes to property changes
        this.#initialize_attribute_mutation_observer({ accessor: accessor })

        // property to attributes changes
        const on_property_change_sync_with_attribute = (value) => {
        // update attribute
            if (value !== accessor.projection.from(this.#target.getAttribute(name))){
            // or String(value) !== target.getAttribute(name) ?
                console.log('define_bound_attributes_properties.callback: [', name, '] => [', value, '](', typeof value, ')')
                accessor.observer.suspend_observer_while(() => this.#target.setAttribute(name, accessor.projection.to(value)))
            }
        }
        // TODO?: projection on this proxy (avoid redundant callback trigger with different types)
        const { revoke, bypass, initiale_descriptor } = on_property_changed.inject_property_proxy({
            target: accessor.owner,
            property_name: name,
            callback: on_property_change_sync_with_attribute
        })
        accessor.property_traits = { // used by `make_attribute_mutation_observer`
            readable: Boolean(initiale_descriptor.get || initiale_descriptor.value),
            writable: Boolean(initiale_descriptor.set || initiale_descriptor.value),
            get readonly() { return Boolean(this.readable && !this.writable) },
            get writeonly(){ return Boolean(this.writable && !this.readable) },
            getter: bypass.getter?.bind(accessor.owner),
            setter: bypass.setter?.bind(accessor.owner)
        }

        accessor.revoke = () => {
            revoke()
            accessor.observer.disconnect()
        }
        return accessor
    }
}

// local test ---

class MyCustomElement_child extends HTMLElement{
    constructor() { super(); }
    z = 42

    proxied_twice = 42

    connectedCallback(){
        let controler = new synced_attributes_controler({
            target: this,
            properties_descriptor: [
                { name: 'proxied_twice' }
            ]
        });
    }
}
customElements.define('my-custom-element-child', MyCustomElement_child);
class MyCustomElement extends HTMLElement {

    increase_a_storage_value(){ ++this.#a }
    #a = 21
    get a(){ return this.#a * 2 }

    b = 42

    set c(value){}

    #d = 42
    get d(){ return this.#d }
    set d(value){ this.#d = value }

    #e = 21
    get e(){ return this.#e * 2 }
    set e(value){ this.#e = value / 2 }

    #f = undefined
    get f(){ return this.#f }
    set f(value){ this.#f = (value + '').toUpperCase()  }

    constructor() { super(); }

    connectedCallback(){
        const int_projection = {
            from: (value) => { try { return parseInt(value)  } catch(error){ return NaN } },
            to:   (value) => { return value.toString ? value.toString() : 'NaN' },
        }

        let child = this.appendChild(document.createElement('my-custom-element-child'))

        let controler = new synced_attributes_controler({
            target: this,
            properties_descriptor: [
                { name: 'a', projection: int_projection },
                { name: 'b', projection: int_projection },
                { name: 'c'},
                { name: 'd', projection: int_projection },
                { name: 'e', projection: int_projection},
                { name: 'f'},
                { name: 'z', owner: child },
                { name: 'proxied_twice', owner: child } // limitation: child.setAttribute('proxied_twice', value) won't reflect on parent's attribute
            ]
        });
        console.log(controler)
    }
}
customElements.define('my-custom-element', MyCustomElement);

// old impl ---

// TODO: { way: up, down, two_way }
function define_bound_attributes_properties({ target, properties_descriptor }){
// NB: properties_descriptor.projections.{from, to} reciprocity is assumed
// properties_descriptor{ owner, name, projection? }

    if (!target || !(target instanceof HTMLElement))
        throw new Error('define_bound_attributes_properties: invalid argument `target`')
    if (!target.isConnected)
        throw new Error('define_bound_attributes_properties: target is not connected')
    if (!(properties_descriptor instanceof Array) || properties_descriptor.size === 0)
        throw new Error('define_bound_attributes_properties: invalid argument `properties_descriptor`')

    let result = properties_descriptor.map(descriptor => {

        let { owner, name, projection } = descriptor
        if (!name || !(name in target))
            throw new Error('define_bound_attributes_properties: invalid property descriptor')

        projection ??= {
            from: (value) => { return value },
            to:   (value) => { return value + '' },
        };

        let property_traits = undefined
        let observer = undefined

        const suspend_observer_while = (action) => {
        // read-only attribute, reset previous value
        //  warning: can result in race conditions
        //  TODO: process pending records ? MutationObserver.`takeRecords`
            observer.disconnect()
            action()
            observer.observe(target, { attributeFilter: [ name ], attributeOldValue: true });
        }

        observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {

                if (mutation.oldValue === mutation.target.getAttribute(mutation.attributeName))
                    continue

                const value = projection.from(mutation.target.getAttribute(mutation.attributeName))
                console.log(
                    'intercept mutation:', mutation.attributeName, ':', mutation.oldValue, '->', value,
                    '[', property_traits.readonly ? 'REJECTED' : 'ACCEPTED', ']'
                )
                
                suspend_observer_while(() => {
                    if (property_traits.readonly){
                        console.warn('define_bound_attributes_properties: property', name, ' is readonly, reject value', value)
                        mutation.target.setAttribute(mutation.attributeName, mutation.oldValue)
                        return
                    }
                    if (property_traits.setter){
                        property_traits.setter(value)
                        mutation.target.setAttribute(mutation.attributeName, property_traits.getter ? property_traits.getter() : value)
                    }
                })
            }
        });
        observer.observe(target, { attributeFilter: [ name ], attributeOldValue: true });

        const on_property_change_sync_with_attribute = (value) => {
        // update attribute
            if (value !== projection.from(target.getAttribute(name))){
            // or String(value) !== target.getAttribute(name) ?
                console.log('define_bound_attributes_properties.callback: [', name, '] => [', value, '](', typeof value, ')')
                suspend_observer_while(() => target.setAttribute(name, projection.to(value)))
            }
        }
        // TODO?: projection on this proxy (avoid redundant callback trigger with different types)
        const { revoke, bypass, initiale_descriptor } = on_property_changed.inject_property_proxy({
            target: target,
            property_name: name,
            callback: on_property_change_sync_with_attribute
        })
        property_traits = {
            readable: Boolean(initiale_descriptor.get || initiale_descriptor.value),
            writable: Boolean(initiale_descriptor.set || initiale_descriptor.value),
            get readonly() { return Boolean(this.readable && !this.writable) },
            get writeonly(){ return Boolean(this.writable && !this.readable) },
            getter: bypass.getter?.bind(target),
            setter: bypass.setter?.bind(target)
        }

        return {
            property_name: name,
            revoke: () => {
                revoke()
                observer.disconnect()
            }
        }
    })
    .reduce((accumulator, arg) => {
        const { property_name, revoke } = arg
        accumulator[property_name] = revoke
        return accumulator
    }, {})

    result.revoke = () => {
        Object.keys(result).forEach((key) => result[key]())
    }

    return result
}


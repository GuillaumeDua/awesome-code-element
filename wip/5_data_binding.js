
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
                            'data_binder.bound_attribute_adapter: data-source is read-only\n',
                            '\tcanceling requested attr change [', mutation.oldValue, '->', value, ']',
                            '\tinspect property', attribute_name, ' of target', target
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

                    accessors.forEach(({revoke}) => revoke())

                    console.warn('extend_binding: from', bound_attributes, 'to', [ ...bound_attributes, ...attributes ])
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
            console.warn('data_binder.bind_attr: data-source is write-only. Initiale value is undefined.')
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

// ---

function test_only_get(){

    only_get = { storage: 0, get a(){ return ++this.storage } }
    value = { a : 42 }
    elem = document.getElementsByTagName('my-custom-element')[0]

    binder = data_binder.bind_attr({ 
        data_source: { owner: only_get, property_name: 'a' },
        attributes: [
            { target: elem,  attribute_name: 'a' }
        ]
    })

    binder = data_binder.bind_attr({
        data_source: { owner: only_get, property_name: 'a' },
        attributes: [
            { target: elem,  attribute_name: 'b' }
        ]
    })
}
function test_simple(){

    value = { a : 42 }
    elem = document.getElementsByTagName('my-custom-element')[0]

    binder = data_binder.bind_attr({ 
        data_source: { owner: value, property_name: 'a' },
        attributes: [
            { target: elem,  attribute_name: 'a' },
        ]
    })

    binder = data_binder.bind_attr({
        data_source: { owner: value, property_name: 'a' },
        attributes: [
            { target: elem,  attribute_name: 'b' }
        ]
    })
}
function test_projection(){

    value = { a : 42 }
    elem = document.getElementsByTagName('my-custom-element')[0]

    binder = data_binder.bind_attr({ 
        data_source: { owner: value, property_name: 'a' },
        attributes: [
            { target: elem, attribute_name: 'a' },
        ]
        // projection: {
        //     from: (value) => Number(value),
        //     to:   (value) => value + ''
        // }
    })

    binder = data_binder.bind_attr({
        data_source: { owner: value, property_name: 'a' },
        attributes: [
            { target: elem, attribute_name: 'b' }
        ],
        projection: {
            from: (value) => Number(value),
            to:   (value) => value + ''
        }
    })
}
function test_make_attr_bindings(){

    elem = document.getElementsByTagName('my-custom-element')[0]
    value_1 = { a: 1, b:2 }
    value_2 = { get c(){ return 3 } }
    value_3 = { set d(value){ if (typeof value !== 'number') throw new Error('invalid data type') } }

    data_binder.synced_attr_view_controler({
        target: elem,
        data_sources: [
            { owner: value_1, property_name: 'a' },
            { owner: value_1, property_name: 'b' },
            { owner: value_2, property_name: 'c' },
            { owner: value_3, property_name: 'd', projection: {
                from: (value) => Number(value),
                to:   (value) => value
            } },
        ]
    })
}
function test_altered_model(){

    elem = document.getElementsByTagName('my-custom-element')[0]
    value = {
        storage: 'INITIAL_VALUE',
        get a(){ return this.storage },
        set a(value){ this.storage = (value + '').toUpperCase() }
    }

    data_binder.synced_attr_view_controler({
        target: elem,
        data_sources: [
            { owner: value, property_name: 'a' }
        ]
    })
}

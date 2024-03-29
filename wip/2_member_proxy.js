
function attribute_accessor({ target, attribute_name, on_value_changed }){

    if (!target || !(target instanceof HTMLElement) || !attribute_name)
    // !target.hasAttribute(attribute_name)
        throw new Error('attribute_accessor: invalid argument')
    attribute_name = attribute_name.replace(/\s+/g, '_') // whitespace are not valid in attributes names

    let observer = !on_value_changed ? undefined : (() => {
        let observer = undefined
        observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {

                const value = mutation.target.getAttribute(mutation.attributeName)
                if (mutation.oldValue === value)
                    continue

                console.log('intercept mutation:', mutation.attributeName, ':', mutation.oldValue, '->', value)
                observer.suspend_while(() => on_value_changed(value))
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
        is_proxy: true,
        get value(){
            const value = target.getAttribute(attribute_name)
            observer?.suspend_while(() => target.setAttribute(attribute_name, value))
        },
        set value(value){
            if (value + '' != target.getAttribute(attribute_name)){
                observer?.suspend_while(() => target.setAttribute(attribute_name, value))
            }
        },
        revoke: () => { observer?.disconnect() }
    }
}

function property_accessor({ owner, property_name }){
// uniform access to properties. for descriptor= { get and/or set, value }
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
}

function bind_values({ descriptors }){

    if (!(descriptors instanceof Array) || descriptors.length === 0)
        throw new Error('bind_values: invalid argument')

    const accessors = descriptors.map(({owner, property_name}) => {
        if (!owner || !property_name)
            throw new Error('bind_values: ill-formed argument element')
        return property_accessor({ owner: owner, property_name: property_name })
    })

    // special case: extend existing data-binding
    const rebinding_element_index = accessors.findIndex(({ owner, property_name }, index) => accessors[index].descriptor?.get?.bound_to)
    if (rebinding_element_index != -1){
        // console.log('bind_values: rebinding. Already bound to', accessors[rebinding_element_index].descriptor?.get?.bound_to)
        const { bound_descriptors, revoke } = accessors[rebinding_element_index].descriptor.get.bound_to
        revoke()
        return bind_values({ descriptors: [...bound_descriptors, ...descriptors]})
    }

    // common case: create new data-binding
    let initializer = undefined

    let revoke_all = undefined
    const products = descriptors.map(({ owner, property_name }, index) => {
        const others = accessors.filter((elem, elem_index) => elem_index != index)
        const notify_others = (value) => others.forEach((accessor) => accessor.set(value))
        initializer ??= () => { notify_others(accessors[index].get()) }

        Object.defineProperty(owner, property_name, {
            get: () => {
                const value = accessors[index]?.get()
                console.log('bind_values: get:', value)
                return value
            },
            set: (value) => {
                console.log('bind_values: set:', value, '| target=[', owner, ']')
                accessors[index]?.set(value)
                notify_others(value)
            },
            configurable: true
        })

        return {
            revoke: () => {
                Object.defineProperty(owner, property_name, accessors[index].descriptor)
                if (owner?.is_proxy && owner?.revoke)
                    owner.revoke()
            }
        }
    })

    const revoke = () => products.forEach(({ revoke }) => revoke())

    // tag data-binding
    descriptors.forEach(({owner, property_name}, index) => {
        Object.getOwnPropertyDescriptor(owner, property_name).get.bound_to = { bound_descriptors: descriptors, revoke: revoke }
    })

    // initial value
    initializer()

    return { revoke: revoke }
}

function test(){
    elem_1 = document.getElementsByTagName('my-custom-element')[0]
    qwe = { a: '42' }
    asd = { b: undefined }

    elem_1_controler = attribute_accessor({ target: elem_1, attribute_name: 'toto', on_value_changed:  (value) => { qwe.a = value } })

    binder = bind_values({ descriptors: [
        { owner: qwe, property_name: 'a' },
        { owner: asd, property_name: 'b' },
        { owner: elem_1_controler, property_name: 'value' },
    ]})

    // ---

    elem_2 = document.getElementsByTagName('my-custom-element-child')[0]
    elem_2_controler = attribute_accessor({ target: elem_2, attribute_name: 'toto', on_value_changed:  (value) => { qwe.a = value } })
    binder_2 = bind_values({ descriptors: [
        { owner: qwe, property_name: 'a' },
        { owner: elem_2_controler, property_name: 'value' }
    ]})
}
function test_2(){
// scenario: data-source is get-only

    only_get = { storage: 0, get a(){ return ++this.storage } }
    value = { a : 42 }

    binder = bind_values({ descriptors: [
        { owner: only_get, property_name: 'a' },
        { owner: value, property_name: 'a' },
    ]})

    only_get.a // update value to 2
    console.log('>>> 2 === ', value.a)
}

// TODO: projections
// TODO: valid attribute name
// TODO: set using setter, broadcast value using getter if any
// TODO: property: get || set and vice-versa

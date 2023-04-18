
// TODO: homogeneous [ attribute, property ]_accessor with on_value_changed callback
// TODO: assumes that on_value_changed is by default protected into duplicated notifications/broadcast
// TODO: on_value_changed -> handles projection ?

function make_attribute_bound_adapter({ target, attribute_name, on_value_changed }){

    if (!target || !(target instanceof HTMLElement) || !attribute_name || !on_value_changed)
    // !target.hasAttribute(attribute_name)
        throw new Error('attribute_bound_adapter: invalid argument')
    attribute_name = attribute_name.replace(/\s+/g, '_') // whitespace are not valid in attributes names

    let observer = (() => {
        let observer = undefined
        observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {

                const value = mutation.target.getAttribute(mutation.attributeName)
                if (mutation.oldValue === value)
                    continue

                console.log('intercept mutation:', mutation.attributeName, ':', mutation.oldValue, '->', value)
                //observer.suspend_while(() => on_value_changed(value))
                on_value_changed(value)
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
        get: () => {
            const value = target.getAttribute(attribute_name)
            return value
        },
        set: (value) => {
            console.log('make_attribute_bound_adapter: set:',  target.getAttribute(attribute_name), ' => ', value)
            if (value + '' != target.getAttribute(attribute_name)){
                observer.suspend_while(() => target.setAttribute(attribute_name, value))
                on_value_changed(value)
            }
            return value
        },
        update: (value) => observer.suspend_while(() => target.setAttribute(attribute_name, value)),
        revoke: () => { observer.disconnect() }
    }
}

function make_property_bound_adapter({ owner, property_name, on_value_changed }){
// uniform access to properties. for descriptor= { get and/or set, value }
    if (!owner || !property_name || !(property_name in owner) || !on_value_changed)
        throw new Error('make_property_bound_adapter: invalid argument')

    const descriptor = Object.getOwnPropertyDescriptor(owner, property_name) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(owner), property_name) || {}

    let storage = descriptor.value // descriptor.value is mutable but mutating it has no effect on the original property's configuration

    return {
        owner: owner,
        property_name: property_name,
        descriptor: descriptor,
        get: (() => {
            if (descriptor.get)
                return () => { 
                    const value = descriptor.get.call(owner)()
                    on_value_changed(value)
                    return value
                }
            if ('value' in descriptor)
                return () => {
                    on_value_changed(storage)
                    return storage
                }
            return undefined
        })(),
        set: (() => {
            if (descriptor.set)
                return (value) => {
                    console.log('make_property_bound_adapter: set:', value)
                    descriptor.set.call(owner, value)
                    on_value_changed(descriptor.get ? descriptor.get.call(owner)() : value)
                }
            if ('value' in descriptor)
                return (value) => {
                    storage = value
                    on_value_changed(storage)
                }
            return undefined
        })(),
        update: (() => {
            if (descriptor.set)
                return (value) => descriptor.set.call(owner, value)
            if ('value' in descriptor)
                return (value) => storage = value
            return undefined
        })(),
    }
}

function bind_values({ descriptors }){

    if (!(descriptors instanceof Array) || descriptors.length === 0)
        throw new Error('bind_values: invalid argument')

    let notifiers = undefined
    let notify_others = (element_index, value) => {
        const callback = notifiers[element_index]
        callback(value)
    }
    const accessors = descriptors.map(({owner, property_name, attribute_name}, index) => {
        if (!owner || (!property_name && !attribute_name))
            throw new Error('bind_values: ill-formed argument element')

        return property_name
            ? make_property_bound_adapter ({ owner: owner, property_name: property_name   , on_value_changed: notify_others.bind(this, index) })
            : make_attribute_bound_adapter({ target: owner, attribute_name: attribute_name, on_value_changed: notify_others.bind(this, index) })
    })
    notifiers = accessors.reduce(
        (accumulator, {owner, property_name, attribute_name}, index) => {
            const others = accessors.filter((elem, elem_index) => elem_index != index)
            const notify_others = (value) => others.forEach((accessor) => accessor.update(value))
            accumulator.push(notify_others)
            return accumulator
        }, []
    )

    console.log('accessors:', accessors)
    console.log('notifiers:', notifiers)

    const products = descriptors.map(({ owner, property_name }, index) => {

        const accessor = accessors[index]

        if (accessor?.is_proxy)
            return { revoke: () => accessor?.revoke?.call() }

        console.log('proxy on:', owner, property_name)

        Object.defineProperty(owner, property_name, {
            get: accessor?.get,
            set: accessor?.set,
            configurable: true
        })

        return { revoke: () => Object.defineProperty(owner, property_name, accessor.descriptor) }
    })

    // spread initiale value
    notify_others(0, accessors[0].get())

    return { revoke: products.forEach(({ revoke }) => revoke()) }

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
     products = descriptors.map(({ owner, property_name }, index) => {
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

// ---

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
// MVE of code_mvc.controler.is_executable

    only_get = { storage: 0, get a(){ return ++this.storage } }
    value = { a : 42 }
    elem = document.getElementsByTagName('my-custom-element')[0]

    binder = bind_values({ descriptors: [
        // { owner: only_get, property_name: 'a' },
        { owner: value, property_name: 'a' },
        { owner: elem,  attribute_name: 'is_executable' }
    ]})

    // only_get.a // update value to 2
    // console.log(2 === value.a ? 'SUCCESS' : `FAILURE with value.a=[${value.a}]`)
}

// TODO: projections
// TODO: valid attribute name
// TODO: set using setter, broadcast value using getter if any
// TODO: property: get || set and vice-versa

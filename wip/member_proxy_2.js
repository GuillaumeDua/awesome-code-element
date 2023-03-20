

function make_attribute_controler({target, attribute_name, on_value_changed}){
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
        get value() {
            const value = target.getAttribute(attribute_name)
            observer.suspend_while(() => target.setAttribute(attribute_name, value))
        },
        set value(value){
            if (value + '' != target.getAttribute(attribute_name)){
                observer.suspend_while(() => target.setAttribute(attribute_name, value))
            }
        },
        revoke: () => { console.log('attr mutation observer: disconnecting...'); observer.disconnect() }
    }
}

// ---

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
                console.log('bind_values: set:', value, '| target=[', owner, ']')
                accessors[index].set(value)
                notify_others(value)
            },
            configurable: true
        })

        return {
            owner: owner,
            property_name: property_name,
            revoke: () => {
                Object.defineProperty(owner, property_name, accessors[index].descriptor)
                if (owner?.is_proxy && owner?.revoke)
                    owner.revoke()
            },
            notify_others: notify_others,
            get: accessors[index].get,
            set: accessors[index].set
        }
    })

    // initial value
    initializer()

    return {
        revoke: () => result.forEach(({owner, property_name, revoke}) => revoke()),
        per_properties: result
    }
}

function test(){
    elem_1 = document.getElementsByTagName('my-custom-element')[0]
    elem_2 = document.getElementsByTagName('awesome_code_element_test-utility-toolbar')[0]
    qwe = { a : '42' }

    elem_1_controler = make_attribute_controler({ target: elem_1, attribute_name: 'toto', on_value_changed:  (value) => { qwe.a = value } })
    elem_2_controler = make_attribute_controler({ target: elem_2, attribute_name: 'id',   on_value_changed:  (value) => { qwe.a = value } })

    binder = bind_values([
        { owner: qwe, property_name: 'a' },
        { owner: elem_1_controler, property_name: 'value' },
        { owner: elem_2_controler, property_name: 'value' }
    ])
}

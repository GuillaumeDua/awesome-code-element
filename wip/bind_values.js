
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

function test(){
    qwe = { a : 'toto'}
    elem = document.getElementsByTagName('awesome_code_element_test-utility-toolbar')[0];

    binder = bind_values([
        { owner: qwe, property_name: 'a' },
        { owner: elem.attributes.id, property_name: 'value' }
    ])

    elem.setAttribute('id', 'NEW_ID') // WIP: disconnected attr here
    // elem.attributes[id] !== id_storage
}
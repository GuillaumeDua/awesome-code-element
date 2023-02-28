
function make_proxy_to({ target, descriptors }){

    if (!target)
        throw new Error('make_proxy_to: invalid target argument')
    if (!(descriptors instanceof Array))
        throw new Error('make_proxy_to: invalid descriptor argument')
    
    let _target = target
    descriptors.forEach(({ target, property, projection }) => {
        const property_descriptor = Object.getOwnPropertyDescriptor(target, property)

        // Object.defineProperty(
        //     _target,
        //     property,
        //     property_descriptor.value
        //         ? {
        //             value: target[property]
        //         }
        //         : {
        //             get: 
        //         }
        // )
    })
}

// TODO: property injector
// TODO: inject_on_properties_change_proxy

function inject_on_property_change_proxy({ target, property_name, on_property_change, options = undefined } = {}) {
// calls `on_property_change` when target[property_name] change
// on_property_change: ({ argument, old_value, new_value }) => { ... }
//  warning: assumes target[property_name] get/set reciprocity
//  warning: the setter will call the getter

    const property_descriptor = Object.getOwnPropertyDescriptor(target, property_name)
    if (!property_descriptor.configurable)
        throw new Error(`inject_on_property_change_proxy: invalid property descriptor: ${target.toString()}[${property_name}] is not configurable`)

    var storage = target[property_name]

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
            console.debug('proxy getter:', storage, ' -> ', result)
            if (result !== storage)
                on_property_change({
                    origin_op: 'get',
                    old_value: storage,
                    new_value: result
                })
            return storage = result
        }
    if (target_setter)
        descriptor.set = (value) => {
                const old_value = target_getter()
                target_setter(value)
                storage = target_getter()
                if (old_value !== storage)
                    on_property_change({
                        origin_op: 'set',
                        argument: value,
                        old_value: old_value,
                        new_value: storage
                    })
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

// quick-tests

qwe = { _a: 42, get a(){ return this._a + 1 }, set a(value){ this.a /*getter call*/; this._a = value * 2 } }

inject_on_property_change_proxy({ target: qwe, property_name: 'a', on_property_change: ({ origin_op, argument, old_value, new_value }) => {
    console.log('>>> changed:', origin_op, argument, old_value, new_value)
}})

// console.log('test: get', qwe.a)

// console.log('test: set')

// qwe.a = 13

console.log('-----\n test 2: only set')

i = 0
qwe = { get a(){ return ++i } }

inject_on_property_change_proxy({ target: qwe, property_name: 'a', on_property_change: ({ origin_op, argument, old_value, new_value }) => {
    console.log('>>> changed:', origin_op, argument, old_value, new_value)
}})

console.log('test 2: get', qwe.a)
console.log('test 2: get', qwe.a)

console.log('test 2: set'); qwe.a = 13


console.log('-----\ntest 3: no get/set')

qwe = { a : 42 }

const { revoke } = inject_on_property_change_proxy({ target: qwe, property_name: 'a', on_property_change: ({ origin_op, argument, old_value, new_value }) => {
    console.log('>>> changed:', origin_op, argument, old_value, new_value)
}})

console.log('test 3: get', qwe.a)
console.log('test 3: get', qwe.a)
console.log('test 3: set'); qwe.a = 13

console.log('-----\ntest 4: revoke test 3')
revoke()

console.log('test 4: get', qwe.a)
console.log('test 4: get', qwe.a)
console.log('test 4: set'); qwe.a = 13

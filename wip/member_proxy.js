
// IDEA: controler as a public-exposed proxy to monitored values ?

class get_set_cb {
    static inject_property_proxy({target, property_name}){
        
        const descriptor = Object.getOwnPropertyDescriptor(target, property_name) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), property_name) || {}
        if (!descriptor.configurable)
            throw new Error(`inject_property_proxy: [${property_name}] is not configurable`)

        // TODO: as parameter
        // TODO: only one "on_value_changed" callback ?
        const getter_payload = (value) => { console.log('proxy', property_name, ': get with value = [', value, ']') }
        const setter_payload = (value) => { console.log('proxy', property_name, ': set with value = [', value, ']') }

        const getter = (() => {
            if (descriptor.get)
                return function(){
                    const value = descriptor.get.call(this);
                    getter_payload(value);
                    return value
                }
            if (descriptor.value)
                return function(){ getter_payload(descriptor.value); return descriptor.value }
            return undefined
        })()
        const setter = (() => {
            if (descriptor.set)
                return function(value){ setter_payload(value); return descriptor.set.call(this, value); }
            if (descriptor.value)
                return function(value){ setter_payload(value); descriptor.value = value }
            return undefined
        })()

        Object.defineProperty(target, property_name, {
            get: getter,
            set: setter
        });

        return {
            revoke: () => { Object.defineProperty(target, property_name, descriptor) }
        }
    }
}
class on_property_changed {
    static inject_property_proxy({target, property_name}){
        
        const descriptor = Object.getOwnPropertyDescriptor(target, property_name) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), property_name) || {}
        if (!descriptor.configurable)
            throw new Error(`inject_property_proxy: [${property_name}] is not configurable`)

        // TODO: as parameter
        const payload_impl = (value) => { console.log('proxy for [', property_name, '] with value = [', value, ']') }
        let storage = undefined
        const payload = (value) => {
            if (value !== storage){
                storage = value
                payload_impl(value)
            }
        }

        const getter = (() => {
            if (descriptor.get)
                return function(){
                    const value = descriptor.get.call(this);
                    payload(value);
                    return value
                }
            if (descriptor.value)
                return function(){ payload(descriptor.value); return descriptor.value }
            return undefined
        })()
        const setter = (() => {
            if (descriptor.set)
                return function(value){
                    descriptor.set.call(this, value);
                    payload(descriptor.get.call(this))
                }
            if (descriptor.value)
                return function(value){
                    descriptor.value = value
                    payload(value);
                }
            return undefined
        })()

        Object.defineProperty(target, property_name, {
            get: getter,
            set: setter
        });

        // spread initiale value, if any
        target[property_name]

        return {
            revoke: () => { Object.defineProperty(target, property_name, descriptor) }
        }
    }
}

type = class {

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
}
value = new type

const impl = on_property_changed

impl.inject_property_proxy({ target: value, property_name: 'a' })
impl.inject_property_proxy({ target: value, property_name: 'b' })
impl.inject_property_proxy({ target: value, property_name: 'c' })
impl.inject_property_proxy({ target: value, property_name: 'd' })
impl.inject_property_proxy({ target: value, property_name: 'e' })
impl.inject_property_proxy({ target: value, property_name: 'f' })















// ---

function using_proxy(){
    type = class {
        #storage = 42
        get storage(){ return this.#storage }
    }
    value = new type
    descriptor = Object.getOwnPropertyDescriptor(value, 'storage') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(value), 'storage') || {}

    proxy = new Proxy(value, {
        get(target, prop, receiver) {
            console.log('proxy: get')
            const value = target[prop];
            return value instanceof Function
                ? function (...args) { return value.apply(this === receiver ? target : this, args); }
                : value
        }
    })

    console.log('test 1:', proxy.storage)
}

//  Object.getOwnPropertyDescriptors(Object.getPrototypeOf(proxy)) => filter 'constructor'

function using_get(){
    console.log('test 1:', descriptor.get())

    delete value['storage']

    console.log('test 2:', descriptor.get())

    Object.defineProperty(value, 'storage', {
        get(){ console.log('get proxy'); return descriptor.get() }
    })

    console.log('test 3:', descriptor.get())

    console.log('test 4:', value.storage)
}
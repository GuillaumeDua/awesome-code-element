
// IDEA: controler as a public-exposed proxy to monitored values ?

function inject_property_proxy({target, property_name}){
    
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

type = class {
    #a = 42
    get a(){ return this.#a * 2 }

    b = 42
    set c(value){}

    #d = 42
    get d(){ return this.#d }
    set d(value){ this.#d = value }

    #e = 42
    get e(){ return this.#e * 2 }
    set e(value){ this.#e = value / 2 }
}
value = new type
inject_property_proxy({ target: value, property_name: 'a' })
inject_property_proxy({ target: value, property_name: 'b' })
inject_property_proxy({ target: value, property_name: 'c' })
inject_property_proxy({ target: value, property_name: 'd' })
inject_property_proxy({ target: value, property_name: 'e' })















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

// IDEA: controler as a public-exposed proxy to monitored values ?

class on_property_changed {
    static inject_property_proxy({target, property_name, callback }){
        
        if (!target || !property_name || !callback)
            throw new Error('inject_property_proxy: invalid argument')

        const descriptor = Object.getOwnPropertyDescriptor(target, property_name) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), property_name) || {}
        if (!descriptor.configurable)
            throw new Error(`inject_property_proxy: [${property_name}] is not configurable`)

        let storage = undefined
        const payload = (value) => {
            if (value !== storage){
                storage = value
                console.log('proxy for [', property_name, '] with value = [', value, '](', typeof value, ')')
                callback(value)
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
                    payload(descriptor.get ? descriptor.get.call(this) : value)
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
            revoke: () => { Object.defineProperty(target, property_name, descriptor) },
            initiale_descriptor: descriptor
        }
    }
}

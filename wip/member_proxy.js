
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
                console.log('proxy for [', property_name, '] with value = [', value, '](', typeof value, ') with storage=[', storage, ']')
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
            })()
        }

        Object.defineProperty(target, property_name, new_descriptor);

        // spread initiale value, if any
        target[property_name]

        return {
            revoke: () => { Object.defineProperty(target, property_name, descriptor) },
            bypass: bypass,
            initiale_descriptor: descriptor
        }
    }
}

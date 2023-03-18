
// IDEA: controler as a public-exposed proxy to monitored values ?

class on_property_changed {
    static inject_property_proxy({ target, property_name, callback }){
    
        if (!target || !property_name || !callback)
            throw new Error('inject_property_proxy: invalid argument')

        const descriptor = Object.getOwnPropertyDescriptor(target, property_name) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), property_name) || {}
        if (!descriptor.configurable)
            throw new Error(`inject_property_proxy: [${property_name}] is not configurable`)

        let storage = undefined
        const payload = (value) => {
            if (value !== storage){
                console.debug('proxy for [', property_name, '] with value = [', value, '](', typeof value, ') with storage=[', storage, '](', typeof storage, ')')
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
            })(),
            configurable: true
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

// TODO: { way: up, down, two_way }
function define_bound_attributes_properties({ target, properties_descriptor }){
// NB: properties_descriptor.projections.{from, to} reciprocity is assumed
// properties_descriptor{ owner, name, projection? }

    if (!target || !(target instanceof HTMLElement))
        throw new Error('define_bound_attributes_properties: invalid argument `target`')
    if (!target.isConnected)
        throw new Error('define_bound_attributes_properties: target is not connected')
    if (!(properties_descriptor instanceof Array) || properties_descriptor.size === 0)
        throw new Error('define_bound_attributes_properties: invalid argument `properties_descriptor`')

    let result = properties_descriptor.map(descriptor => {

        let { owner, name, projection } = descriptor
        if (!name || !(name in target))
            throw new Error('define_bound_attributes_properties: invalid property descriptor')

        projection ??= {
            from: (value) => { return value },
            to:   (value) => { return value + '' },
        };

        let property_traits = undefined
        let observer = undefined

        const suspend_observer_while = (action) => {
        // read-only attribute, reset previous value
        //  warning: can result in race conditions
        //  TODO: process pending records ? MutationObserver.`takeRecords`
            observer.disconnect()
            action()
            observer.observe(target, { attributeFilter: [ name ], attributeOldValue: true });
        }

        observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {

                if (mutation.oldValue === mutation.target.getAttribute(mutation.attributeName))
                    continue

                const value = projection.from(mutation.target.getAttribute(mutation.attributeName))
                console.log(
                    'intercept mutation:', mutation.attributeName, ':', mutation.oldValue, '->', value,
                    '[', property_traits.readonly ? 'REJECTED' : 'ACCEPTED', ']'
                )
                
                suspend_observer_while(() => {
                    if (property_traits.readonly){
                        console.warn('define_bound_attributes_properties: property', name, ' is readonly, reject value', value)
                        mutation.target.setAttribute(mutation.attributeName, mutation.oldValue)
                        return
                    }
                    if (property_traits.setter){
                        property_traits.setter(value)
                        mutation.target.setAttribute(mutation.attributeName, property_traits.getter ? property_traits.getter() : value)
                    }
                })
            }
        });
        observer.observe(target, { attributeFilter: [ name ], attributeOldValue: true });

        const on_property_change_sync_with_attribute = (value) => {
        // update attribute
            if (value !== projection.from(target.getAttribute(name))){
            // or String(value) !== target.getAttribute(name) ?
                console.log('define_bound_attributes_properties.callback: [', name, '] => [', value, '](', typeof value, ')')
                suspend_observer_while(() => target.setAttribute(name, projection.to(value)))
            }
        }
        // TODO?: projection on this proxy (avoid redundant callback trigger with different types)
        const { revoke, bypass, initiale_descriptor } = on_property_changed.inject_property_proxy({
            target: target,
            property_name: name,
            callback: on_property_change_sync_with_attribute
        })
        property_traits = {
            readable: Boolean(initiale_descriptor.get || initiale_descriptor.value),
            writable: Boolean(initiale_descriptor.set || initiale_descriptor.value),
            get readonly() { return Boolean(this.readable && !this.writable) },
            get writeonly(){ return Boolean(this.writable && !this.readable) },
            getter: bypass.getter?.bind(target),
            setter: bypass.setter?.bind(target)
        }

        return {
            property_name: name,
            revoke: () => {
                revoke()
                observer.disconnect()
            }
        }
    })
    .reduce((accumulator, arg) => {
        const { property_name, revoke } = arg
        accumulator[property_name] = revoke
        return accumulator
    }, {})

    result.revoke = () => {
        Object.keys(result).forEach((key) => result[key]())
    }

    return result
}


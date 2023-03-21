
class data_binder {

    static make_attribute_bound_adapter({ target, attribute_name, on_value_changed }){

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
            owner: target,
            attribute_name: attribute_name,
            initiale: {
                get: () => target.getAttribute(attribute_name),
                set: (value) => observer.suspend_while(() => target.setAttribute(attribute_name, value))
            },
            revoke: () => { observer.disconnect() }
        }
    }
    
    static make_property_bound_adapter({ owner, property_name, on_value_changed }){
    // uniform access to properties. for descriptor= { get and/or set, value }
        if (!owner || !property_name || !(property_name in owner) || !on_value_changed)
            throw new Error('make_property_bound_adapter: invalid argument')
    
        const descriptor = Object.getOwnPropertyDescriptor(owner, property_name) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(owner), property_name) || {}
    
        let storage = descriptor.value // descriptor.value is mutable but mutating it has no effect on the original property's configuration
    
        const initiale = {
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

        const getter = initiale.get
            ? () => { 
                const value = initiale.get()
                on_value_changed(value)
                return value
            }
            : undefined
        const setter = initiale.set
            ? (value) => {
                initiale.set(value)
                on_value_changed(initiale.get ? initiale.get() : value)
            }
            : undefined

        Object.defineProperty(owner, property_name, {
            get: getter,
            set: setter,
            configurable: true
        })

        return {
            owner: owner,
            property_name: property_name,
            initiale: initiale,
            revoke: () => Object.defineProperty(owner, property_name, descriptor),
        }
    }
   
    static make_binding({ descriptors }){

        if (!(descriptors instanceof Array) || descriptors.length === 0)
            throw new Error('data_binder.make_binding: invalid argument')
    
        let notifiers = undefined
        let notify_others = (element_index, value) => {
            const callback = notifiers[element_index]
            callback(value)
        }
        const accessors = descriptors.map(({owner, property_name, attribute_name}, index) => {
            if (!owner || (!property_name && !attribute_name))
                throw new Error('data_binder.make_binding: ill-formed argument element')
    
            return property_name
                ? data_binder.make_property_bound_adapter ({ owner: owner,  property_name: property_name  , on_value_changed: notify_others.bind(this, index) })
                : data_binder.make_attribute_bound_adapter({ target: owner, attribute_name: attribute_name, on_value_changed: notify_others.bind(this, index) })
        })
        notifiers = accessors.reduce(
            (accumulator, {owner, property_name, attribute_name}, index) => {
                const others = accessors.filter((elem, elem_index) => elem_index != index)
                const notify_others = (value) => others.forEach((accessor) => accessor.initiale?.set(value))
                accumulator.push(notify_others)
                return accumulator
            }, []
        )

        // spread initiale value
        notifiers[0](accessors[0].initiale.get())
    }
}

function test(){
// scenario: data-source is get-only
// MVE of code_mvc.controler.is_executable

    only_get = { storage: 0, get a(){ return ++this.storage } }
    value = { a : 42 }
    elem = document.getElementsByTagName('my-custom-element')[0]

    binder = data_binder.make_binding({ descriptors: [
        // { owner: only_get, property_name: 'a' },
        { owner: value, property_name: 'a' },
        { owner: elem,  attribute_name: 'is_executable' }
    ]})

    // only_get.a // update value to 2
    // console.log(2 === value.a ? 'SUCCESS' : `FAILURE with value.a=[${value.a}]`)
}
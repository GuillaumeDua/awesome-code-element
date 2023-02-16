class composition_factory {

    static is_class_definition(value){
        return value.prototype
            && value.prototype.constructor.toString
            && value.prototype.constructor.toString().substring(0, 5) === 'class'
    }
    static is_class_value(value){
        return value.constructor.toString
            && value.constructor.toString().substring(0, 5) === 'class'
    }
    static get_descriptor_of = (value) => {
    // Descriptors of value properties and prototype (handles inheritance)

        if (!Boolean(value instanceof Object))
            throw new Error('get_complete_descriptor: invalid argument')
    
        let result = Object.getOwnPropertyDescriptors(value)
        const add_prototypes = (proto) => {

            result = {
                ...result,
                ...Object.getOwnPropertyDescriptors(proto)
            }
            proto = Object.getPrototypeOf(proto)
            if (proto !== undefined && proto !== Object.getPrototypeOf({}))
                add_prototypes(proto)
        }
        add_prototypes(Object.getPrototypeOf(value))
    
        return result
    }

    static make_composition_prototype = ({ state, features }) => {

        if (!state
         || !(features instanceof Array)
         || features.filter(feature => !feature).length)
            throw new Error('composition_factory.make_prototype: invalid argument')

        state = composition_factory.is_class_definition(state)
            ? new state
            : state // structuredClone(state)

        features
            .map(feature => {
                const feature_constructor = () => {
                    if (composition_factory.is_class_definition(feature))
                        return (arg) => { return new feature(arg) }     // feature with a decorrelated state
                    if (!(feature_constructor instanceof Function))
                        return (arg) => { return feature }              // feature with a decorrelated state (unless specified before)
                    return feature                                      // feature with a   correlated state
                }
                if (!(feature_constructor instanceof Function))
                    throw new Error(`composition_factory.make_prototype: invalid feature [${feature}]`)

                let feature_value = feature_constructor(state)
                return composition_factory.get_descriptor_of(feature_value)
            })
            .forEach(propertyDescriptors => {
                Object.defineProperties(state, propertyDescriptors)
            })
        
        return state
    }
    static make_composition = ({ state, features, extends_type = undefined }) => {
        return extends_type
            ? class extends extends_type {
                constructor(){
                    super()
                    const prototype = composition_factory.make_composition_prototype({ state: state, features: features })
                    Object.defineProperties(this, Object.getOwnPropertyDescriptors(prototype))
                }
            }
            : class {
                constructor(){
                    const prototype = composition_factory.make_composition_prototype({ state: state, features: features })
                    Object.defineProperties(this, Object.getOwnPropertyDescriptors(prototype))
                }
            }
    }
    static make_type = ({ features, extends_type = undefined }) => {

        if (!(features instanceof Array))
            throw new Error('composition_factory.make_type: invalid argument')

        const features_as_descriptors = features
            .map((feature) => {
                feature = composition_factory.is_class_definition(feature)
                    ? new feature
                    : feature
                return composition_factory.get_descriptor_of(feature)
            })
            .reduce((accumulator, value) => {
                return { ...accumulator, ...value }
            }, {})

        let composition_factory_make_type_result_t = extends_type
            ? class extends extends_type {}
            : class {}
        Object.defineProperties(composition_factory_make_type_result_t.prototype, features_as_descriptors)
        return composition_factory_make_type_result_t
    }
}

// ---

class NotifyPropertyChangedInterface {

    _handlers = new Map

    constructor(args){
        console.debug(`NotifyPropertyChangedInterface.constructor with`, args)

        if (!args)
            return
        if (!(args instanceof Array))
            throw new Error('NotifyPropertyChangedInterface.constructor: invalid argument')

        args.forEach((value, index) => {
            if (!(value instanceof Array) || value.length !== 2)
                throw new Error(`NotifyPropertyChangedInterface.constructor: invalid argument (at index ${index})`)
            this.add_OnPropertyChangeHandler(value[0], value[1])
        })
    }

    add_OnPropertyChangeHandler = ({property_name, handler}) => {
        if (!(handler instanceof Function))
            throw new Error('NotifyPropertyChangedInterface.add_OnPropertyChangeHandler: invalid argument')
        this._handlers.set(property_name, handler)
    }
    remove_OnPropertyChangeHandler = ({property_name}) => {
        this._handlers.delete(property_name)
    }

    NotifyPropertyChanged = ({property_name}) => {
        const handler = this._handlers.get(property_name)
        console.log(this)
        if (handler)
            handler(property_name)
    }
}

// ---

class state {
    details = { value: 42 }
}

class A{

    get _this(){ return this }

    #a_private = 1

    get a_private(){ return this.#a_private }

    a = 1
    get a_value(){ return this.a }

    a_func(){ return 42; }
    a_lambda = () => { return 42 }

    constructor(){ console.debug('ctor: A') }
}
class B extends A {

    constructor(){
        console.debug('ctor: B')
        super()
    }

    b = 1
    get b_value(){ return this.b }
}
class C extends B {
    constructor(){ console.debug('ctor: C'); super() }

    c = 1
    get c_value(){ return this.c }
}

const type_1 = composition_factory.make_composition({
    state: state,
    features: [
        // NotifyPropertyChangedInterface
        (state) => {
            let value = new NotifyPropertyChangedInterface
            value.add_OnPropertyChangeHandler({ property_name: 'value', handler: (arg) => console.log('value changed to:', state[arg]) })
            return value
        },
        C
    ],
    extends_type: HTMLElement
})
customElements.define('type-1', type_1)

const type_2 = composition_factory.make_type({ features: [ C ], extends_type: HTMLElement })
customElements.define('type-2', type_2)

// ---

class ThisOP {
    print_this(){
        console.log(this)
    }
    calculate_abc(){
        return this.a + this.b + this.c
    }
}

// TODO: dispatch arguments to features constructors ( feature_name => ...args )
function aggregation_factory_dynamic(features, extends_type = undefined){
// dynamic lookup
    return class extends (extends_type ?? Object) {
        features = new Map(features.map((value) => {
            return [ value.name, new value ]
        }))

        constructor(){
            super()
            const lookup = {
                get(target, prop, receiver) {

                    return prop in target
                        ? Reflect.get(...arguments)
                        : (() => {
                            for (let feature of target.features.values()) {
                                if (prop in feature)
                                    return Reflect.get(feature, prop)
                            }
                            return undefined
                        })()
                },
                set(target, prop, value) {

                    if (!(prop in target))
                        for (let feature of target.features.values()) {
                            if (prop in feature)
                                return Reflect.set(feature, prop, value)
                        }
                    return Reflect.set(...arguments)
                }
            };
            return new Proxy(this, lookup);
        }
    }
}
function aggregation_factory_static(features){
    return class result_t {
        features = features.map((value) => {
            return new value
        })
        // TODO: check feature clash (ex: [ A, B, C ] => [ C ])
        //                           (ex: { a: 42 }, { a: 13 })

        static #change_descriptor_execution_context({ context, property_name, property_descriptor }){

            if (property_descriptor.value
             && (property_descriptor.get || property_descriptor.set))
                throw new Error(`aggregation_factory_static.constructor: ill-formed property ${property_name} with descriptor ${descriptor}`)

            // replace the invocation context of property getter/setters & functions
            let contextualized_descriptor = {
                ...property_descriptor,
                ...(property_descriptor.get ? {
                        get: function(){ return property_descriptor.get.call(context) }
                    } : {}),
                ...(property_descriptor.set ? {
                        set: function(value){ return property_descriptor.set.call(context, value) }
                    } : {}),
                ...(property_descriptor.value instanceof Function ? {
                    value: function(){ return context[property_name](...arguments) }
                    // property_descriptor.value.call(feature, ...arguments) // infinite recursion
                } : {}),
                ...(property_descriptor.value ? {
                    get: function(){ return context[property_name] },
                    set: function(value){ return context[property_name] = value }
                } : {})
            }
            if (contextualized_descriptor.get || contextualized_descriptor.set) {
            // prevent ill-formed descriptor
                delete contextualized_descriptor.value
                delete contextualized_descriptor.writable
            }
            return contextualized_descriptor
        }

        constructor(){

            this.features
                .map((feature) => {
                    return {
                        feature: feature,
                        descriptors: Object.entries(composition_factory.get_descriptor_of(feature))
                            .filter(([ name, descriptor ]) => name !== 'constructor')
                    }
                })
                .map(({ feature, descriptors }) => {

                    descriptors = descriptors.map(([ name, descriptor ]) => {
                        const contextualized_descriptor = result_t.#change_descriptor_execution_context({
                            context: feature,
                            property_name: name,
                            property_descriptor: descriptor``
                        })
                        return [ name, contextualized_descriptor ]
                    })
                    return { feature, descriptors }
                })
                .reduce((accumulator, { feature, descriptors }) => {
                    return [ ...accumulator, ...descriptors ]
                }, [])
                .forEach(([ name, descriptor ]) => {
                    Object.defineProperty(this, name, descriptor)
                })
        }
    }
}
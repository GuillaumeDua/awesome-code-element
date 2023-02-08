const op_bundle_1 = (state) => ({
    op_1: () => console.log('op_1'),
    get value() {
        return state.details.value
    },
    set value(arg) {
        state.details.value = arg
        state.NotifyPropertyChanged({ property_name: 'value' })
    }
})
const op_bundle_NotifyPropertyChangedInterface = (state, parameters) => {
    
    handlers = new Map // private storage // TODO: as member

    return {
        _constructor(){

            if (!parameters)
                return
            if (!(parameters instanceof Array))
                throw new Error('NotifyPropertyChangedInterface.constructor: invalid argument')

            parameters.forEach((value, index) => {
                if (!(value instanceof Array) || value.length !== 2)
                    throw new Error(`NotifyPropertyChangedInterface.constructor: invalid argument (at index ${index})`)
                state.add_OnPropertyChangeHandler({ property_name: value[0], handler: value[1] })
            })
        },
        add_OnPropertyChangeHandler({property_name, handler}) {
            if (!(handler instanceof Function))
                throw new Error('NotifyPropertyChangedInterface.add_OnPropertyChangeHandler: invalid argument')
            handlers.set(property_name, handler)
        },
        remove_OnPropertyChangeHandler({property_name}) {
            handlers.delete(property_name)
        },
        NotifyPropertyChanged({property_name}){
            const handler = handlers.get(property_name)
            if (handler)
                handler({
                    property_name: property_name,
                    value: this[property_name]
                })
        }
    }
}

class composition_factory {
    static is_feature_descriptor = (value) => {
        return value && value.value && value.parameters
    }
    static make_prototype = ({ state, features }) => {

        if (!state
         || !(features instanceof Array)
         || features.filter(feature => !feature).length)
            throw new Error('composition_factory: invalid argument')

        state = structuredClone(state) // explicit copy

        features.map(feature => {
            if (!composition_factory.is_feature_descriptor(feature)) {
                feature = {
                    value: feature,
                    parameters: []
                }
            }
            return Object.getOwnPropertyDescriptors(feature.value(state, ...feature.parameters))
        }).forEach(propertyDescriptor => {
            Object.defineProperties(state, propertyDescriptor)
            if (propertyDescriptor._constructor) {
                state._constructor()
                delete state._constructor
            }
        })
        
        return state
    }
    static make_composition = ({ state, features }) => {
        // return () => composition_factory.make_prototype({ state: state, features: features })
        return class {
            constructor(){
                const prototype = composition_factory.make_prototype({ state: state, features: features })
                Object.defineProperties(this, Object.getOwnPropertyDescriptors(prototype))
            }
        }
    }
}

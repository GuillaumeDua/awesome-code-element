const feature_value_storage = (state) => ({
    op_1: () => console.log('op_1'),
    get value() {
        return state.details.value
    },
    set value(arg) {
        state.details.value = arg
        state.NotifyPropertyChanged({ property_name: 'value' })
    }
})
const feature_NotifyPropertyChangedInterface = (state, parameters) => {

    return {
        _NotifyPropertyChangedInterface_handlers: new Map,
        _constructor(){

            if (!parameters)
                return
            if (!(parameters instanceof Array))
                throw new Error('NotifyPropertyChangedInterface.constructor: invalid argument')

            parameters.forEach((value, index) => {
                if (!(value instanceof Array) || value.length !== 2)
                    throw new Error(`NotifyPropertyChangedInterface.constructor: invalid argument (at index ${index})`)
                this.add_OnPropertyChangeHandler({ property_name: value[0], handler: value[1] })
            })
        },
        add_OnPropertyChangeHandler({property_name, handler}) {
            if (!(handler instanceof Function))
                throw new Error('NotifyPropertyChangedInterface.add_OnPropertyChangeHandler: invalid argument')
            this._NotifyPropertyChangedInterface_handlers.set(property_name, handler)
        },
        remove_OnPropertyChangeHandler({property_name}) {
            this._NotifyPropertyChangedInterface_handlers.delete(property_name)
        },
        NotifyPropertyChanged({property_name}){
            const handler = this._NotifyPropertyChangedInterface_handlers.get(property_name)
            if (handler)
                handler({
                    property_name: property_name,
                    value: this[property_name]
                })
        }
    }
}

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

    static is_feature_descriptor = (value) => {
        return value && value.value && value.parameters
    }
    static make_prototype = ({ state, features }) => {

        if (!state
         || !(features instanceof Array)
         || features.filter(feature => !feature).length)
            throw new Error('composition_factory: invalid argument')

        state = composition_factory.is_class_definition(state)
            ? new state
            : structuredClone(state)

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
    static make_composition = ({ state, features, extends_type = undefined }) => {
        return extends_type
            ? class extends extends_type {
                constructor(){
                    super()
                    const prototype = composition_factory.make_prototype({ state: state, features: features })
                    Object.defineProperties(this, Object.getOwnPropertyDescriptors(prototype))
                }
            }
            : class {
                constructor(){
                    const prototype = composition_factory.make_prototype({ state: state, features: features })
                    Object.defineProperties(this, Object.getOwnPropertyDescriptors(prototype))
                }
            }
    }
}

// ---

class state {
    details = { value: 42 }
}
const type_1 = composition_factory.make_composition({
    state: state,
    features: [
        feature_value_storage,
        {
            value: feature_NotifyPropertyChangedInterface,
            parameters: [
                [
                    [
                        'value', (arg) => console.log('value changer to:', arg)
                    ]
                ]
            ]
        }
    ],
    extends_type: HTMLElement
})
customElements.define('type-1', type_1)

// ---

document.addEventListener("DOMContentLoaded", () => {
    value = new type_1
    document.body.prepend(value)
    value.innerHTML = '===> Hello, there <==='
});

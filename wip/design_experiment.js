class A {
    #a = 'a'
    get a(){ return this.#a }
    set a(value){ this.#a = value }
}
class B_base {
    #b_base = 'b_base'
    get b_base(){ return this.#b_base }
    set b_base(value){ this.#b_base = value }
}
class B extends B_base {
    #b = 'b'
    get b(){ return this.#b }
    set b(value){ this.#b = value }
}

const A_mixin = base => class extends base {
    #a = 'a'
    get a(){ return this.#a }
    set a(value){ this.#a = value }
}
const B_base_mixin = base => class extends base {
    #b_base = 'b_base'
    get b_base(){ return this.#b_base }
    set b_base(value){ this.#b_base = value }
}
const B_mixin = base => class extends base {
    #b = 'b'
    get b(){ return this.#b }
    set b(value){ this.#b = value }
}

class T extends A_mixin(B_mixin(B_base)) {

}

// ---

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
const op_bundle_NotifyPropertyChangedInterface = (state, args) => {
    
    handlers = new Map

    value = {
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

    // (() => {
    //     console.log('---> called !')

    //     if (!args)
    //         return
    //     if (!(arg instanceof Array))
    //         throw new Error('NotifyPropertyChangedInterface.constructor: invalid argument')

    //     args.forEach((value, index) => {
    //         if (!(value instanceof Array) || value.length !== 2)
    //             throw new Error(`NotifyPropertyChangedInterface.constructor: invalid argument (at index ${index})`)
    //         console.log('qweqwe')
    //         value.add_OnPropertyChangeHandler(value[0], value[1])
    //     })
    // })()
    return value
}

const make_type_1 = (args) => {
    let state = { // can be a class that extends smthg like HTMLElement
        // datas
        details: {
            value: 42
        },
        value: 1
    }
    return Object.assign(
        {},
        op_bundle_1(state),
        op_bundle_NotifyPropertyChangedInterface(state, [ ['value', () => console.log('value changed')] ])
        // op_bundle_2
        // etc...
    )
}
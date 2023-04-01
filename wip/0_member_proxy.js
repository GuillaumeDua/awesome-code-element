// TODO: attributes names -> replace '_' by '-' (valid HTML)
class two_way_synced_attributes_controler {
// two-way dynamic binding: attributes <=> property accessor
//  warning: assumes get-set reciprocity. otherwise, values synced on changes is not guarantee
//
//  target: properties context
//  descriptors: Map of [ property_name => descriptor ],
//      when descriptor is { target, projection? { from?, to? }, options? }
//      so mapped.get(key).target[key] is the property
//  projections: apply transformation from/to
//
// TODO: options: { not_if_undefined: true } => remove attribute if property === undefined
// TODO: options: { one_way, two_way }
// TODO: options: { const/mutable=false } => one_way from model to attr
// 
// two-way equivalent to:
//  static get observedAttributes() { return [ ]; }
//  attributeChangedCallback(name, oldValue, newValue) {}

    #observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {

            if (mutation.type !== "attributes")
                return
        
            if (mutation.oldValue === mutation.target.getAttribute(mutation.attributeName))
                return
            if (!this.#descriptor.has(mutation.attributeName))
                throw new Error(`two_way_synced_attributes_controler.#observer: invalid .#descriptor: missing key [${mutation.attributeName}]`)
            
            // projection
            const projection = this.#descriptor.get(mutation.attributeName).projection
                            ?? AwesomeCodeElement.details.utility.types.projections.no_op
            if (!(projection.to instanceof Function))
                throw new Error(`two_way_synced_attributes_controler.#observer: invalid projection (missing .to function): for key [${mutation.attributeName}]`)

            if (!this.#original_accessors.has(mutation.attributeName))
                throw new Error(`two_way_synced_attributes_controler.#observer: invalid .#original_accessors: missing key [${mutation.attributeName}]`)

            // propagate change to setter
            const accessors = this.#original_accessors.get(mutation.attributeName)
            if (mutation.oldValue !== mutation.target.getAttribute(mutation.attributeName)
                && accessors.set && accessors.get)
            {
                const updated_value = (() => {
                    const value = projection.to(mutation.target.getAttribute(mutation.attributeName))
                    accessors.set(value)
                    return accessors.get(value)
                })()
                // setter with transformation
                if (projection.from(updated_value) !== mutation.target.getAttribute(mutation.attributeName))
                    console.debug('MutationObserver %c(attributes)', 'color:darkorange',
                        ':', mutation.target.toString(), '[', mutation.attributeName, '] propagates to attr (self) [',
                        mutation.oldValue, '->', mutation.target.getAttribute(mutation.attributeName),
                        '] as [', projection.from(updated_value), ']'
                    )
                    mutation.target.setAttribute(mutation.attributeName, updated_value)
            }
        });
    });

    #target = undefined
    #descriptor = undefined
    #original_accessors = undefined

    constructor({ target, properties_descriptor }){

        if (!target || !(target instanceof HTMLElement))
            throw new Error('two_way_synced_attributes_controler.constructor: invalid argument `target`')
        if (properties_descriptor === undefined || !(properties_descriptor instanceof Map))
            throw new Error('two_way_synced_attributes_controler.constructor: invalid argument `descriptor`')
        if (properties_descriptor.size === 0)
            throw new Error('two_way_synced_attributes_controler.constructor: empty argument `descriptor`')

        this.#target = target
        this.#descriptor = properties_descriptor
        this.start()
    }
    start(){
        this.stop()

        this.#observer.observe(this.#target, {
            attributeFilter: Array.from(this.#descriptor.keys()),
            attributeOldValue: true
        });

        Array.from(this.#descriptor.keys()).forEach((key) => {
            if (!this.#descriptor.get(key).target)
                throw new Error(`two_way_synced_attributes_controler.start: invalid target for key [${key}].\n\tExpected descriptor layout: { target, projection? { from?, to? }, options? }`)

            // initiale synchro
            const value = this.#descriptor.get(key).target[key]
            this.#target.setAttribute(key, value)

            // futher synchro
            const { origin, transformed } = AwesomeCodeElement.details.utility.inject_on_property_change_proxy({
                target: this.#descriptor.get(key).target,
                property_name: key,
                on_property_change: ({ new_value }) => {
                    if (String(new_value) !== this.#target.getAttribute(key)) {
                        console.debug('%cproperty_change_proxy', 'color:DarkSlateBlue ',
                            this.#target.toString(), '[', key, '] propagates to attr [', this.#target.getAttribute(key), '->', String(new_value), ']')
                        this.#target.setAttribute(key, new_value)
                    }
                }
            })
            this.#original_accessors.set(key, origin)
        })
    }
    stop(){
        this.#observer.disconnect()
        this.#original_accessors = new Map
        // TODO: reset accessors with .revoke
    }
}
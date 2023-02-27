
function make_proxy_to({ target, descriptors }){

    if (!target)
        throw new Error('make_proxy_to: invalid target argument')
    if (!(descriptors instanceof Array))
        throw new Error('make_proxy_to: invalid descriptor argument')
    
    let _target = target
    descriptors.forEach(({ target, property, projection }) => {
        const property_descriptor = Object.getOwnPropertyDescriptor(target, property)

        // Object.defineProperty(
        //     _target,
        //     property,
        //     property_descriptor.value
        //         ? {
        //             value: target[property]
        //         }
        //         : {
        //             get: 
        //         }
        // )
    })
}
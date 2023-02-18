class LoadingAnimation {
    
    static HTMLElement_name = 'ace-loading-animation'

    static #cache = (function(){
    // TODO: loading_animation.* as opt-in, inline (raw github data) as fallback
        const loading_animation_fallback_url = 'https://raw.githubusercontent.com/GuillaumeDua/awesome-code-element/main/resources/images/loading_animation.svg'
        let value = document.createElement('img');
            value.src = loading_animation_fallback_url
            value.id = LoadingAnimation.HTMLElement_name
            value.style.display = 'none'
        return value
    })()
    static get element() {
        return LoadingAnimation.#cache.cloneNode()
    }

    static controler = class {

        #owner = undefined
        #target = undefined
        #target_visible_display = undefined
        #element = undefined

        constructor({ owner, target }) {

            if (!(owner instanceof HTMLElement)
             || !(target instanceof HTMLElement)
            ) throw new Error('LoadingAnimation.controler: invalid argument type')

            this.#owner = owner
            this.#target = target
            this.#target_visible_display = target.style.display

            this.#element = this.#owner.appendChild(LoadingAnimation.element)
        }

        set toggle_animation(value){

            this.#target.style.display = Boolean(value) ? 'none' : this.#target_visible_display
            this.#element.style.display = Boolean(value) ? 'flex' : 'none'
        }
        get toggle_animation(){
            return Boolean(this.#element.style.display !== 'none')
        }
    }
}


    static inject_into({owner, target_or_accessor }) {
        LoadingAnimation.#inject_toggle_loading_animation({owner, target_or_accessor })
        LoadingAnimation.#inject_animate_loading_while({owner})
    }

    static #inject_toggle_loading_animation({
        owner,              // injects `owner.toggle_loading_animation`
        target_or_accessor  // target, or a parameterless function that returns the target (preserving access after potential dereferencement)
    }){
        const loading_animation_element = owner.appendChild(LoadingAnimation.element)
        const target_accessor = () => {
            return target_or_accessor instanceof Function
                ? target_or_accessor()
                : target_or_accessor
        }

        const target_visible_display = target_accessor().style.display

        Object.defineProperty(owner, 'toggle_loading_animation', {
            set: function(value){
                target_accessor().style.display         = Boolean(value) ? 'none' : target_visible_display
                loading_animation_element.style.display = Boolean(value) ? 'flex' : 'none'
            },
            get: function(){
                return Boolean(loading_animation_element.style.display !== 'none')
            }
        })
    }
    static async #inject_animate_loading_while({owner}){
    // injects `owner.animate_loading_while`
        owner.animate_loading_while = (task) => {
            owner.toggle_loading_animation = true
            let task_result = undefined
            try {
                task_result = task()
            }
            catch (error){
                owner.toggle_loading_animation = false
                throw (error instanceof Error ? error : new Error(error))
            }
            if (task_result instanceof Promise)
                return task_result.then(() => {
                    owner.toggle_loading_animation = false
                })
            owner.toggle_loading_animation = false
        }
    }
}
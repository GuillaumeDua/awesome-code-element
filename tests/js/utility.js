
class global_behavior_modifiers {
// class-as-namespace

    // slow fetch resource (emulates slow network)
    static #original_fetch_resource = utility.fetch_resource
    static get toggle_slow_fetch_resource() {
        return global_behavior_modifiers.#original_fetch_resource !== utility.fetch_resource
    }
    static set toggle_slow_fetch_resource(value) {
        utility.fetch_resource = value ? global_behavior_modifiers.#slow_fetch_resource : global_behavior_modifiers.#original_fetch_resource
    }
    static #slow_fetch_resource(url, { on_error, on_success }){
        let xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onerror = function() {
                on_error(`RemoteCodeSection: network Error`)
            };
            xhr.onload = function() {

                if (xhr.status != 200) {
                    on_error(`RemoteCodeSection: bad request status ${xhr.status}`)
                    return;
                }

                // TEST: emulate latency in resource acquisition
                console.info('[fake] loading ...');
                setTimeout(function(){
                    console.info('[fake] loaded !');
                    on_success(xhr.responseText)
                }, 1500);
            };
            xhr.send();
    }

    // toggle 'stylished'
    static #_toggle_style = false
    static get toggle_style() {
        return global_behavior_modifiers.#_toggle_style
    }
    static set toggle_style(value) {

        const stylished_classname = 'stylished'

        global_behavior_modifiers.#_toggle_style = value
        let apply_toggle_style = global_behavior_modifiers.#_toggle_style
            ? function (elements) { elements.addClass   (`${stylished_classname}`)}
            : function (elements) { elements.removeClass(`${stylished_classname}`)}

        let elements = $('body').find('code, div.fragment, pre.fragment, div.contents')
        apply_toggle_style(elements)
    }

    // toggle small page width
    static #_toggle_small = false
    static get toggle_small() {
        return global_behavior_modifiers.#_toggle_small
    }
    static set toggle_small(value) {

        let r = document.querySelector(':root');

        global_behavior_modifiers.#_toggle_small = value
        if (global_behavior_modifiers.#_toggle_small)
            r.style.setProperty('width', '500px' );
        else
            document.querySelector(':root').style.removeProperty('width')
    }
}

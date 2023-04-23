# **ACE** - HTML Awesome code element

![](https://raw.githubusercontent.com/GuillaumeDua/awesome-code-element/main/docs/images/simple_test_output.JPG)

ACE is a `JS` modules which offers both `HTML` and `JS` APIs to integrate code examples in web pages and various documentations systems.  

---

Internaly uses [compiler-explorer API](https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/API.md) for languages supports, code compilation and execution.

- See [supported languages](https://godbolt.org/api/languages)
- See [supported compilers](https://godbolt.org/api/compilers)

Such code-sections behaviors and styles are highly customizables *(supports themes, dark-mode, styles/layouts, etc.)*.

---

## Showcases

*The following showcases are CI-deployed.*

| showcase name | status |
|-|-|
| 🌐 [*\<ace-code-section\>*](https://guillaumedua.github.io/awesome-code-element/showcase/ace_code_section/)          | ✔️ |
| 🌐[*\<div\> placeholders*](https://guillaumedua.github.io/awesome-code-element/showcase/html_divs_placeholders/)     | ✔️ |
| 🌐 [acs miscs](https://guillaumedua.github.io/awesome-code-element/showcase/misc/)                                   | ✔️ |
| 🔌 [**Doxygen** integration (plain)](https://guillaumedua.github.io/awesome-code-element/showcase/using_doxygen/output/md_docs_showcase_using_doxygen_index.html) | ✔️ |
| 🔌 **Doxygen** integration with **Doxgen-awesome-css** | ❌ *(incoming)* |
| 🕹️ [Interactive live demo](https://guillaumedua.github.io/awesome-code-element/showcase/live_demo/)  | ✔️ |

---

<!-- TODO: iframe to live demo here ?    -->
<!-- TODO: iframe showcase subset here ? -->
<!-- TODO: integrate ace-cs elements that best demonstrates standard usage -->

<!--
- bindings
- html structure/hierarchy
- thanks to hljs, compiler-explorer
-->

## Content

## CodeSection

Ths is the module's main components. It represents a code example, which can optionally be executed. If so, its associated output is then displayed on another side panel.

### HTML API

```html
<ace-code-section language="cpp" toggle_execution="true">
#include <iostream>
auto main() -> int {
    auto i = 42;
    std::cout << "some console output : " << i;
    return i;
}                       
</ace-code-section>
```

Note that users do not have to care about invalid HTML in the provided code. For instance, in the example above, `<iostream>` does not generates invalid HTML, neither shift operators `<<`.

### Javascript API

```js
let code = `
#include <iostream>
auto main() -> int {
    std::cout << 'Hello, there';
    return 42;
}
`
let code_section = new CodeSection(code, 'cpp')
    // equivalent to:  awesome_doc_code_sections.HTML_elements.CodeSection
// attach `code_section` to the DOM ...
```

Which is equivalent to the following plain HTML:

- As `div`

    ```html
    <div class='awesome-doc-code-sections_basic-code-section' language="cpp">
    <pre><code>
    #include &lt;iostream&gt;
    auto main() -> int {
        std::cout << 'Hello, there';
        return 42;
    }
    </code></pre>
    </div>
    ```

- As custom `awesome-doc-code-sections_code-section` HTMLElement

    ```html
    <awesome-doc-code-sections_code-section language="cpp">
    #include &lt;iostream&gt;
    auto main() -> int {
        std::cout << 'Hello, there';
        return 42;
    }
    </awesome-doc-code-sections_code-section>
    ```

- As custom `awesome-doc-code-sections_code-section` HTMLElement (formated)

    ```html
    <awesome-doc-code-sections_code-section language="cpp">
    <pre><code>
    #include &lt;iostream&gt;
    auto main() -> int {
        std::cout << 'Hello, there';
        return 42;
    }
    </code></pre>
    </awesome-doc-code-sections_code-section>
    ```

- As custom `awesome-doc-code-sections_code-section` HTMLElement (using 'code' attribute)

    ```html
    <awesome-doc-code-sections_code-section language="cpp" code="#include <iostream>
    auto main() -> int {
        std::cout << 'Hello, there';
        return 42;
    }">
    </awesome-doc-code-sections_code-section>
    ```

Note that creating an empty `CodeSection`/`code-section` is **not** recommanded on the user-side.  
Internally, it creates a `shadow-root` slot, which associated with an event listener will wait for some content to be added. Once done, the shadow-root is removed, and the element cleaned-up.  

The main scenario for such usage is defered initialization, for instance when polling some code from an API.  
Even though, users might prefer to wait for such API response, and only once received then create the `CodeSection` element and attach it to the DOM.

## Toggle dark/light mode

```html
<button is="awesome-doc-code-sections_toggle-dark-mode-button"></button>
```

## Theme selector

Users can experiment which theme they prefer using [highlightjs.org static demo](https://highlightjs.org/static/demo/).

Such stylesheets are imported from [cndjs](https://cdnjs.com/libraries/highlight.js), so the following pattern must match a valid url : `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/${theme_name}.js`, where `${theme_name}` is a valid theme name.

> Note that the first option is the default one here.

```html
<!-- The default one is the first one -->
<select is="theme-selector">
    <option value="tokyo-night"></option>
    <option value="base16/google"></option>
</select>
```

---

## Special thanks

<div style="display:flex; align-items: center;">
    <a href="https://github.com/MikeFernandez-Pro">
        <img src='https://avatars.githubusercontent.com/u/79382274' style="object-fit: cover; border-radius: 50%; width: 80px;" title="MikeFernandez-Pro"/>
    </a> &nbsp; for his kind CSS reviews & mentoring
</div>

And to all contributors :

<a href="https://github.com/GuillaumeDua/awesome-doc-code-sections/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=GuillaumeDua/awesome-doc-code-sections" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

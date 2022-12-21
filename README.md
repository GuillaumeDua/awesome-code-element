# Awesome-doc-code-sections

`HTML`/`JS` code sections for documentation purposes.  
Optionaly compatible with [Doxygen](https://doxygen.nl/) (which can - or not - be used in conjunction with [doxygen-awesome-css](https://github.com/jothepro/doxygen-awesome-css) too)

Originaly created to ease the documentation creation process of [CppShelf](https://github.com/GuillaumeDua/CppShelf)

---

- [Showcase](https://guillaumedua.github.io/awesome-code-element/showcase/ace_code_section/)
- [Live demo](https://guillaumedua.github.io/awesome-code-element/showcase/live_demo/)

---

<!-- TODO: iframe to live demo here ?    -->
<!-- TODO: iframe showcase subset here ? -->

## Content

## CodeSection

This is the main component : it renders code, and optionally execute it, then display the output in another panel.

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

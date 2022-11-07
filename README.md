# Awesome-doc-code-sections

`HTML`/`JS` code sections for documentation purposes.  
Optionaly compatible with [Doxygen](https://doxygen.nl/) (which can - or not - be used in conjunction with [doxygen-awesome-css](https://github.com/jothepro/doxygen-awesome-css) too)

Originaly created to ease the documentation creation process of [CppShelf](https://github.com/GuillaumeDua/CppShelf)

---

![](https://raw.githubusercontent.com/GuillaumeDua/awesome-doc-code-sections/main/docs/images/simple_test_output.JPG)

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
let code_section = new CodeSection(code, 'c++')
    // equivalent to   awesome_doc_code_sections.HTML_elements.CodeSection

// attach `code_section` to the DOM ...
```

Which is equivalent to :

```html
<div class='awesome-doc-code-sections_basic-code-section' language="cpp">
    <pre><code>
#include <iostream>
auto main() -> int {
    std::cout << 'Hello, there';
    return 42;
}
    </code></pre>
</div>
```


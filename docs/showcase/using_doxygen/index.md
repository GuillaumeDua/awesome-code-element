# This is an markdown index file

This showcase demonstrates various ways to use `ace-cs` in a `Doxygen` documentation.  
Here, such documentation is generated using a `Markdown` index file (see `docs/showcase/using_doxygen/index.md`).

**Q**: Why use `<div class="ace-cs-element">` rather than `<ace-cs-element>` tags ?  

- Plain Markdown does not (by default) allow custom `HTMLElement`s.  
  Here, we use `<div class="ace-cs-element">` tags which are `acs-cs`'s placeholders for `<ace-cs-element>` tags, that are automatically replaced by the `ace-cs` library.

**Q**: Why the extra `<pre></pre>` tags ?  

- Note that because such document is converted from Markdown to `HTML`,  
  we need to enclose code in `HTML` `<pre></pre>` tag in order to preserve return characters.  
  In opposition to pure `HTML` file in which you don't.

---

## Using \`\include\` doxygen directive

```html
<div class="ace-cs-element" language="cpp" toggle_execution="true">
\include noexecute_show_block_with_output.cpp
</div>
```

<div class="ace-cs-element" language="cpp" toggle_execution="true">
\include noexecute_show_block_with_output.cpp
</div>

## Using external, remote-located code

```html
<div class="ace-cs-element"
     language="cpp"
     toggle_execution="true"
     url="https://raw.githubusercontent.com/GuillaumeDua/awesome-code-element/main/docs/details/resources/code_content/noexecute_show_block_with_output.cpp">
</div>
```

<div class="ace-cs-element"
     language="cpp"
     toggle_execution="true"
     url="https://raw.githubusercontent.com/GuillaumeDua/awesome-code-element/main/docs/details/resources/code_content/noexecute_show_block_with_output.cpp">
</div>

## Using embedded code example

```html
<div class="ace-cs-element" language="cpp" toggle_execution="true">
<pre>
#include <iostream>
auto main() -> int {
    auto i = 42;
    std::cout << "some console output";
    return i;
}
</pre>
</div>
```

<div class="ace-cs-element" language="cpp" toggle_execution="true">
<pre>
#include <iostream>
auto main() -> int {
    auto i = 42;
    std::cout << "some console output";
    return i;
}
</pre>
</div>

---

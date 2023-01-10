# This is an markdown index file

Some code examples here.

*Note: plain Doxygen does not support light/dark-mode toggling*

---

## plain \`\include\` doxygen directive

```html
\include noexecute_show_block_with_output.cpp
```

\include noexecute_show_block_with_output.cpp

## Using \`\include\` doxygen directive

```html
<div class="ace-code-section" language="cpp" toggle_execution="true">
\include noexecute_show_block_with_output.cpp
</div>
```

<div class="ace-code-section" language="cpp" toggle_execution="true">
\include noexecute_show_block_with_output.cpp
</div>

## Using external, remote-located code

```html
<div class="ace-code-section"
     language="cpp"
     toggle_execution="true"
     url="https://raw.githubusercontent.com/GuillaumeDua/awesome-code-element/main/docs/details/resources/code_content/noexecute_show_block_with_output.cpp">
</div>
```

<div class="ace-code-section"
     language="cpp"
     toggle_execution="true"
     url="https://raw.githubusercontent.com/GuillaumeDua/awesome-code-element/main/docs/details/resources/code_content/noexecute_show_block_with_output.cpp">
</div>

## Using embedded code example

```html
<div class="ace-code-section" language="cpp" toggle_execution="true">
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

<div class="ace-code-section" language="cpp" toggle_execution="true">
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
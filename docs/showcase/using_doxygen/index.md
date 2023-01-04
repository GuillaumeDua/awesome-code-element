# This is an markdown index file

Some code examples here :

---

## Using \`\include\` doxygen directive:

```html
<div class="ace-code-section" language="cpp" toggle_execution="true">
\include noexecute_show_block_with_output.cpp
</div>
```

<div class="ace-code-section" language="cpp" toggle_execution="true">
\include noexecute_show_block_with_output.cpp
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
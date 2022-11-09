// some comment here
// ...

// @awesome-doc-code-sections::CE={
//  "language"            : "c++",
//  "compiler_id"         : "clang1400",
//  "compilation_options" : "-O2 -std=c++20",
//  "libs"                : [ {"id": "fmt", "version": "trunk"} ],
//  "includes_transformation" : [
//        [ "csl/",       "https://raw.githubusercontent.com/GuillaumeDua/CppShelf/main/includes/ag/csl/" ]
//  ]
//  }
#include "csl/ag.hpp" // @awesome-doc-code-sections::show::line

auto main() -> int {
// @awesome-doc-code-sections::show::block::begin
auto i = 42; // test
return i;
// @awesome-doc-code-sections::show::block::end
}

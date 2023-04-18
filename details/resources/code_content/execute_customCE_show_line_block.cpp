// some comment here
// ...

// @ace::CE={
//  "language"            : "c++",
//  "compiler_id"         : "clang1400",
//  "compilation_options" : "-O2 -std=c++20",
//  "libs"                : [ {"id": "fmt", "version": "trunk"} ],
//  "includes_transformation" : [
//        [ "csl/",       "https://raw.githubusercontent.com/GuillaumeDua/CppShelf/main/includes/ag/csl/" ]
//  ],
//  "add_in_doc_execution" : true
//  }
#include "csl/ag.hpp" // @ace::show::line

auto main() -> int {
// @ace::show::block::begin

auto i = 42; // test
return i;
// @ace::show::block::end
}

hljs.configure({
  ignoreUnescapedHTML: true,
  throwUnescapedHTML: false,
  languages: ["cpp", "c", "bash", "cmake", "markdown", "json", "plaintext"],
});

awesome_doc_code_sections.options.configure({
  doxygen_awesome_css_compatibility: true,
});
awesome_doc_code_sections.configuration.CE = new Map([
  // fallback configurations
  [
    "cpp",
    {
      language: "c++",
      compiler_id: "clang1500",
      default_options: "-O2 -std=c++20",
    },
  ],
]);
awesome_doc_code_sections.initialize(); // initialize all features

let is_stylished = false;
function toggle_style() {
  const stylished_classname = "stylished";

  let apply_toggle_style = is_stylished
    ? function (elements) {
        elements.removeClass(`${stylished_classname}`);
      }
    : function (elements) {
        elements.addClass(`${stylished_classname}`);
      };
  is_stylished = !is_stylished;

  let elements = $("body").find("code, div.fragment, pre.fragment, main.contents");
  apply_toggle_style(elements);
}

let is_small = false;
function toggle_small() {
  let r = document.querySelector(":root");
  let rs = getComputedStyle(r);
  let content_max_width = rs.getPropertyValue("--content-maxwidth");

  r.style.setProperty("--content-maxwidth", (is_small ? 1050 : 500) + "px");
  is_small = !is_small;
}

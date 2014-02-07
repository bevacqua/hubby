// Simple JavaScript Templating (mildly modified by @nzgb)
// John Resig - http://ejohn.org/ - MIT Licensed
~function(){
  var cache = {};
  window.tmpl = function tmpl (view, model) {
    var fn = !/\W/.test(view) ? cache[view] = cache[view] || tmpl(document.getElementById(view).innerHTML) :
      new Function("obj", "var p=[];with(obj){p.push('" +
        view
          .replace(/[\r\t\n]/g, " ")
          .split("{{").join("\t")
          .replace(/((^|}})[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)}}/g, "',$1,'")
          .split("\t").join("');")
          .split("}}").join("p.push('")
          .split("\r").join("\\'")
      + "');}return p.join('');");
    return model ? fn(model) : fn;
  };
}();

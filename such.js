// core
!function (window, document) {
  var $ = document.querySelector.bind(document);

  $.atoa = function (a) { return Array.prototype.slice.call(a); }

  $.format = function () {
    var items = $.atoa(arguments);
    return items.reduce(function (result, item) {
      return result.replace('%s', item);
    }, items.shift())
  };

  window.suchjs = $;
}(window, document);

// dom
!function ($, Node) {
    Node.prototype.on = Node.prototype.addEventListener;
    Node.prototype.remove = function () { this.parentNode.removeChild(this); };
    Node.prototype.txt = function (v) { if (v === void 0) { return this.innerText; } this.innerText = v; }
    Node.prototype.html = function (v) { if (v === void 0) { return this.innerHTML; } this.innerHTML = v; }
    Node.prototype.attr = function (n, v) { if (v === void 0) { return this.getAttribute(n); } this.setAttribute(n, v); }
}(suchjs, Node);

// async
!function ($) {
  $.async = {
    waterfall: function (steps, done) {
      function next () {
        var used;
        return function () {
          if (used) { return; }
          used = true;
          var args = $.atoa(arguments);
          var step = steps.shift();
          if (step) {
            var err = args.shift();
            if (err) { done(err); return; }
            args.push(next());
            step.apply(null, args);
          } else {
            done.apply(null, arguments);
          }
        };
      }
      next()();
    },
    parallel: function (tasks, done) {
      var a = tasks instanceof Array;
      var keys = a ? tasks : Object.keys(tasks);
      var complete;
      var completed = 0, all = keys.length;
      var results = a ? [] : {};
      keys.forEach(function (key, i) {
        var k = a ? i : key;
        setTimeout(tasks[k](next(k)), 0);
      });

      function next (k) {
        var used;
        return function (err) {
          if (complete || used) { return; }
          used = true;
          var args = $.atoa(arguments);
          var err = args.shift();
          if (err) { complete = true; done(err); return; }
          results[k] = args.shift();
          if (++completed === all) {
            done(null, results);
          }
        }
      }
    }
  };
}(suchjs);

// ajax
!function ($, XMLHttpRequest) {
  $.ajax = function (url, options, done) {
    var method = options.method.toUpperCase();
    var xhr = new XMLHttpRequest();
    xhr.responseType = options.responseType || 'json';
    xhr.open(method, compose(url), true);
    xhr.addEventListener('load', function () {
      var res = xhr.response; try { res = JSON.parse(res); } catch (e) {}
      done(res, xhr.status, xhrWrap());
    });
    xhr.addEventListener('error', function () {
      done(null, xhr.status, xhrWrap());
    });
    Object.keys(options.headers || {}).forEach(function (key) {
      xhr.setRequestHeader(key, options.headers[key]);
    });
    xhr.send(data());

    function compose (url) {
      if (method !== 'GET' || !options.data) {
        return url;
      }
      var params = Object.keys(options.data).map(function (key) {
        return key + '=' + options.data[key];
      }).join('&');
      var connector = '?';
      var query = url.lastIndexOf('?');
      if (query !== -1) {
        connector = (query === url.length - 1) ? '' : '&';
      }
      return url + connector + params;
    }

    function data () {
      if (method !== 'GET' && options.data) {
        var form = new FormData();
        Object.keys(options.data).forEach(function (key) {
          form.append(key, JSON.stringify(options.data));
        });
      }
    }
    function xhrWrap () { return { headers: getHeaders(), original: xhr }; }

    function getHeaders () {
      return xhr.getAllResponseHeaders().split('\n').reduce(function (headers, header) {
        if (header.length) {
          var sep = ': ';
          var parts = header.split(sep);
          var name = parts.shift();
          var value = parts.join(sep);
          if (name === 'Link') {
            headers.Link = parseLinkHeader(value);
          } else {
            headers[name] = value;
          }
        }
        return headers;
      }, {});
    }

    function parseLinkHeader (header) {
      var parts = header.split(',');
      var urlPart = /<(.*)>/;
      var relPart = /rel=['"](.*)['"]/i;
      return parts.reduce(function (links, part) {
        var pieces = part.split(';');
        var url = pieces[0].match(urlPart, '$1');
        var rel = pieces[1].match(relPart, '$1');
        if (url && url.length && rel && rel.length) {
          links[rel[1]] = url[1];
        }
        return links;
      }, {});
    }
  };

  function mapjax (method) {
    var proper = method.toUpperCase();
    $[method] = function (url, options, done) {
      if (done === void 0) {
        done = options;
        options = {};
      }
      options.method = proper;
      $.ajax(url, options, done);
    };
  }
  mapjax('get');
  mapjax('post');
}(suchjs, XMLHttpRequest);

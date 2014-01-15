!function ($) {

  var username = $('.hy-username');
  var usernameVal = $('.ve-username');
  var validation = /[a-z0-9_-]+/i;

  $('.hy-hubalyze').on('click', validate);
  $('.hy-again').on('click', again);

  username.focus();

  function validate (e) {
    e.preventDefault();

    var input = username.value;
    if (input.match(validation)) {
      usernameVal.classList.remove('ve-show');
      fetch(input);
    } else {
      invalid(input);
    }
  }

  function invalid (input) {
    usernameVal.txt(input === '' ? 'That' : input);
    usernameVal.classList.add('ve-show');
  }

  function wrap (then) {
    var xhrcontainer = $('.ve-xhr');
    var xhrmessage = $('.ve-xhr-message');
    var xhrdocumentation = $('.ve-xhr-documentation');
    xhrcontainer.classList.remove('ve-show');

    return function (res, status, xhr) {
      if (status < 200 || status >= 300) {
        xhrcontainer.classList.add('ve-show');
        xhrmessage.txt($.format('(%s) %s', status, res && res.message ? res.message : 'Unknown Error'));

        if (res && res.documentation_url) {
          xhrdocumentation.attr('href', res.documentation_url);
          xhrdocumentation.txt(res.documentation_url);
          xhrdocumentation.classList.add('ve-show');
        } else {
          xhrdocumentation.attr('href', null);
          xhrdocumentation.classList.remove('ve-show');
        }
      } else {
        then(res, status, xhr);
      }
    };
  }

  function fetch (username) {
    $.async.parallel({
      user: getUser, repos: getRepos
    }, processing);

    function getUser (done) {
      var endpoint = $.format('https://api.github.com/users/%s', username);

      $.get(endpoint, { headers: { Accept: 'application/vnd.github.v3+json' } }, wrap(function (res) {
        done(null, res);
      }));
    }

    function getRepos (done) {
      var repos = [];

      moreRepos();

      function moreRepos (url) {
        var endpoint = url || $.format('https://api.github.com/users/%s/repos', username);

        $.get(endpoint, { headers: { Accept: 'application/vnd.github.v3+json' } }, wrap(function (res, status, xhr) {
          repos.push.apply(repos, res);

          if (xhr.headers.Link && xhr.headers.Link.next) {
            moreRepos(xhr.headers.Link.next);
          } else {
            done(null, repos);
          }
        }));
      }
    }
  }

  function processing (err, input) {
    var data = { forks: 0, stars: 0, created: [], forked: [] };
    var s = 'stargazers_count';
    var f = 'forks_count';

    data.user = input.user;
    data.repos = input.repos || [];
    data.repos.forEach(function (repo) {
      if (repo.fork) {
        data.forked.push(repo);
      } else {
        data.created.push(repo);
      }
      data.stars += repo[s];
      data.forks += repo[f];
    });
    data.most = {
      starred: data.repos.filter(starred).sort(starsort).slice(0, 15),
      forked: data.repos.filter(forked).sort(forksort).slice(0, 5)
    };
    data.lang = getLanguages(data);
    reveal(data);

    function starred (r) { return r[s]; }
    function starsort (a, b) { return b[s] - a[s]; }
    function forked (r) { return r[f]; }
    function forksort (a, b) { return b[f] - a[f]; }
  }

  function getLanguages (data) {
    var words = data.repos.map(function (repo) { return repo.language; }).sort();
    var next = words.shift();
    var result = {};
    while (next) {
      var c = words.length, i, lang = next;
      while (lang === (next = words.shift()));
      i = c - words.length;
      result[lang] = i;
    }
    return Object.keys(result).sort(function (a, b) {
      return result[b] - result[a];
    }).map(function (k) {
      return { language: k, count: result[k] };
    });
  }

  function getReposByLanguages (data) {
    var repos = {};
    data.repos.forEach(function (repo) {
      if (!repo.language) {
        repo.language = 'Other';
      }
      if (!repos[repo.language]) {
        repos[repo.language] = [repo];
      } else {
        repos[repo.language].push(repo);
      }
    });
    return repos;
  }

  function reveal (data) {
    console.info('data accessible in window.data');
    console.info(data);
    window.data = data;
    $('.oh-header').html(tmpl('oh_header', data));
    $('.ot-sidebar').html(tmpl('ot_sidebar', data));
    $('.ot-description').html(tmpl('ot_description', data));
    $('.ot-repos').html(tmpl('ot_repos', data));
    document.body.classList.add('hy-reveal');
  }

  function again () {
    document.body.classList.remove('hy-reveal');
  }

  // $.get('https://api.github.com/zen', { responseType: 'text', headers: { Accept: 'application/vnd.github.v3+json' } }, wrap(function (res) {
  //   $('.gh-quote').txt(res);
  // }));
}(suchjs);

~function ($, root) {
  var username = $('.hy-username');
  var usernameVal = $('.ve-username');

  function validate (e, state) {
    var validation = /[a-z0-9_-]+/i;

    if (e) { e.preventDefault(); }

    usernameVal.classList.remove('ve-show');

    var input = username.val();
    if (input.match(validation)) {
      fetch(input, state);
    } else if (!state) {
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

  function set (key, value, tracked) {
    try {
      if (tracked) {
        var track = get('track', {});
        track[key] = +new Date();
        localStorage.setItem('track', track);
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      decay();
    }
  }

  function get (key, defaultValue) {
    try {
      return JSON.parse(localStorage.getItem(key)) || defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  function rm (key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // swallow
    }
  }

  function decay () {
    try { // decompress localStorage a bit in case of riots
      var track = get('track', {});
      var keys = Object.keys(track).sort(subtract);
      rm(keys[0]);
    } catch (e) {
      // swallow
    }
  }

  function sum (a, b) { return a + b; }
  function subtract (a, b) { return b - a; }
  function subtractOn (thing) {
    return function (a, b) { return thing[b] - thing[a]; }
  }

  function pluck (a, crumbs) {
    var props = crumbs.split('.');
    var prop = props.shift();
    var plucked = a.map(function (a) { return a[prop]; });
    if (props.length) {
      return pluck(plucked, props.join('.'));
    }
    return plucked;
  }

  function where (a, matches) {
    var of = Object.keys(matches);
    return a.filter(function (a) {
      return of.every(function (prop) { return a[prop] === matches[prop]; });
    });
  }

  function count (what) {
    var r = {};
    what.forEach(function (k) { r[k] = (r[k] || 0) + 1; });
    return r;
  }

  function dates (a) {
    return a.map(function (d) { return moment(d); }).sort(subtract);
  }

  function fetch (username) {
    set('last.username', username, false);

    if (history && history.pushState) {
      history.pushState({ username: username }, username + ' on Hubalyzer', '?' + username);
    }

    var cache = get('data.' + username, { generated: false });
    if (cache.generated && new Date() - cache.generated < 600000) {
      reveal(cache); // fresh for 10m
      return;
    }
    console.info('Fetching user data from GitHub...');
    $.async.parallel({
      user: getUser, repos: getRepos, events: getEvents
    }, processing);

    function query (endpoint, done) {
      var base = 'https://api.github.com';
      var url = endpoint.indexOf(base) === 0 ? endpoint : base + endpoint;

      $.get(url, { headers: { Accept: 'application/vnd.github.v3+json' } }, wrap(done));
    }

    function getUser (done) {
      query($.format('/users/%s', username), function (res) {
        done(null, res);
      });
    }

    function getSomePages (endpoint, pages, done) {
      var partial = [], page = 0;
      morePages();
      function morePages (url) {
        var resource = url || endpoint;
        query(resource, function (res, status, xhr) {
          partial.push.apply(partial, res);
          if (page++ < pages && xhr.headers.Link && xhr.headers.Link.next) {
            morePages(xhr.headers.Link.next);
          } else {
            done(null, partial);
          }
        });
      }
    }

    function getRepos (done) {
      getSomePages($.format('/users/%s/repos', username), 10, done);
    }

    function getEvents (done) {
      getSomePages($.format('/users/%s/events', username), 10, done);
    }
  }

  function processing (err, input) {
    var data = { forks: 0, stars: 0, created: [], forked: [] };
    var s = 'stargazers_count';
    var f = 'forks_count';

    data.events = input.events;
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
    data.kstars = ks(data.stars);
    data.kforks = ks(data.forks);
    data.kfollowers = ks(data.user.followers);
    data.tcreated = data.created.length;
    data.kcreated = ks(data.tcreated);
    data.kgists = ks(data.user.public_gists);
    data.kforked = ks(data.forked.length);
    data.kfollowing = ks(data.user.following);
    data.generated = +new Date();

    var pushEvents = where(data.events, { type: 'PushEvent' });
    var pushCommits = pluck(pushEvents, 'payload.commits.length').reduce(sum);
    var pushRepos = pluck(pushEvents, 'repo.name');
    var pushCounts = count(pushRepos);
    var pushRepoTop = Object.keys(pushCounts).sort(subtractOn(pushCounts));

    data.eventTypes = count(pluck(data.events, 'type'));
    data.eventFrame = dates(pluck(data.events, 'created_at'));
    data.eventPushes = {
      repoCount: pushCounts,
      repoTop: pushRepoTop,
      commits: pushCommits,
    };

    set('data.' + data.user.login, data);

    reveal(data);

    function starred (r) { return r[s]; }
    function starsort (a, b) { return b[s] - a[s]; }
    function forked (r) { return r[f]; }
    function forksort (a, b) { return b[f] - a[f]; }
  }

  function ks (v) {
    var notation = '';
    while (v > 1000) {
      v /= 1000;
      if (notation === 'k') {
        notation = 'm'; break;
      } else if (!notation) {
        notation = 'k';
      }
    }
    return +v.toFixed(1) + notation;
  }

  function getLanguages (data) {
    var result = {};
    data.repos.forEach(function (repo) {
      var lang = repo.language || 'mystery';
      if (!result[lang]) {
        result[lang] = { c: 0, s: 0 };
      }
      result[lang].c++;
      result[lang].s += repo.stargazers_count;
    });
    return Object.keys(result).sort(function (a, b) {
      return result[b].c - result[a].c;
    }).map(function (k) {
      var d = result[k], c = d.c, s = d.s, r = d.s / d.c;
      return { language: k, ratio: r, count: c, rank: getRank(c), title: getTitle(r), prefix: getRepoPrefix(c), stars: s };
    });
  }

  function getPhrase (factor, things, defaultPhrase) {
    for (var key in things) {
      if (factor < parseInt(key, 10)) {
        return things[key];
      }
    }
    return defaultPhrase;
  }

  function getTitle (factor) {
    var titles = {
      2: 'a',
      3: 'alive. He writes anecdotal',
      4: 'a quiet',
      5: 'a learning',
      6: 'a reasonable',
      8: 'a self-starting',
      12: 'superman. He\'s a happy',
      15: 'wonderwoman. She\'s a quality',
      18: 'an amazing',
      21: 'such a doge. Very',
      26: 'a prolific',
      46: 'a generous',
      72: 'a passionate',
      85: 'a loving',
      99: 'a charitable',
      140: 'a veritable',
      184: 'a unselfish',
      238: 'a magnanimous',
      287: 'a kindhearted',
      325: 'a thoughtful',
      419: 'a altruistic',
      465: 'a hospitable',
      490: 'a more than generous'
    };
    return getPhrase(factor, titles, 'out of this world. He\'s a terrific');
  }

  function getRank (factor) {
    var ranks = {
      2: 'neophyte',
      3: 'explorer',
      5: 'developer',
      8: 'practitioner',
      11: 'sailor',
      14: 'adept',
      17: 'adventurer',
      24: 'aficionado',
      28: 'warrior',
      31: 'expert',
      34: 'legend',
      37: 'doge',
      40: 'master',
      43: 'elder',
      47: 'ninja',
      53: 'soldier',
      60: 'samurai',
      65: 'extraordinaire',
      71: 'flipboarder',
      76: 'extremist',
      82: 'heavyweight',
      88: 'champion',
      95: 'globetrotter',
      102: 'grandmaster',
      110: 'machine',
      119: 'legend',
      131: 'supercomputer',
      147: 'martian',
      162: 'hotshot',
      175: 'blackbelt',
      187: 'octocat',
      200: 'superstar'
    };
    return getPhrase(factor, ranks, 'god');
  }

  function getRepoPrefix (factor) {
    return getPrefix(factor, 'repos');
  }

  function getPrefix (factor, thing) {
    var prefixes = {
      1: 'exactly',
      2: 'just',
      5: 'a measly',
      8: 'a fair',
      13: 'a reported',
      18: 'a playful',
      24: 'a generous',
      45: 'close to',
      61: 'an insane',
      73: 'an thrilling',
      90: 'a dramatic',
      112: $.format('over a hundred%s! Exactly', thing ? ' ' + thing : ''),
      131: 'a tremendous',
      144: 'a flabbergasting',
      150: 'an insane',
      180: 'an impressive',
      191: 'a monumental',
      200: 'an splendid',
      500: 'an incredible',
      800: 'an unreasonable',
      1000: 'a delirious',
      2000: 'a fantastic',
      4000: 'a dogetastic',
      6000: 'a boat filled with',
      8000: 'a hilarious'
    };
    var defaultPhrase = $.format('many, many %s: ', thing ? thing : 'of them');
    return getPhrase(factor, prefixes, defaultPhrase);
  }

  function getReposByLanguages (data) {
    var repos = {};
    data.repos.forEach(function (repo) {
      if (!repo.language) {
        repo.language = 'mystery';
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
    console.info('You can play with your data now, it\'s accessible in window.data');
    console.info(data);
    console.table(data.most.starred, 'name homepage stargazers_count forks_count open_issues'.split(' '));
    root.data = data;
    $('.oh-header').html(tmpl('oh_header', data));
    $('.ot-sidebar').html(tmpl('ot_sidebar', data));
    $('.ot-description').html(tmpl('ot_description', data));
    $('.ot-repos').html(tmpl('ot_repos', data));
    document.body.classList.add('hy-reveal');
  }

  function again (e, state) {
    document.body.classList.remove('hy-reveal');
    rm('last.username');
    username.val(state ? state.username : '');
    username.focus();

    if (!state && history && history.pushState) {
      history.pushState({ username: '' }, 'Hubalyzer draws pretty things based on public GitHub profiles', 'hubalyzer.html');
    }
  }

  function search () {
    var s = location.search, r;
    if (s[0] === '?') {
      s = s.split('').splice(1).join('').split('&');
      s.forEach(function (kv) {
        var kvp = kv.split('=');
        if (kvp.length === 1) {
          r = kvp[0];
        } else if (kvp[0] === 'username') {
          r = kvp[1];
        }
      });
    }
    return r;
  }

  function preload () {
    var initial = search() || get('last.username');
    if (initial) {
      username.val(initial);
      validate();
    } else {
      username.val('');
      username.focus();
    }
  }

  function begin () {

    // $.get('https://api.github.com/zen', { responseType: 'text', headers: { Accept: 'application/vnd.github.v3+json' } }, wrap(function (res) {
    //   $('.gh-quote').txt(res);
    // }));
    $('.gh-quote').txt('Keep it logically awesome.');
    $('.hy-hubalyze').on('click', validate);
    $('.hy-again').on('click', again);

    root.api = {
      getPrefix: getPrefix,
      ks: ks
    };

    console.info('We got a hacker over here!');
    console.info('Well, hello! Have you visited http://blog.ponyfoo.com yet?');

    root.onpopstate = function (e) {
      if (e && e.state) {
        again(null, e.state);
        validate(null, e.state);
      }
    };
    preload();
  }

  begin();
}(suchjs, this);

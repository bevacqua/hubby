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

    function getRepos (done) {
      var repos = [];

      moreRepos();

      function moreRepos (url) {
        var endpoint = url || $.format('/users/%s/repos', username);

        query(endpoint, function (res, status, xhr) {
          repos.push.apply(repos, res);

          if (xhr.headers.Link && xhr.headers.Link.next) {
            moreRepos(xhr.headers.Link.next);
          } else {
            done(null, repos);
          }
        });
      }
    }

    function getEvents (done) {
      query($.format('/users/%s/events', username), function (res) {
        done(null, res);
      });
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
    data.kstars = ks(data.stars);
    data.kforks = ks(data.forks);
    data.kfollowers = ks(data.user.followers);
    data.tcreated = data.created.length;
    data.kcreated = ks(data.tcreated);
    data.kgists = ks(data.user.public_gists);
    data.kforked = ks(data.forked.length);
    data.kfollowing = ks(data.user.following);

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
      var lang = repo.language || 'Other';
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
      return { language: k, ratio: r, count: c, rank: getRank(c, s), title: getTitle(r), prefix: getPrefix(c, s), stars: s };
    });
  }

  function getTitle (ratio) {
    if (ratio < 2) { return 'a'; }
    if (ratio < 3) { return 'alive. He writes anecdotal'; }
    if (ratio < 4) { return 'a quiet'; }
    if (ratio < 5) { return 'a learning'; }
    if (ratio < 6) { return 'a reasonable'; }
    if (ratio < 8) { return 'a self-starting'; }
    if (ratio < 12) { return 'superman. He\'s a happy'; }
    if (ratio < 15) { return 'wonderwoman. She\'s a quality'; }
    if (ratio < 18) { return 'an amazing'; }
    if (ratio < 21) { return 'such a doge. He\'s a successful'; }
    if (ratio < 26) { return 'a prolific'; }
    if (ratio < 46) { return 'a generous'; }
    if (ratio < 72) { return 'a passionate'; }
    if (ratio < 85) { return 'a loving'; }
    if (ratio < 99) { return 'a charitable'; }
    if (ratio < 140) { return 'a veritable'; }
    if (ratio < 184) { return 'a unselfish'; }
    if (ratio < 238) { return 'a magnanimous'; }
    if (ratio < 287) { return 'a kindhearted'; }
    if (ratio < 325) { return 'a thoughtful'; }
    if (ratio < 419) { return 'a altruistic'; }
    if (ratio < 465) { return 'a hospitable'; }
    if (ratio < 490) { return 'a more than generous'; }
    return 'out of this world. He\'s a terrific';
  }

  function getRank (count, stars) {
    if (count < 2) { return 'neophyte'; }
    if (count < 3) { return 'explorer'; }
    if (count < 5) { return 'developer'; }
    if (count < 8) { return 'practitioner'; }
    if (count < 11) { return 'sailor'; }
    if (count < 14) { return 'adept'; }
    if (count < 17) { return 'adventurer'; }
    if (count < 24) { return 'aficionado'; }
    if (count < 28) { return 'warrior'; }
    if (count < 31) { return 'expert'; }
    if (count < 34) { return 'legend'; }
    if (count < 37) { return 'doge'; }
    if (count < 40) { return 'master'; }
    if (count < 43) { return 'elder'; }
    if (count < 47) { return 'ninja'; }
    if (count < 53) { return 'soldier'; }
    if (count < 60) { return 'samurai'; }
    if (count < 65) { return 'extraordinaire'; }
    if (count < 71) { return 'flipboarder'; }
    if (count < 76) { return 'extremist'; }
    if (count < 82) { return 'heavyweight'; }
    if (count < 88) { return 'champion'; }
    if (count < 95) { return 'globetrotter'; }
    if (count < 102) { return 'grandmaster'; }
    if (count < 110) { return 'machine'; }
    if (count < 119) { return 'legend'; }
    if (count < 131) { return 'supercomputer'; }
    if (count < 147) { return 'martian'; }
    if (count < 162) { return 'hotshot'; }
    if (count < 175) { return 'blackbelt'; }
    if (count < 187) { return 'octocat'; }
    if (count < 200) { return 'superstar'; }
    return 'god';
  }

  function getPrefix (count, stars) {
    if (count < 2) { return 'just'; }
    if (count < 5) { return 'a measly'; }
    if (count < 8) { return 'a fair'; }
    if (count < 13) { return 'a reported'; }
    if (count < 18) { return 'a playful'; }
    if (count < 24) { return 'a generous'; }
    if (count < 45) { return 'close to'; }
    if (count < 61) { return 'an insane'; }
    if (count < 73) { return 'an thrilling'; }
    if (count < 90) { return 'a dramatic'; }
    if (count < 112) { return 'over a hundred repos! Exactly'; }
    if (count < 131) { return 'a tremendous'; }
    if (count < 144) { return 'a flabbergasting'; }
    if (count < 150) { return 'an insane'; }
    if (count < 180) { return 'an impressive'; }
    if (count < 191) { return 'a monumental'; }
    if (count < 200) { return 'an splendid'; }
    return 'many, many repositories. To be exact, he has';
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
    username.value = '';
    username.focus();
  }

  // $.get('https://api.github.com/zen', { responseType: 'text', headers: { Accept: 'application/vnd.github.v3+json' } }, wrap(function (res) {
  //   $('.gh-quote').txt(res);
  // }));
}(suchjs);

/* jshint -W106 */

var npmName = require('npm-name'),
  mkdirpSync = require('mkdirp').sync,
  github = require('github'),
  yosay = require('yosay'),
  chalk = require('chalk'),
  _ = require('lodash'),

  fs = require('fs'),
  url = require('url'),
  path = require('path');



var proxy = (function() {
  var cfg = process.env.http_proxy || process.env.HTTP_PROXY ||
    process.env.https_proxy || process.env.HTTPS_PROXY|| null;
  return cfg ? url.parse(cfg) : null;
})();


var generatorName = process.argv[2];





function getGithubUser (username, cb) {
  var githubOpts = { version: '3.0.0' };
  if (proxy) {
    githubOpts.proxy = { host: proxy.hostname, port: proxy.port };
  }
  var api = new github(githubOpts);
  if (process.env.GITHUB_TOKEN) {
    api.authenticate({ type: 'oauth', token: process.env.GITHUB_TOKEN });
  }
  api.user.getFrom({user: username}, function(err, res) {
    if (err) {
      cb(err, res);
    } else {
      cb(err, JSON.parse(JSON.stringify(res)));
    }
  });
}

function slug (str) {
  return str.replace(/[^\w]+(\w)?/g, function(m) {
    return m[1] ? m[1].toUpperCase() : '';
  })
}

function walk (dir) {
  var ret = [];

  fs.readdirSync(dir).forEach(function(file) {
    file = dir + path.sep + file;
    var stat = fs.statSync(file);
    if (stat.isFile()) {
      ret.push(file);
    } else if (stat.isDirectory()) {
      ret = ret.concat(walk(file));
    }
  });
  return ret;
}


module.exports = {


  welcome: function(name) {
    return function() {
      this.log(yosay('Welcome to the lovely ' + chalk.red(name || generatorName) + ' generator!'));
    };
  },

  askForModuleName: function(cb) {
    return function() {
      var done = this.async();
      this.prompt([{
        name: 'moduleName',
        message: 'Module Name:',
        default: path.basename(process.cwd())
      }, {
        type: 'confirm',
        name: 'moduleNameConfirm',
        message: 'The module name above already exists on npm, choose another?',
        default: true,
        when: function(answers) {
          var done = this.async();
          npmName(slug(answers.moduleName), function (err, available) {
            if (available || err) {
              done(false);
              return ;
            }
            done(true);
          }.bind(this));
        }
      }], function(anwsers) {
        if (anwsers.moduleNameConfirm) {
          return this.prompting.askForModuleName.call(this);
        }
        cb.call(this, {moduleName: slug(anwsers.moduleName)});
        done();
      }.bind(this));
    };
  },

  askForGithubUser: function(cb, opts) {

    opts = _.assign({exitOnEmptyUser: true}, opts);

    return function() {
      var done = this.async();
      var githubUser = null;

      this.prompt([{
        name: 'username',
        message: 'Your username on GitHub:',
        default: 'someone'
      }, {
        type: 'confirm',
        name: 'usernameConfirm',
        message: 'The name above not exists on github, choose another?',
        default: true,
        when: function(answers) {
          var done = this.async();
          getGithubUser(answers.username, function(err, data) {
            if (err) {
              done(true);
            } else {
              githubUser = data;
              done(false);
            }
          }.bind(this));
        }
      }], function(anwsers) {
        if (anwsers.usernameConfirm) {
          return this.prompting.askForGithubUser.call(this);
        }

        if (!githubUser && opts.exitOnEmptyUser) {
          console.log(chalk.red('Your github user is empty, set `exitOnEmptyUser` to `false` to ignore this'));
          process.exit();
        }

        cb.call(this, githubUser);
        done();
      }.bind(this));
    };
  },

  writing: function(process) {
    return function() {
      var tplDir = this.sourceRoot(),
        distDir = this.destinationRoot();

      var dirCreateMap = {};
      walk(tplDir).forEach(function(file) {

        file = file.replace(tplDir + path.sep, '');

        var dir = path.dirname(file);
        var base = path.basename(file);

        if (dir !== '.' && !dirCreateMap[dir]) {
          dirCreateMap[dir] = true;
          mkdirpSync(path.join(distDir, dir));
        }

        var target = file.replace(/\._tpl$/, '');  // 去掉 ._tpl 的后缀

        if (process && false === process.call(this, file, target)) {
          return false;
        }

        if (target !== file) {
          this.template(file, target);
        } else {
          this.copy(file, file);
        }

      }.bind(this));
    };
  }

};
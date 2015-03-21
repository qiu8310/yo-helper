/* jshint -W106 */

var npmName = require('npm-name'),
  npmLatest = require('npm-latest'),
  mkdirpSync = require('mkdirp').sync,
  github = require('github'),
  yosay = require('yosay'),
  chalk = require('chalk'),
  _ = require('lodash'),

  util = require('util'),
  fs = require('fs'),
  url = require('url'),
  path = require('path');



var proxy = (function() {
  var cfg = process.env.http_proxy || process.env.HTTP_PROXY ||
    process.env.https_proxy || process.env.HTTPS_PROXY|| null;
  return cfg ? url.parse(cfg) : null;
})();


var generatorName = process.argv[2],
  nameCase = 'kebab';

function getRealNameCase(temp) {
  return temp && ['camel', 'kebab', 'snake'].indexOf(temp) >= 0 ? temp : nameCase;
}



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

// nameStyle: camel, kebab, snake
function slug (str, nameCase) {
  nameCase = getRealNameCase(nameCase);
  return _[nameCase + 'Case'](str);
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

  normalize: slug,


  welcome: function(name) {
    return function() {
      this.log(yosay('Welcome to the lovely ' + chalk.red(name || generatorName) + ' generator!'));
    };
  },

  askForModuleName: function(cb) {
    return function() {
      var done = this.async();
      nameCase = getRealNameCase(this.nameCase || this.options['name-case']);
      var moduleName;

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
          moduleName = answers.moduleName.indexOf('.') > 0 ? answers.moduleName : slug(answers.moduleName);
          npmName(moduleName, function (err, available) {
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
        cb.call(this, {moduleName: moduleName});
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

  askForDependencies: function(dependencies, cb) {

    dependencies = dependencies || [];

    return function() {
      var done = this.async(),
        result = {},
        end = function() {
          var str = [];
          _.each(result, function(version, name) {
            str.push(util.format('\n    "%s": "%s"', name, version));
          });
          cb.call(this, result, str.join(',').replace('\n', ''));
          done();
        }.bind(this);

      var prompts = [{
        type: 'checkbox',
        name: 'dependencies',
        message: 'Which dependencies would you like to include?',
        choices: []
      }];

      if (dependencies.length === 0) { end(); }

      dependencies.forEach(function (pkg) {
        prompts[0].choices.push({
          value: pkg.name,
          name: util.format('%s (%s)', pkg.name, pkg.description || 'No description'),
          checked: ('checked' in pkg) ? pkg.checked : true
        });
      });

      this.prompt(prompts, function(props) {
        dependencies.forEach(function (dep) {
          if (props.dependencies.indexOf(dep.name) !== -1) {
            result[dep.name] = 'latest';
          }
        }.bind(this));


        // get latest version of dependencies
        var count = Object.keys(result).length;
        if (count === 0) { end(); }
        for (var packageName in result) {
          npmLatest(packageName, {timeout: 3000}, function (err, res) {
            if (!err && res.name && res.version) {
              result[res.name] = res.version;
            }
            if (!--count) { end(); }
          }.bind(this));
        }
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
        var base = path.basename(file).replace(/^_/, '');

        if (dir === '_ignore') { return false; }

        if (dir !== '.' && !dirCreateMap[dir]) {
          dirCreateMap[dir] = true;
          mkdirpSync(path.join(distDir, dir));
        }

        // 修改文件命名风格
        if (_.contains(['test', 'src', 'example'], dir)) {
          base = base.split('.');
          if (this.slugfile) {
            base[0] = base[0].replace(/slugname|slugfile/, this.slugfile);
          }
          base[0] = slug(base[0]);

          base = base.join('.');
        }

        var normalFile = path.join(dir, base);
        var target = normalFile.replace(/\._tpl$/, '');  // 去掉 ._tpl 的后缀

        if (process && false === process.call(this, file, target)) {
          return false;
        }

        if (target !== normalFile) {
          this.template(file, target);
        } else {
          this.copy(file, target);
        }

      }.bind(this));
    };
  }

};

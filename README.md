# yo-helper

> Yeoman generator helper

## Install

`npm install --save yo-helper`


## Simplest use

```
var yeoman = require('yeoman-generator');
var yoHelper = require('yo-helper');

module.exports = yeoman.generators.Base.extend({
  prompting: {
    welcome: yoHelper.welcome(),

    askForModuleName: yoHelper.askForModuleName(function(data) {
      this.moduleName = data.moduleName;
    }),

    askForGithubUser: yoHelper.askForGithubUser(function(data) {
      this.githubUser = data;
    }),

    askForModuleInfo: function() {
      var done = this.async();

      var prompts = [{
        name: 'description',
        message: 'Description',
        default: 'The best module ever.'
      },{
        name: 'version',
        message: 'Version',
        default: '0.0.0'
      }, {
        name: 'license',
        message: 'License',
        default: 'MIT'
      }, {
        type: 'confirm',
        name: 'skipInstall',
        message: 'Do you need skip npm install?',
        default: false
      }];

      this.prompt(prompts, function(answers) {
        this.answers = answers;
        done();
      }.bind(this));
    }
  },

  writing: yoHelper.writing(),

  install: function () {
    var skip = this.answers['skipInstall'] || this.options['skip-install'];

    this.installDependencies({
      skipInstall: skip
    });
  }
});


```

### yoHelper.welcome(generatorName)

@params generatorName `string` optional

@return `function`

输出 yeoman 的人形图片及文案，xxx 名字会自动根据你的参数（如 yo xxx）得到，不过你也可以在函数参数中指定其名称

```
     _-----_
    |       |    .--------------------------.
    |--(o)--|    |   Welcome to the lovely  |
   `---------´   |   xxx generator!   |
    ( _´U`_ )    '--------------------------'
    /___A___\    
     |  ~  |     
   __'.___.'__   
 ´   `  |° ´ Y ` 
```

### yoHelper.writing(process)

@params process `function` optional 处理程序

此函数会自动把 template 目录下的所有文件移动到用户当前目录下：

* 如果文件的后缀名是 `._tpl` 的话，则会用 yo 的 `template` 方法，替换文件中的变量，并在生成新文件的时候去掉 `._tpl` 的后缀；
* 如果文件的后缀名不是 `._tpl` 的话，则直接用 yo 的 `copy` 方法，把文件移动到目标文件夹，不做其它任何处理；
* 如果参数 `process` 存在，并且其结果返回 `false` 的话，则不会进行上面两步的处理，直接退出



### yoHelper.askForModuleName(callback)

@params callback `function` 回调函数，其参数是 `{ moduleName: [user input] }`

@return `function`

提示用户输入项目名称，如果名称已经存在，会提醒用户是否重新输入

### yoHelper.askForGithubUser(callback, opts)

@params callback `function` 回调函数，其参数是 github api 返回

@params opts `object` optional 参数，目前只支持设置 `exitOnEmptyUser`，默认为 `true`，即如果没有找到对应的 github 用户就直接退出

@return `function`

#### Github user example

```js
{
    login: 'qiu8310',
    id: 1094697,
    avatar_url: 'https://avatars.githubusercontent.com/u/1094697?v=3',
    gravatar_id: '',
    url: 'https://api.github.com/users/qiu8310',
    html_url: 'https://github.com/qiu8310',
    followers_url: 'https://api.github.com/users/qiu8310/followers',
    following_url: 'https://api.github.com/users/qiu8310/following{/other_user}',
    gists_url: 'https://api.github.com/users/qiu8310/gists{/gist_id}',
    starred_url: 'https://api.github.com/users/qiu8310/starred{/owner}{/repo}',
    subscriptions_url: 'https://api.github.com/users/qiu8310/subscriptions',
    organizations_url: 'https://api.github.com/users/qiu8310/orgs',
    repos_url: 'https://api.github.com/users/qiu8310/repos',
    events_url: 'https://api.github.com/users/qiu8310/events{/privacy}',
    received_events_url: 'https://api.github.com/users/qiu8310/received_events',
    type: 'User',
    site_admin: false,
    name: 'Zhonglei Qiu',
    company: null,
    blog: null,
    location: null,
    email: 'zhongleiqiu@gmail.com',
    hireable: false,
    bio: null,
    public_repos: 33,
    public_gists: 11,
    followers: 2,
    following: 18,
    created_at: '2011-10-01T11:20:19Z',
    updated_at: '2015-02-15T02:56:27Z',
}
```
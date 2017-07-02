var storeroom = require("storeroom"),
    Promise   = storeroom.Promise,
    Module    = require("jstest").Module,
    CLI       = require("../../lib/cli")

module.exports = new Module({
  extend: {
    included: function(suite) {
      suite.before(function() { with(this) {
        this.settings = {}

        var fileAdapter = {}
        stub(storeroom, "createFileAdapter").given("storeroom path").returns(fileAdapter)

        this.fileStore = {}
        stub(storeroom, "createStore")
          .given({adapter: fileAdapter, password: "storeroom key"})
          .returns(fileStore)

        this.stdout = {}
        this.stderr = {}

        this.cli = new CLI({
          config: {path: "storeroom path", key: "storeroom key"},

          stdout: stdout,
          stderr: stderr,
          tty:    false,

          confirm:   function() { return Promise[settings.confirm ? 'resolve' : 'reject']() },
          password:  function() { return Promise.resolve(settings.password) },
          selectKey: function() { return Promise.resolve(settings.selectKey) },
          sign:      function() { return Promise.resolve(settings.signature) }
        })
      }})
    }
  },

  call: function(args) {
    return this.cli.run(["", ""].concat(args))
  }
})

var escodb = require("../../lib/escodb"),
    Module = require("jstest").Module,
    CLI    = require("../../lib/cli")

var MemoryAdapter = require("@escodb/core").MemoryAdapter

module.exports = new Module({
  extend: {
    included: function(suite) {
      suite.before(function(resume) { with(this) {
        this.settings = {}

        this.memoryAdapter = new MemoryAdapter()
        stub(escodb, "createFileAdapter").given("escodb path").returns(memoryAdapter)

        this.stdout = {}
        this.stderr = {}

        this.cli = new CLI({
          config: {path: "escodb path", key: "escodb key"},

          stdout: stdout,
          stderr: stderr,
          tty:    false,

          confirm:   function() { return Promise[settings.confirm ? 'resolve' : 'reject']() },
          password:  function() { return Promise.resolve(settings.password) },
          selectKey: function() { return Promise.resolve(settings.selectKey) },
          sign:      function() { return Promise.resolve(settings.signature) }
        })

        escodb.createStore({adapter: memoryAdapter, password: "escodb key"}).then(function(store) {
          this.escoStore = store
          resume()
        })
      }})
    }
  },

  call: function(args) {
    return this.cli.run(["", ""].concat(args))
  }
})

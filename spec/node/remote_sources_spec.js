var fs            = require("fs"),
    async         = require("async"),
    helper        = require("./cli_helper"),
    RemoteStorage = require("../../lib/remotestorage")

JS.Test.describe("Remote sources", function() { with(this) {
  include(helper)

  before(function(resume) { with(this) {
    storage.saveGlobals({lower: 0, phrase: "saved passphrase"}, function() {
      async.forEach([
        ["twitter",   {lower: 1, symbol: 0}],
        ["nothing",   {}],
        ["facebook",  {key: "AAAAPUBLICKEY"}]
      ], function(service, done) {
        storage.saveService(service[0], service[1], true, done)
      }, resume)
    })
  }})

  before(function(resume) { with(this) {
    this._5apps   = {}
    this._local   = {}
    this._example = {}

    stub(RemoteStorage.prototype, "connect").given("jcoglan@5apps.com", {}).returns(_5apps)
    stub(RemoteStorage.prototype, "connect").given("me@local.dev", {}).returns(_local)

    storage._loader.load("sources", function(error, config) {
      config["me@local.dev"] = {}
      config["jcoglan@5apps.com"] = {}
      storage._loader.dump("sources", config, resume)
    })
  }})

  describe("adding a valid source", function() { with(this) {
    return // TODO fix these

    before(function() { with(this) {
      stub(RemoteStorage.prototype, "connect").given("person@example.com", {browser: null, inline: false, ca: undefined}).returns(_example)

      stub(_example, "authorize").yielding([null, {
        oauth:   "https://example.com/auth/person",
        storage: "https://example.com/store/person",
        version: "draft.00",
        token:   "HsLEuMkjrkDBluj5jSy0doPx/b8="
      }])
    }})

    it("adds the source to the local store", function(resume) { with(this) {
      expect(stdout, "write").given('Source "person@example.com" was successfully added.\n')
      cli.run(["node", "bin/vault", "--add-source", "person@example.com"], function() {
        storage._loader.load("sources", function(error, config) {
          resume(function() {
            assertEqual({
              browser: null,
              inline:  false,
              oauth:   "https://example.com/auth/person",
              storage: "https://example.com/store/person",
              token:   "HsLEuMkjrkDBluj5jSy0doPx/b8=",
              type:    "remotestorage",
              version: "draft.00"
            }, config["person@example.com"])
      })})})
    }})

    it("makes the new source the default", function(resume) { with(this) {
      expect(stdout, "write").given('Source "person@example.com" was successfully added.\n')
      expect(stdout, "write").given( ["  jcoglan@5apps.com", "  local", "  me@local.dev", "* person@example.com", ""].join("\n") )
      cli.run(["node", "bin/vault", "--add-source", "person@example.com"], function() {
        cli.run(["node", "bin/vault", "--list-sources"], resume)
      })
    }})

    describe("when the user chooses not to make the source the default", function() { with(this) {
      before(function() { this.confirm = false })

      it("makes the new source the default", function(resume) { with(this) {
        expect(stdout, "write").given('Source "person@example.com" was successfully added.\n')
        expect(stdout, "write").given( ["  jcoglan@5apps.com", "* local", "  me@local.dev", "  person@example.com", ""].join("\n") )
        cli.run(["node", "bin/vault", "--add-source", "person@example.com"], function() {
          cli.run(["node", "bin/vault", "--list-sources"], resume)
        })
      }})
    }})
  }})

  describe("adding a valid source with an inline browser", function() { with(this) {
    return // TODO fix these

    before(function() { with(this) {
      stub(RemoteStorage.prototype, "connect").given("person@example.com", {browser: "elinks", inline: true, ca: undefined}).returns(_example)

      stub(_example, "authorize").yielding([null, {
        oauth:   "https://example.com/auth/person",
        storage: "https://example.com/store/person",
        version: "draft.00",
        token:   "HsLEuMkjrkDBluj5jSy0doPx/b8="
      }])
    }})

    it("adds the source to the local store", function(resume) { with(this) {
      expect(stdout, "write").given('Source "person@example.com" was successfully added.\n')
      cli.run(["node", "bin/vault", "--text-browser", "elinks", "--add-source", "person@example.com"], function() {
        storage._loader.load("sources", function(error, config) {
          resume(function() {
            assertEqual({
              browser: "elinks",
              inline:  true,
              oauth:   "https://example.com/auth/person",
              storage: "https://example.com/store/person",
              token:   "HsLEuMkjrkDBluj5jSy0doPx/b8=",
              type:    "remotestorage",
              version: "draft.00"
            }, config["person@example.com"])
      })})})
    }})
  }})

  describe("adding an invalid source", function() { with(this) {
    return // TODO fix these

    before(function() { with(this) {
      stub(RemoteStorage.prototype, "connect").given("person@example.com", {browser: null, inline: false, ca: undefined}).returns(_example)

      stub(_example, "authorize").yielding([
        {message: "Could not find remoteStorage endpoints for person@example.com"}
      ])
    }})

    it("does not add the source to the local store", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "--add-source", "person@example.com"], function(error) {
        storage._loader.load("sources", function(err, config) {
          resume(function() {
            assertEqual( "Could not find remoteStorage endpoints for person@example.com", error.message )
            assertEqual( undefined, config["person@example.com"] )
      })})})
    }})
  }})

  describe("clearing the settings", function() { with(this) {
    before(function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-X"], resume)
    }})

    it("does not delete the saved sources", function(resume) { with(this) {
      expect(stdout, "write").given( ["  jcoglan@5apps.com", "* local", "  me@local.dev", ""].join("\n") )
      cli.run(["node", "bin/vault", "--list-sources"], resume)
    }})
  }})

  describe("importing a settings file", function() { with(this) {
    before(function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-e", exportPath], function() {
        cli.run(["node", "bin/vault", "-i", exportPath], resume)
      })
    }})

    it("does not delete the saved sources", function(resume) { with(this) {
      expect(stdout, "write").given( ["  jcoglan@5apps.com", "* local", "  me@local.dev", ""].join("\n") )
      cli.run(["node", "bin/vault", "--list-sources"], resume)
    }})
  }})

  describe("exporting", function() { with(this) {
    describe("with the local source", function() { with(this) {
      before(function(resume) { with(this) {
        cli.run(["node", "bin/vault", "-e", exportPath], resume)
      }})

      it("exports the saved settings in plaintext", function() { with(this) {
        var json = JSON.parse(fs.readFileSync(exportPath))
        assertEqual( {
          global: {lower: 0, phrase: "saved passphrase" },
          services: {
            facebook: {key: "AAAAPUBLICKEY"},
            nothing:  {},
            twitter:  {lower: 1, symbol: 0}
          }
        }, json)
      }})
    }})

    describe("with a remote source", function() { with(this) {
      return // TODO fix these

      before(function(resume) { with(this) {
        expect(_5apps, "get").given("/vault/global").yielding([null, {
          data: '{"phrase": "magic beans", "length": 30}'
        }])
        expect(_5apps, "get").given("/vault/services/").yielding([null, {
          data: '{"songkick": "", "foo%2Fbar": ""}'
        }])
        expect(_5apps, "get").given("/vault/services/songkick").yielding([null, {
          data: '{"space": 12}'
        }])
        expect(_5apps, "get").given("/vault/services/foo%2Fbar").yielding([null, {
          data: '{"symbol": 0}'
        }])

        expect(_local, "get").exactly(0)

        cli.run(["node", "bin/vault", "--set-source", "jcoglan@5apps.com"], function() {
          cli.run(["node", "bin/vault", "-e", exportPath], resume)
        })
      }})

      it("exports the remote source's settings", function() { with(this) {
        var json = JSON.parse(fs.readFileSync(exportPath))
        assertEqual( {
          global: {length: 30, phrase: "magic beans"},
          services: {
            "foo/bar":  {symbol: 0},
            "songkick": {space: 12}
          }
        }, json)
      }})
    }})

    describe("with an explicitly specified source", function() { with(this) {
      return // TODO fix these

      before(function(resume) { with(this) {
        expect(_local, "get").given("/vault/global").yielding([null, {
          data: '{"phrase": "iron and wine", "length": 15}'
        }])
        expect(_local, "get").given("/vault/services/").yielding([null, {
          data: '{"twitter": ""}'
        }])
        expect(_local, "get").given("/vault/services/twitter").yielding([null, {
          data: '{"dash": 0}'
        }])

        expect(_5apps, "get").exactly(0)

        cli.run(["node", "bin/vault", "-s", "me@local.dev", "-e", exportPath], resume)
      }})

      it("exports the specified source's settings", function() { with(this) {
        var json = JSON.parse(fs.readFileSync(exportPath))
        assertEqual( {
          global: {length: 15, phrase: "iron and wine"},
          services: {
            "twitter": {dash: 0}
          }
        }, json)
      }})
    }})
  }})

  it("completes source addresses", function(resume) { with(this) {
    return resume() // TODO fix these

    stub(_5apps, "get").given("/vault/services/").yields([null, {data: "{}"}])
    stub(_local, "get").given("/vault/services/").yields([null, {data: "{}"}])
    expect(stdout, "write").given("me@local.dev")
    cli.run(["node", "bin/vault", "--cmplt", "me"], resume)
  }})

  it("lists the available sources", function(resume) { with(this) {
    expect(stdout, "write").given( ["  jcoglan@5apps.com", "* local", "  me@local.dev", ""].join("\n") )
    cli.run(["node", "bin/vault", "--list-sources"], resume)
  }})

  it("lets you change the default source", function(resume) { with(this) {
    expect(stdout, "write").given( ["  jcoglan@5apps.com", "  local", "* me@local.dev", ""].join("\n") )
    cli.run(["node", "bin/vault", "--set-source", "me@local.dev"], function() {
      cli.run(["node", "bin/vault", "--list-sources"], resume)
    })
  }})

  it("shows local as the current source if the current remote is deleted", function(resume) { with(this) {
    expect(stdout, "write").given( ["  jcoglan@5apps.com", "* local", ""].join("\n") )
    cli.run(["node", "bin/vault", "--delete-source", "me@local.dev"], function() {
      cli.run(["node", "bin/vault", "--list-sources"], resume)
    })
  }})
}})


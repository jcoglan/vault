var fs            = require('fs'),
    path          = require('path'),
    async         = require('async'),
    rmrf          = require('rimraf'),
    Store         = require('../../lib/store'),
    RemoteStorage = require('../../lib/remotestorage'),
    editor        = require('../../node/editor'),
    FileAdapter   = require('../../node/file_adapter'),
    CLI           = require('../../node/cli')

JS.ENV.CliSpec = JS.Test.describe("CLI", function() { with(this) {
  define("createStubs", function() {})

  before(function() { with(this) {
    createStubs()

    this.configPath = path.join(__dirname, ".vault")
    this.exportPath = path.join(__dirname, "export.json")
    this.stdout     = {write: function() {}}
    this.stderr     = {write: function() {}}
    this.passphrase = "something"
    this.confirm    = true

    this.cli = new CLI({
      config: {path: configPath, key: "the key", cache: false},
      stdout: this.stdout,
      stderr: this.stderr,
      tty:    false,

      confirm: function(message, callback) {
        callback(confirm)
      },

      password: function(callback) {
        callback(passphrase)
      },

      selectKey: function(callback) {
        callback(null, "AAAAPUBLICKEY")
      },

      sign: function(key, message, callback) {
        if (key === "AAAAPUBLICKEY")
          callback(null, message);
        else
          callback(new Error("Could not sign the message"))
      }
    })

    this.storage = new Store(new FileAdapter(configPath), "the key", {cache: false})
  }})

  after(function(resume) { with(this) {
    async.forEach([configPath, exportPath], rmrf, resume)
  }})

  describe("with no config file", function() { with(this) {
    it("outputs a generated password", function(resume) { with(this) {
      expect(stdout, "write").given("2hk!W[L,2rWWI=~=l>,E")
      cli.run(["node", "bin/vault", "google", "-p"], resume)
    }})

    it("generates a password using a private key", function(resume) { with(this) {
      expect(stdout, "write").given("c8<BHXZMc*Gxks&%%=F4")
      cli.run(["node", "bin/vault", "google", "-k"], resume)
    }})

    it("outputs a password with no symbols", function(resume) { with(this) {
      expect(stdout, "write").given("Bb4uFmAEUnTPJh23ecdQ")
      cli.run(["node", "bin/vault", "google", "-p", "--symbol", "0"], resume)
    }})

    it("outputs a password with required dashes and uppercase", function(resume) { with(this) {
      expect(stdout, "write").given('2-[w]thuTK8unIUVH"Lp')
      cli.run(["node", "bin/vault", "google", "-p", "--dash", "1", "--upper", "1"], resume)
    }})

    it("outputs a password with all character types", function(resume) { with(this) {
      expect(stdout, "write").given(": : fv_wqt>a-4w1S  R")
      passphrase = "She cells C shells bye the sea shoars"
      cli.run(["node", "bin/vault", "google", "-p", "--dash", "2", "--lower", "2", "--space", "3", "--upper", "2", "--symbol", "1", "--number", "1"], resume)
    }})

    it("outputs a password with a length", function(resume) { with(this) {
      expect(stdout, "write").given("Tc8k~8")
      cli.run(["node", "bin/vault", "google", "-p", "-l", "6"], resume)
    }})

    it("outputs a password with a repetition limit", function(resume) { with(this) {
      passphrase = ""
      expect(stdout, "write").given("IVTDzACftqopUXqDHPkuCIhV")
      cli.run(["node", "bin/vault", "asd", "-p", "--number", "0", "--symbol", "0", "-l", "24", "-r", "1"], resume)
    }})

    it("reports an error if no passphrase given", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "No passphrase given; pass `-p` or run `vault -cp`", e.message )
      })})
    }})

    it("reports an error if no service given", function(resume) { with(this) {
      cli.run(["node", "bin/vault"], function(e) {
        resume(function() {
          assertEqual( "No service name given", e.message )
      })})
    }})

    it("saves a global passphrase", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-cp"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {phrase: "something"}, internet )
              assertEqual( {phrase: "something"}, google )
      })})})})
    }})

    it("saves a service-specific passphrase", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-cp", "google"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {}, internet )
              assertEqual( {phrase: "something"}, google )
      })})})})
    }})

    it("saves a global public key", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-ck"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {key: "AAAAPUBLICKEY"}, internet )
              assertEqual( {key: "AAAAPUBLICKEY"}, google )
      })})})})
    }})

    it("saves a service-specific public key", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-ck", "google"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {}, internet )
              assertEqual( {key: "AAAAPUBLICKEY"}, google )
      })})})})
    }})

    it("saves a global character constraint", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "--length", "6", "--symbol", "0"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {length: 6, symbol: 0}, internet )
              assertEqual( {length: 6, symbol: 0}, google )
      })})})})
    }})

    it("saves a service-specific character constraint", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "google", "--length", "6", "--symbol", "0"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {}, internet )
              assertEqual( {length: 6, symbol: 0}, google )
      })})})})
    }})

    it("saves some notes for a service", function(resume) { with(this) {
      stub(editor, "edit").yields([null, "Saved notes!"])
      cli.run(["node", "bin/vault", "-c", "--notes", "google"], function() {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() {
            assertEqual( {notes: "Saved notes!"}, google )
      })})})
    }})

    it("deletes the notes for a service", function(resume) { with(this) {
      stub(editor, "edit").yields([null, " \n\r\t\t \n\r\n "])
      cli.run(["node", "bin/vault", "-c", "--notes", "google"], function() {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() {
            assertEqual( {}, google )
      })})})
    }})

    it("exports the default settings", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-e", exportPath], function() {
        resume(function() {
          var json = JSON.parse(fs.readFileSync(exportPath))
          assertEqual( {global: {}, services: {}}, json )
      })})
    }})

    it("imports a saved settings file", function(resume) { with(this) {
      fs.writeFileSync(exportPath, '{"services":{"google":{"length":8}}}')
      cli.run(["node", "bin/vault", "-i", exportPath], function() {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() { assertEqual( {length: 8}, google ) })
      })})
    }})
  }})

  describe("with a config file", function() { with(this) {
    before(function(resume) { with(this) {
      storage.saveGlobals({lower: 0, phrase: "saved passphrase"}, function() {
        async.forEach([
          ["twitter",   {lower: 1, symbol: 0}],
          ["nothing",   {notes: "\nSome notes!\n===========\n\n\n\n"}],
          ["facebook",  {key: "AAAAPUBLICKEY"}]
        ], function(service, done) {
          storage.saveService(service[0], service[1], true, done)
        }, resume)
      })
    }})

    it("reports an error if the key is wrong", function(resume) { with(this) {
      cli._store = new Store(new FileAdapter(configPath), "the wrong key", {cache: false})

      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
      })})
    }})

    it("reports an error if the file has been tampered", function(resume) { with(this) {
      var _path = path.join(configPath, "sources")
      fs.writeFileSync(_path, "X")
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
      })})
    }})

    it("reports an error if the file has a zero-length payload", function(resume) { with(this) {
      var _path = path.join(configPath, "sources")
      fs.writeFileSync(_path, "DqOnhLAQ98oZtClj0lYjT2Y4YjU2NzRhZGVmMjRlN2E1ZWViYjJhYzRjODZlZjlkYThjNGRhYTVmOTEyZmIyNjdiNmJhNGExMWRiMTEwNWU=")
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
      })})
    }})

    it("reports an error if the file is too short", function(resume) { with(this) {
      var _path = path.join(configPath, "sources")
      fs.writeFileSync(_path, "42")
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
      })})
    }})

    it("completes option fragments", function(resume) { with(this) {
      expect(stdout, "write").given("--lower")
      cli.run(["node", "bin/vault", "--cmplt", "--lo"], resume)
    }})

    it("completes option fragments with no letters", function(resume) { with(this) {
      expect(stdout, "write").given( ["--add-source", "--browser", "--cert",
        "--clear", "--cmplt", "--config", "--dash", "--delete",
        "--delete-globals", "--delete-source", "--export", "--help",
        "--import", "--initpath", "--key", "--length", "--list-sources",
        "--lower", "--master-key", "--notes", "--number", "--phrase",
        "--repeat", "--set-source", "--show-source", "--source", "--space",
        "--symbol", "--text-browser", "--upper"].join("\n") )

      cli.run(["node", "bin/vault", "--cmplt", "--"], resume)
    }})

    it("completes service names", function(resume) { with(this) {
      expect(stdout, "write").given("twitter")
      cli.run(["node", "bin/vault", "--cmplt", "tw"], resume)
    }})

    it("completes empty service names", function(resume) { with(this) {
      expect(stdout, "write").given(["facebook", "local", "nothing", "twitter"].join("\n"))
      cli.run(["node", "bin/vault", "--cmplt", ""], resume)
    }})

    it("outputs a password using the stored passphrase", function(resume) { with(this) {
      expect(stdout, "write").given("(JA!4O'+&5I'/-V{N100")
      cli.run(["node", "bin/vault", "google"], resume)
    }})

    it("outputs a password using a service-specific passphrase", function(resume) { with(this) {
      expect(stdout, "write").given("199pS3LWcTpgGBMEDkx9")
      cli.run(["node", "bin/vault", "twitter"], resume)
    }})

    it("outputs a password using a service-specific private key", function(resume) { with(this) {
      expect(stdout, "write").given('++IAP:^*$6,"9~R-}%R-')
      cli.run(["node", "bin/vault", "facebook"], resume)
    }})

    it("allows the --phrase flag to override stored keys", function(resume) { with(this) {
      expect(stdout, "write").given("Q}T.}#S+SE#@+'|}5Q\\A")
      cli.run(["node", "bin/vault", "facebook", "-p"], resume)
    }})

    it("outputs a password using service-specific settings with overrides", function(resume) { with(this) {
      expect(stdout, "write").given("^g;Y4[k+Sg!1Z1fxY<mO")
      cli.run(["node", "bin/vault", "twitter", "--symbol", "4"], resume)
    }})

    it("outputs a password on stdout and the notes on stderr", function(resume) { with(this) {
      expect(stdout, "write").given("1$5QC<'<?[FWE~&'P(]U")
      expect(stderr, "write").given("\nSome notes!\n===========\n\n")
      cli.run(["node", "bin/vault", "nothing"], resume)
    }})

    it("reports an error if no service given", function(resume) { with(this) {
      cli.run(["node", "bin/vault"], function(e) {
        resume(function() {
          assertEqual( "No service name given", e.message )
      })})
    }})

    it("removes all saved services", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-X"], function() {
        storage.serviceSettings("twitter", true, function(e, twitter) {
          resume(function() { assertEqual( {}, twitter ) })
      })})
    }})

    it("removes global settings", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "--delete-globals"], function() {
        storage.serviceSettings("twitter", true, function(e, twitter) {
          resume(function() { assertEqual( {lower: 1, symbol: 0}, twitter ) })
      })})
    }})

    it("removes a saved service", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-x", "twitter"], function() {
        storage.serviceSettings("twitter", true, function(e, twitter) {
          resume(function() { assertEqual( {lower: 0, phrase: "saved passphrase"}, twitter ) })
      })})
    }})

    it("changes a saved service setting", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "twitter", "--lower", "8"], function() {
        storage.serviceSettings("twitter", true, function(e, twitter) {
          resume(function() { assertEqual( {lower: 8, symbol: 0, phrase: "saved passphrase"}, twitter ) })
      })})
    }})

    it("changes a saved global setting", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "--lower", "8"], function() {
        storage.serviceSettings("google", true, function(e, google) {
          storage.serviceSettings("twitter", true, function(e, twitter) {
            resume(function() {
              assertEqual( {lower: 8, phrase: "saved passphrase"}, google )
              assertEqual( {lower: 1, symbol: 0, phrase: "saved passphrase"}, twitter )
      })})})})
    }})

    it("exports the saved settings in plaintext", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-e", exportPath], function() {
        resume(function() {
          var json = JSON.parse(fs.readFileSync(exportPath))
          assertEqual( {
            global: {lower: 0, phrase: "saved passphrase" },
            services: {
              facebook: {key: "AAAAPUBLICKEY"},
              nothing: {notes: "\nSome notes!\n===========\n\n\n\n"},
              twitter: {lower: 1, symbol: 0}
            }
          }, json)
        })
      })
    }})

    it("throws an error when importing a missing file", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-i", __dirname + "/nosuch"], function(error) {
        resume(function() { assert(error) })
      })
    }})

    describe("source-managing methods", function() { with(this) {
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
                nothing: {notes: "\nSome notes!\n===========\n\n\n\n"},
                twitter: {lower: 1, symbol: 0}
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
  }})
}})


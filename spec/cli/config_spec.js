var fs        = require("fs"),
    path      = require("path"),
    jstest    = require("jstest").Test,
    CliHelper = require("./helper"),
    editor    = require("../../lib/cli/editor")

jstest.describe("CLI configuration", function() { with(this) {
  include(CliHelper)

  before(function() { with(this) {
    stub(stdout, "write")
  }})

  describe("global settings", function() { with(this) {
    it("stores a global passphrase", function(resume) { with(this) {
      settings.password = "saved phrase"
      call(["--config", "--phrase"]).then(function() {
        return escoStore.get("/global")
      }).then(function(doc) {
        resume(function() { assertEqual({phrase: "saved phrase"}, doc) })
      })
    }})

    it("reports a read error", function(resume) { with(this) {
      return resume() // TODO fix

      settings.password = "saved phrase"
      stub(fileStore, "get").returns(Promise.reject(new Error("failed to read")))

      call(["--config", "--phrase"]).catch(function(error) {
        resume(function() { assertEqual("failed to read", error.message) })
      })
    }})

    it("reports a write error", function(resume) { with(this) {
      return resume() // TODO fix

      settings.password = "saved phrase"
      stub(fileStore, "get").returns(pnull)
      stub(fileStore, "put").returns(Promise.reject(new Error("failed to save")))

      call(["--config", "--phrase"]).catch(function(error) {
        resume(function() { assertEqual("failed to save", error.message) })
      })
    }})

    it("stores a global length", function(resume) { with(this) {
      call(["--config", "--length", "32"]).then(function() {
        return escoStore.get("/global")
      }).then(function(doc) {
        resume(function() { assertEqual({length: 32}, doc) })
      })
    }})

    it("stores a global length using shorthand", function(resume) { with(this) {
      call(["-cl", "32"]).then(function() {
        return escoStore.get("/global")
      }).then(function(doc) {
        resume(function() { assertEqual({length: 32}, doc) })
      })
    }})

    it("extends an existing global setting", function(resume) { with(this) {
      escoStore.update("/global", () => ({phrase: "hello"})).then(function() {
        return call(["--config", "--length", "32"])
      }).then(function() {
        return escoStore.get("/global")
      }).then(function(doc) {
        resume(function() { assertEqual({phrase: "hello", length: 32}, doc) })
      })
    }})

    it("replaces an existing global setting", function(resume) { with(this) {
      escoStore.update("/global", () => ({length: 20})).then(function() {
        return call(["--config", "--length", "32"])
      }).then(function() {
        return escoStore.get("/global")
      }).then(function(doc) {
        resume(function() { assertEqual({length: 32}, doc) })
      })
    }})

    it("deletes the global settings", function(resume) { with(this) {
      settings.confirm = true

      escoStore.update("/global", () => ({phrase: "hello"})).then(function () {
        return call(["--delete-globals"])
      }).then(function() {
        return escoStore.get("/global")
      }).then(function(doc) {
        resume(function () { assertNull(doc) })
      })
    }})

    it("does not delete the global settings without confirmation", function(resume) { with(this) {
      settings.confirm = false

      escoStore.update("/global", () => ({phrase: "hello"})).then(function () {
        return call(["--delete-globals"])
      }).catch(function() {
        return escoStore.get("/global")
      }).then(function(doc) {
        resume(function () { assertEqual({phrase: "hello"}, doc) })
      })
    }})

    it("reports a deletion error", function(resume) { with(this) {
      return resume() // TODO fix

      settings.confirm = true
      stub(fileStore, "remove").returns(Promise.reject(new Error("failed to delete")))

      call(["--delete-globals"]).catch(function(error) {
        resume(function() { assertEqual("failed to delete", error.message) })
      })
    }})
  }})

  describe("service settings", function() { with(this) {
    it("stores config for a service", function(resume) { with(this) {
      call(["--config", "foo", "--symbol", "0"]).then(function() {
        return escoStore.get("/services/foo")
      }).then(function(doc) {
        resume(function() { assertEqual({symbol: 0}, doc) })
      })
    }})

    it("reports a read error", function(resume) { with(this) {
      return resume() // TODO fix

      stub(fileStore, "get").returns(Promise.reject(new Error("failed to read")))

      call(["--config", "foo", "--symbol", "0"]).catch(function(error) {
        resume(function() { assertEqual("failed to read", error.message) })
      })
    }})

    it("reports a write error", function(resume) { with(this) {
      return resume() // TODO fix

      stub(fileStore, "get").returns(pnull)
      stub(fileStore, "put").returns(Promise.reject(new Error("failed to save")))

      call(["--config", "foo", "--symbol", "0"]).catch(function(error) {
        resume(function() { assertEqual("failed to save", error.message) })
      })
    }})

    it("stores config for a service using shorthand", function(resume) { with(this) {
      call(["-cl", "42", "foo"]).then(function() {
        return escoStore.get("/services/foo")
      }).then(function(doc) {
        resume(function() { assertEqual({length: 42}, doc) })
      })
    }})

    it("extends an existing service setting", function(resume) { with(this) {
      escoStore.update("/services/foo", () => ({symbol: 0})).then(function() {
        return call(["--config", "foo", "--number", "4", "--upper", "2"])
      }).then(function() {
        return escoStore.get("/services/foo")
      }).then(function(doc) {
        resume(function() { assertEqual({symbol: 0, upper: 2, number: 4}, doc) })
      })
    }})

    it("replaces an existing service setting", function(resume) { with(this) {
      escoStore.update("/services/foo", () => ({symbol: 0})).then(function() {
        return call(["--config", "foo", "--symbol", "3"])
      }).then(function() {
        return escoStore.get("/services/foo")
      }).then(function(doc) {
        resume(function() { assertEqual({symbol: 3}, doc) })
      })
    }})

    it("stores notes for a new service", function(resume) { with(this) {
      expect(editor, "editTempfile").given(instanceOf("string")).returning(Promise.resolve("the notes"))

      call(["--config", "foo", "--notes"]).then(function() {
        return escoStore.get("/services/foo")
      }).then(function(doc) {
        resume(function() { assertEqual({notes: "the notes"}, doc) })
      })
    }})

    it("stores new notes for an existing service", function(resume) { with(this) {
      expect(editor, "editTempfile").given(instanceOf("string")).returning(Promise.resolve("the notes"))

      escoStore.update("/services/foo", () => ({length: 9})).then(function() {
        return call(["--config", "foo", "--notes"])
      }).then(function() {
        return escoStore.get("/services/foo")
      }).then(function(doc) {
        resume(function() { assertEqual({length: 9, notes: "the notes"}, doc) })
      })
    }})

    it("replaces existing notes for an existing service", function(resume) { with(this) {
      expect(editor, "editTempfile").given(instanceOf("string")).returning(Promise.resolve("new notes"))

      escoStore.update("/services/foo", () => ({notes: "old notes"})).then(function() {
        return call(["--config", "foo", "--notes"])
      }).then(function() {
        return escoStore.get("/services/foo")
      }).then(function(doc) {
        resume(function() { assertEqual({notes: "new notes"}, doc) })
      })
    }})

    it("deletes existing notes for an existing service", function(resume) { with(this) {
      expect(editor, "editTempfile").given(instanceOf("string")).returning(Promise.resolve(""))

      escoStore.update("/services/foo", () => ({notes: "old notes"})).then(function() {
        return call(["--config", "foo", "--notes"])
      }).then(function() {
        return escoStore.get("/services/foo")
      }).then(function(doc) {
        resume(function() { assertEqual({}, doc) })
      })
    }})

    it("deletes a service's settings", function(resume) { with(this) {
      settings.confirm = true

      escoStore.update("/services/foo", () => ({phrase: "hello"})).then(function() {
        return call(["--delete", "foo"])
      }).then(function() {
        return escoStore.get("/services/foo")
      }).then(function(doc) {
        resume(function() { assertNull(doc) })
      })
    }})

    it("does not delete a service's settings without confirmation", function(resume) { with(this) {
      settings.confirm = false

      escoStore.update("/services/foo", () => ({phrase: "hello"})).then(function() {
        return call(["--delete", "foo"])
      }).catch(function() {
        return escoStore.get("/services/foo")
      }).then(function(doc) {
        resume(function() { assertEqual({phrase: "hello"}, doc) })
      })
    }})

    it("does not delete a non-existent service's settings", function(resume) { with(this) {
      return resume() // TODO fix

      settings.confirm = true
      stub(fileStore, "get").given("/services/foo").returns(pnull)

      expect(fileStore, "remove").exactly(0)

      call(["--delete", "foo"]).catch(function(error) {
        resume(function() { assertMatch(/service "foo" is not configured/i, error.message) })
      })
    }})

    it("reports a pre-deletion read error", function(resume) { with(this) {
      return resume() // TODO fix

      settings.confirm = true
      stub(fileStore, "get").returns(Promise.reject(new Error("failed to read")))

      call(["--delete", "foo"]).catch(function(error) {
        resume(function() { assertEqual("failed to read", error.message) })
      })
    }})

    it("reports a deletion error", function(resume) { with(this) {
      return resume() // TODO fix

      settings.confirm = true
      stub(fileStore, "get").given("/services/foo").returns(Promise.resolve({}))
      stub(fileStore, "remove").returns(Promise.reject(new Error("failed to delete")))

      call(["--delete", "foo"]).catch(function(error) {
        resume(function() { assertEqual("failed to delete", error.message) })
      })
    }})
  }})

  describe("clearing", function() { with(this) {
    it("clears all the settings", function(resume) { with(this) {
      settings.confirm = true

      Promise.all([
        escoStore.update("/global", () => ({length: 21})),
        escoStore.update("/services/foo", () => ({length: 42})),
      ]).then(function() {
        return call(["--clear"])
      }).then(function() {
        return escoStore.list("/")
      }).then(function(docs) {
        resume(function() { assertNull(docs) })
      })
    }})

    it("does not clear all the settings without confirmation", function(resume) { with(this) {
      settings.confirm = false

      Promise.all([
        escoStore.update("/global", () => ({length: 21})),
        escoStore.update("/services/foo", () => ({length: 42})),
      ]).then(function() {
        return call(["--clear"])
      }).catch(function() {
        return escoStore.list("/")
      }).then(function(docs) {
        resume(function() { assertEqual(["global", "services/"], docs) })
      })
    }})

    it("reports a deletion error", function(resume) { with(this) {
      return resume() // TODO fix

      settings.confirm = true
      stub(fileStore, "remove").returns(Promise.reject(new Error("failed to delete")))
      stub(fileStore, "removeRecursive").returns(pnull)

      call(["--clear"]).catch(function(error) {
        resume(function() { assertEqual("failed to delete", error.message) })
      })
    }})
  }})

  describe("exporting", function() { with(this) {
    before(function() { with(this) {
      this.exportPath = path.resolve(__dirname, "..", "__vault-export.json")
    }})

    after(function(resume) { with(this) {
      fs.unlink(exportPath, resume)
    }})

    define("exported", function() {
      return JSON.parse(fs.readFileSync(this.exportPath, "utf8"))
    })

    describe("with no stored settings", function() { with(this) {
      it("produces a skeleton export file", function(resume) { with(this) {
        call(["--export", exportPath]).then(function() {
          resume(function() {
            assertEqual({ services: {} }, exported())
          })
        }, resume)
      }})
    }})

    describe("with stored global settings", function() { with(this) {
      before(function(resume) { with(this) {
        escoStore.update("/global", () => ({length: 5, space: 0})).then(() => resume())
      }})

      it("exports the global settings", function(resume) { with(this) {
        call(["--export", exportPath]).then(function() {
          resume(function() {
            assertEqual({
              global: {length: 5, space: 0},
              services: {}
            }, exported())
          })
        }, resume)
      }})
    }})

    describe("with stored service settings", function() { with(this) {
      before(function(resume) { with(this) {
        Promise.all([
          escoStore.update("/services/foo", () => ({repeat: 3})),
          escoStore.update("/services/bar/qux", () => ({space: 0}))
        ]).then(() => resume())
      }})

      it("exports the global settings", function(resume) { with(this) {
        call(["--export", exportPath]).then(function() {
          resume(function() {
            assertEqual({
              services: {
                "foo": {repeat: 3},
                "bar/qux": {space: 0}
              }
            }, exported())
          })
        }, resume)
      }})
    }})
  }})

  describe("importing", function() { with(this) {
    before(function() { with(this) {
      this.importPath = path.resolve(__dirname, "..", "__vault-import.json")
    }})

    after(function(resume) { with(this) {
      fs.unlink(importPath, resume)
    }})

    describe("with an unreadable config file", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, "")
        stub(fs, "readFileSync").raises(new Error("Missing file"))
      }})

      it("reports an error", function(resume) { with(this) {
        call(["--import", importPath]).catch(function(error) {
          resume(function() { assertEqual("Missing file", error.message) })
        })
      }})
    }})

    describe("with an invalid JSON file", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, "")
      }})

      it("reports an error", function(resume) { with(this) {
        call(["--import", importPath]).catch(function(error) {
          resume(function() { assertMatch(/JSON/, error.message) })
        })
      }})
    }})

    describe("with an empty config file", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, JSON.stringify({}))
      }})

      it("makes no changes to the store", function(resume) { with(this) {
        call(["--import", importPath]).then(function() {
          return escoStore.list("/")
        }).then(function(docs) {
          resume(function() { assertNull(docs) })
        })
      }})
    }})

    describe("with a global setting", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, JSON.stringify({
          global: {length: 32}
        }))
      }})

      it("saves the global setting", function(resume) { with(this) {
        call(["--import", importPath]).then(function() {
          return escoStore.get("/global")
        }).then(function(doc) {
          resume(function() { assertEqual({length: 32}, doc) })
        })
      }})
    }})

    describe("with service settings", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, JSON.stringify({
          services: {
            foo: {space: 0, symbol: 0},
            bar: {phrase: "hello"}
          }
        }))
      }})

      it("saves the service settings", function(resume) { with(this) {
        call(["--import", importPath]).then(function() {
          return Promise.all([
            escoStore.get("/services/foo"),
            escoStore.get("/services/bar")
          ])
        }).then(function(docs) {
          resume(function() {
            assertEqual([{space: 0, symbol: 0}, {phrase: "hello"}], docs)
          })
        })
      }})
    }})

    describe("with existing service settings", function() { with(this) {
      before(function(resume) { with(this) {
        fs.writeFileSync(importPath, JSON.stringify({
          services: {
            foo: {space: 0, symbol: 0}
          }
        }))
        escoStore.update("/services/foo", () => ({length: 4})).then(() => resume())
      }})

      it("overwrites the existing settings", function(resume) { with(this) {
        call(["--import", importPath]).then(function() {
          return escoStore.get("/services/foo")
        }).then(function(doc) {
          resume(function() { assertEqual({space: 0, symbol: 0}, doc) })
        })
      }})
    }})
  }})
}})

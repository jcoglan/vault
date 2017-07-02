var jstest    = require("jstest").Test,
    storeroom = require("storeroom"),
    Promise   = storeroom.Promise,
    CliHelper = require("./helper")

jstest.describe("CLI sources", function() { with(this) {
  include(CliHelper)

  before(function() { with(this) {
    this.pnull = Promise.resolve(null)
    stub(stdout, "write")
  }})

  describe("adding sources", function() { with(this) {
    before(function() { with(this) {
      stub(storeroom, "connectRemoteStorage").returns(Promise.reject(null))
      stub(fileStore, "put").returning(pnull)
    }})

    it("asks Storeroom for a RemoteStorage session", function(resume) { with(this) {
      expect(storeroom, "connectRemoteStorage").given({
        address: "jcoglan@5apps.com",
        client:  "Vault",
        scope:   "getvau.lt",
        options: {
          browser: null,
          inline:  false,
          ca:      undefined,
          key:     "foo"
        }
      }).returning(pnull)

      call(["--add-source", "jcoglan@5apps.com", "--master-key", "foo"])
        .then(resume, resume)
    }})

    it("reports an error if no master key is given", function(resume) { with(this) {
      expect(storeroom, "connectRemoteStorage").exactly(0)
      expect(fileStore, "put").exactly(0)

      call(["--add-source", "jcoglan@5apps.com"]).catch(function(error) {
        resume(function() { assertEqual("No encryption key given; run again with --master-key", error.message) })
      })
    }})

    it("specifies a browser to use", function(resume) { with(this) {
      expect(storeroom, "connectRemoteStorage")
        .given(objectIncluding({options: objectIncluding({browser: "firefox", inline: false})}))
        .returning(pnull)

      call(["--add-source", "jcoglan@5apps.com", "--master-key", "foo", "--browser", "firefox"])
        .then(resume, resume)
    }})

    it("specifies a text browser to use", function(resume) { with(this) {
      expect(storeroom, "connectRemoteStorage")
        .given(objectIncluding({options: objectIncluding({browser: "elinks", inline: true})}))
        .returning(pnull)

      call(["--add-source", "jcoglan@5apps.com", "--master-key", "foo", "--text-browser", "elinks"])
        .then(resume, resume)
    }})

    describe("when the connection is successful", function() { with(this) {
      before(function() { with(this) {
        stub(storeroom, "connectRemoteStorage").returns(Promise.resolve({storeroom_session: true}))
      }})

      it("stores the session on success", function(resume) { with(this) {
        expect(fileStore, "put").given("/sources/sessions/jcoglan@5apps.com", {
          type:    "remotestorage",
          options: {browser: null, inline: false, ca: undefined, key: "foo"},
          session: {storeroom_session: true}
        }).returning(pnull)

        call(["--add-source", "jcoglan@5apps.com", "--master-key", "foo"])
          .then(resume, resume)
      }})

      it("makes the new source the default on confirmation", function(resume) { with(this) { include
        settings.confirm = true
        stub(fileStore, "get").given("/sources/sessions/jcoglan@5apps.com").returns(Promise.resolve({}))

        expect(fileStore, "put").given("/sources/default", "jcoglan@5apps.com").returning(pnull)

        call(["--add-source", "jcoglan@5apps.com", "--master-key", "foo"])
          .then(resume, resume)
      }})

      it("does not make the new source the default without confirmation", function(resume) { with(this) { include
        expect(fileStore, "put").given("/sources/default", anything()).exactly(0)

        call(["--add-source", "jcoglan@5apps.com", "--master-key", "foo"])
          .then(resume, resume)
      }})
    }})

    describe("when the connection fails", function() { with(this) {
      before(function() { with(this) {
        stub(storeroom, "connectRemoteStorage").returns(Promise.reject(new Error("Woops!")))
      }})

      it("does not write anything to the local store", function(resume) { with(this) {
        expect(fileStore, "put").exactly(0)

        call(["--add-source", "jcoglan@5apps.com", "--master-key", "foo"]).catch(function() {
          resume()
        })
      }})

      it("reports the error", function(resume) { with(this) {
        call(["--add-source", "jcoglan@5apps.com", "--master-key", "foo"]).catch(function(error) {
          resume(function() { assertEqual("Woops!", error.message) })
        })
      }})
    }})
  }})

  describe("setting the default source", function() { with(this) {
    it("sets the local source as the default", function(resume) { with(this) {
      expect(fileStore, "remove").given("/sources/default").returning(pnull)
      call(["--set-source", "local"]).then(resume, resume)
    }})

    describe("when the given source exists", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "get").given("/sources/sessions/foo").returns(Promise.resolve({}))
      }})

      it("sets the source as the default", function(resume) { with(this) {
        expect(fileStore, "put").given("/sources/default", "foo").returning(pnull)
        call(["--set-source", "foo"]).then(resume, resume)
      }})
    }})

    describe("when the given source does not exist", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "get").given("/sources/sessions/foo").returns(pnull)
      }})

      it("does not change the default source", function(resume) { with(this) {
        expect(fileStore, "put").exactly(0)
        call(["--set-source", "foo"]).catch(function() { resume() })
      }})

      it("reports an error", function(resume) { with(this) {
        call(["--set-source", "foo"]).catch(function(error) {
          resume(function() { assertEqual('Source "foo" does not exist', error.message) })
        })
      }})
    }})
  }})

  describe("deleting a source", function() { with(this) {
    describe("when the given source exists but is not the default", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "get").given("/sources/sessions/foo").returns(Promise.resolve({}))
        stub(fileStore, "get").given("/sources/default").returns(Promise.resolve("bar"))
      }})

      it("deletes the source but not the default pointer", function(resume) { with(this) {
        expect(fileStore, "remove").given("/sources/sessions/foo").returning(pnull)
        expect(fileStore, "remove").given("/sources/default").exactly(0)
        call(["--delete-source", "foo"]).then(resume, resume)
      }})
    }})

    describe("when the given source exists and is the default", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "get").given("/sources/sessions/foo").returns(Promise.resolve({}))
        stub(fileStore, "get").given("/sources/default").returns(Promise.resolve("foo"))
      }})

      it("deletes the source and the default", function(resume) { with(this) {
        expect(fileStore, "remove").given("/sources/sessions/foo").returning(pnull)
        expect(fileStore, "remove").given("/sources/default").returning(pnull)
        call(["--delete-source", "foo"]).then(resume, resume)
      }})
    }})

    describe("when the given source does not exist", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "get").given("/sources/sessions/foo").returns(pnull)
      }})

      it("does not remove anything", function(resume) { with(this) {
        expect(fileStore, "remove").exactly(0)
        call(["--delete-source", "foo"]).catch(function() { resume() })
      }})

      it("reports an error", function(resume) { with(this) {
        call(["--delete-source", "foo"]).catch(function(error) {
          resume(function() { assertEqual('Source "foo" does not exist', error.message) })
        })
      }})
    }})
  }})

  describe("listing sources", function() { with(this) {
    describe("when there are no remote sources", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "entries").given("/sources/sessions/").returns(Promise.resolve([]))
        stub(fileStore, "get").given("/sources/default").returns(pnull)
      }})

      it("displays the local source as current", function(resume) { with(this) {
        expect(stdout, "write").given("-> local\n")
        call(["--list-sources"]).then(resume, resume)
      }})
    }})

    describe("when there are remote sources and no default", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "entries").given("/sources/sessions/").returns(Promise.resolve(["bar", "foo"]))
        stub(fileStore, "get").given("/sources/default").returns(pnull)
      }})

      it("displays all sources with the local source as current", function(resume) { with(this) {
        expect(stdout, "write").given(["   bar", "   foo", "-> local", ""].join("\n"))
        call(["--list-sources"]).then(resume, resume)
      }})
    }})

    describe("when there are remote sources and a default", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "entries").given("/sources/sessions/").returns(Promise.resolve(["bar", "foo"]))
        stub(fileStore, "get").given("/sources/default").returns(Promise.resolve("foo"))
      }})

      it("displays all sources with the current source", function(resume) { with(this) {
        expect(stdout, "write").given(["   bar", "-> foo", "   local", ""].join("\n"))
        call(["--list-sources"]).then(resume, resume)
      }})
    }})
  }})

  describe("using settings from multiple sources", function() { with(this) {
    define("stubSource", function(name) { with(this) {
      stub(fileStore, "get").given("/sources/sessions/" + name).returns(Promise.resolve({
        type:    "remotestorage",
        options: {key: name + "-key"},
        session: {account: name}
      }))

      var adapter = {adapterName: name}
      stub(storeroom, "createRemoteStorageAdapter").given({account: name}).returns(adapter)

      var store = this[name + "Store"] = {storeName: name}
      stub(storeroom, "createStore").given(objectIncluding({adapter: adapter})).returns(store)
    }})

    before(function() { with(this) {
      stubSource("alice")
      stubSource("bob")

      stub(fileStore, "entries").given("/sources/sessions/").returns(Promise.resolve(["alice", "bob"]))
      stub(fileStore, "get").given("/sources/default").returns(Promise.resolve("alice"))

      this.localPassword = "1?GJd/PEG1fUJrq2*N7C"
      this.alicePassword = "ecf@H{\\F7{VJb:F)WT4#"
      this.bobPassword   = "N& ?!\"p3]PO_U>[9VDaX"

      this.aliceNoSpacePassword = "ecf[H/]F7&V+b;f*W^4$"
    }})

    it("stores config against the default source", function(resume) { with(this) {
      expect(aliceStore, "get").given("/services/bar").returning(pnull)
      expect(aliceStore, "put").given("/services/bar", {symbol: 0}).returning(pnull)
      call(["--config", "bar", "--symbol", "0"]).then(resume, resume)
    }})

    it("stores config against the specified source", function(resume) { with(this) {
      expect(bobStore, "get").given("/services/bar").returning(pnull)
      expect(bobStore, "put").given("/services/bar", {symbol: 0}).returning(pnull)
      call(["--source", "bob", "--config", "bar", "--symbol", "0"]).then(resume, resume)
    }})

    it("clears the default source", function(resume) { with(this) {
      expect(aliceStore, "remove").given("/global").returning(pnull)
      expect(aliceStore, "removeRecursive").given("/services/").returning(pnull)
      settings.confirm = true
      call(["--clear"]).then(resume, resume)
    }})

    it("clears the specified source", function(resume) { with(this) {
      expect(fileStore, "remove").given("/global").returning(pnull)
      expect(fileStore, "removeRecursive").given("/services/").returning(pnull)
      settings.confirm = true
      call(["--clear", "--source", "local"]).then(resume, resume)
    }})

    it("completes services from multiple sources", function(resume) { with(this) {
      stub(fileStore,  "entries").given("/services/").returns(Promise.resolve(["bar"]))
      stub(aliceStore, "entries").given("/services/").returns(Promise.resolve(["bee"]))
      stub(bobStore,   "entries").given("/services/").returns(Promise.resolve(["queue"]))

      expect(stdout, "write").given(["bar", "bee", "bob"].join("\n"))

      call(["--cmplt", "b"]).then(resume, resume)
    }})

    describe("when no source has an entry for the service", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore,  "get").given("/services/foo").returns(pnull)
        stub(aliceStore, "get").given("/services/foo").returns(pnull)
        stub(bobStore,   "get").given("/services/foo").returns(pnull)
      }})

      it("uses the settings of the default store", function(resume) { with(this) {
        expect(aliceStore, "get").given("/global").returning(Promise.resolve({phrase: "ALICE"}))
        expect(stdout, "write").given(alicePassword)
        call(["foo"]).then(resume, resume)
      }})

      it("uses the settings of the specified store", function(resume) { with(this) {
        expect(bobStore, "get").given("/global").returning(Promise.resolve({phrase: "BOB"}))
        expect(stdout, "write").given(bobPassword)
        call(["foo", "-s", "bob"]).then(resume, resume)
      }})
    }})

    describe("when the default source has an entry for the service", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore,  "get").given("/services/foo").returns(pnull)
        stub(aliceStore, "get").given("/services/foo").returns(Promise.resolve({space: 0}))
        stub(bobStore,   "get").given("/services/foo").returns(pnull)
      }})

      it("uses the settings of the default store", function(resume) { with(this) {
        expect(aliceStore, "get").given("/global").returning(Promise.resolve({phrase: "ALICE"}))
        expect(stdout, "write").given(aliceNoSpacePassword)
        call(["foo"]).then(resume, resume)
      }})

      it("uses the settings of the specified store", function(resume) { with(this) {
        expect(fileStore, "get").given("/global").returning(Promise.resolve({phrase: "LOCAL"}))
        expect(stdout, "write").given(localPassword)
        call(["foo", "-s", "local"]).then(resume, resume)
      }})
    }})

    describe("when one non-default source has an entry for the service", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore,  "get").given("/services/foo").returns(pnull)
        stub(aliceStore, "get").given("/services/foo").returns(pnull)
        stub(bobStore,   "get").given("/services/foo").returns(Promise.resolve({length: 6}))
      }})

      it("uses the settings of the store with the settings", function(resume) { with(this) {
        expect(bobStore, "get").given("/global").returning(Promise.resolve({phrase: "BOB"}))
        expect(stdout, "write").given("+<N> E")
        call(["foo"]).then(resume, resume)
      }})

      it("uses the settings of the specified store", function(resume) { with(this) {
        expect(fileStore, "get").given("/global").returning(Promise.resolve({phrase: "LOCAL"}))
        expect(stdout, "write").given(localPassword)
        call(["foo", "-s", "local"]).then(resume, resume)
      }})
    }})

    describe("when multiple non-default sources have an entry for the service", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore,  "get").given("/services/foo").returns(Promise.resolve({space: 0}))
        stub(aliceStore, "get").given("/services/foo").returns(pnull)
        stub(bobStore,   "get").given("/services/foo").returns(Promise.resolve({length: 6}))
      }})

      it("uses the settings of the default store", function(resume) { with(this) {
        expect(aliceStore, "get").given("/global").returning(Promise.resolve({phrase: "ALICE"}))
        expect(stdout, "write").given(alicePassword)
        call(["foo"]).then(resume, resume)
      }})
    }})

    describe("when multiple sources have an entry for the service", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore,  "get").given("/services/foo").returns(pnull)
        stub(aliceStore, "get").given("/services/foo").returns(Promise.resolve({space: 0}))
        stub(bobStore,   "get").given("/services/foo").returns(Promise.resolve({length: 6}))
      }})

      it("uses the settings of the default store", function(resume) { with(this) {
        expect(aliceStore, "get").given("/global").returning(Promise.resolve({phrase: "ALICE"}))
        expect(stdout, "write").given(aliceNoSpacePassword)
        call(["foo"]).then(resume, resume)
      }})
    }})
  }})
}})

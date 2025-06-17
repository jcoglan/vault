'use strict'

mocha.setup('bdd')
mocha.checkLeaks()

require('../vault_test')

mocha.run()

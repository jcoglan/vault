'use strict';

const colors = require('@colors/colors'),
      prompt = require('prompt');

colors.disable();
prompt.message = '';

const properties = {
  password: {
    description: 'Passphrase',
    hidden:      true,
    replace:     '*'
  }
};

module.exports = function() {
  prompt.start();

  return prompt.get({ properties }).then(({ password }) => {
    prompt.stop();
    return Buffer.from(password, 'binary').toString('utf8');
  });
};

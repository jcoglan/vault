# vault

NOT YET RELEASED, AND NOT NECESSARILY STABLE. DON'T STORE YOUR PASSWORDS WITH
THIS JUST YET.

Simple password generator. Given a passphrase and the name of a service, returns
a strong password for that service. You only need to remember your passphrase,
which you do not give to anyone, and this program will give a different password
for every service you use. The passphrase can be any text you like.

Given the same passphrase and service name, the program will generate the same
result every time, so you can use it to 'look up' those impossible-to-remember
passwords when you need them.


## Why?

I have a terrible memory and like keeping my stuff safe. [Strong service-specific
passwords are hard to remember](http://xkcd.com/936/), and many services [have
stupid restrictions on passwords](http://me.veekun.com/blog/2011/12/04/fuck-passwords/).
I want to remember one phrase and have a machine deal with making my passwords
strong.


## Installation

This program is written in JavaScript and is available as a Node program:

    npm install -g vault


## Usage

The most basic usage involves passing your passphrase and the service name; when
you pass the `-p` flag you will be prompted for your passphrase:

    $ vault -p google
    Passphrase: *********
    ^A99Ii^9&}0r."&Y

You can set the desired length using `-l`:

    $ vault -p google -l 6
    Passphrase: *********
    rZX39Y

You can control the character types present in the output, either to disable
certain types or make sure they are present. For example, to get a password with
no symbols in it:

    $ vault -p google --symbol 0
    Passphrase: *********
    IMhFYibiVxDPivAw

To get a password containing at least one dash and uppercase letter:

    $ vault -p google --dash 1 --upper 1
    Passphrase: *********
    ^A99IiREX|6iR"&_

Available character classes include:

* `lower`: lowercase letters, `a`-`z`
* `upper`: uppercase letters, `A`-`Z`
* `alpha`: all letters, `a`-`Z`
* `number`: the digits `0`-`9`
* `space`: the space character ` `
* `dash`: dashes (`-`) and underscores (`_`)
* `symbol`: other 'special' characters


## Saving your settings

If you like, you can store your passphrase on disk; `vault` will save it in a
file called `.vault` in your home directory.

The `.vault` file is encrypted with AES-256, using your username as the key by
default. You can set your own key using the `VAULT_KEY` environment variable.
You can also change the location of the file using the `VAULT_PATH` variable,
for example you might set `VAULT_PATH=Dropbox/.vault` to sync it using Dropbox.
If you do this, make sure any files containing the key are NOT also exposed to
third-party services.

To save your passphrase, pass the `--config` or `-c` flag:

    $ vault -c -p
    Passphrase: *********
    $ vault google
    ^A99Ii^9&}0r."&Y

You can also configure character class settings this way:

    $ vault -c --alpha 0
    $ vault -p google
    Passphrase: *********
    .-7|]40?;.)[?.=+

Both the passphrase and the character class settings can be overridden on a
per-service basis:

    $ vault -c twitter --alpha 1 --symbol 0
    
    $ vault -p twitter
    Passphrase: *********
    7G6dqSN74Ah5WlT0
    
    $ vault -p google
    Passphrase: *********
    .-7|]40?;.)[?.=+


## How does it work?

`vault` concatenates your passphrase, a fixed UUID value, and the service name,
and calculates the SHA-256 hash of that string. It then encodes the bits of that
hash using a 92-character set including letters, numbers, spaces and symbols up
to the desired length.

This scheme means that the generated passwords have a very high degree of
entropy and an attacker will find it extremely expensive either to brute-force
one of your passwords or to guess any of your passwords even if they steal one
service's database.


## License

(The MIT License)

Copyright (c) 2011-2012 James Coglan

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


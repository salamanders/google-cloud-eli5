#!/bin/bash

# Update the system, install phantomjs and casperjs and a promise polyfill

sudo apt-get update && sudo apt-get dist-upgrade -y 

sudo apt-get install -y bzip2 git libfontconfig1

PHANTOMJS_VERSION=2.1.1-linux-x86_64

sudo mkdir -p /srv/var && \
  wget -q -O /tmp/phantomjs-$PHANTOMJS_VERSION.tar.bz2 https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-$PHANTOMJS_VERSION.tar.bz2 && \
  tar -xjf /tmp/phantomjs-$PHANTOMJS_VERSION.tar.bz2 -C /tmp && \
  rm -f /tmp/phantomjs-$PHANTOMJS_VERSION.tar.bz2 && \
  sudo mv /tmp/phantomjs-$PHANTOMJS_VERSION/ /srv/var/phantomjs && \
  sudo ln -s /srv/var/phantomjs/bin/phantomjs /usr/bin/phantomjs

sudo git clone https://github.com/n1k0/casperjs.git /srv/var/casperjs && \
  sudo ln -s /srv/var/casperjs/bin/casperjs /usr/bin/casperjs

wget -q -O es6-promise.js https://raw.githubusercontent.com/stefanpenner/es6-promise/master/dist/es6-promise.js

sudo apt-get clean -y && sudo apt-get autoclean -y && sudo apt-get autoremove -y && \
  sudo rm -rf /usr/share/locale/* && sudo rm -rf /var/cache/debconf/*-old && sudo rm -rf /var/lib/apt/lists/* && sudo rm -rf /usr/share/doc/* 

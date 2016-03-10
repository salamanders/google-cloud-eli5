# docker running phantomjs and casperjs

FROM gcr.io/google_appengine/jetty9-compat

MAINTAINER Benjamin Hill <benhill@google.com>

# Env
ENV PHANTOMJS_VERSION 2.1.1-linux-x86_64

# possibly libfontconfig1 without the 1
ENV BUILD_PACKAGES bzip2 git libfontconfig1 python ca-certificates

RUN apt-get update && apt-get dist-upgrade -y && apt-get install -y $BUILD_PACKAGES 

RUN mkdir -p /srv/var && \
  wget -q -O /tmp/phantomjs-$PHANTOMJS_VERSION.tar.bz2 https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-$PHANTOMJS_VERSION.tar.bz2 && \
  tar -xjf /tmp/phantomjs-$PHANTOMJS_VERSION.tar.bz2 -C /tmp && \
  rm -f /tmp/phantomjs-$PHANTOMJS_VERSION.tar.bz2 && \
  mv /tmp/phantomjs-$PHANTOMJS_VERSION/ /srv/var/phantomjs && \
  ln -s /srv/var/phantomjs/bin/phantomjs /usr/bin/phantomjs

RUN git clone https://github.com/n1k0/casperjs.git /srv/var/casperjs && \
  ln -s /srv/var/casperjs/bin/casperjs /usr/bin/casperjs

RUN apt-get clean -y && \
    apt-get autoclean -y && \
    apt-get autoremove -y && \
    rm -rf /usr/share/locale/* && \
    rm -rf /var/cache/debconf/*-old && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /usr/share/doc/* 

COPY . /app/

# Default command
CMD ["/usr/bin/phantomjs", "python_server.js"]

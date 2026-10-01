FROM jenkins/jenkins:2.580.1-jdk21
USER root
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && . /etc/os-release \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $VERSION_CODENAME stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update && apt-get install -y --no-install-recommends docker-ce-cli docker-buildx-plugin \
    && rm -rf /var/lib/apt/lists/*
ARG KUBECTL_VERSION=v1.35.8
RUN ARCH=$(dpkg --print-architecture) \
    && curl -fsSL "https://dl.k8s.io/release/$KUBECTL_VERSION/bin/linux/$ARCH/kubectl" -o /tmp/kubectl \
    && curl -fsSL "https://dl.k8s.io/release/$KUBECTL_VERSION/bin/linux/$ARCH/kubectl.sha256" -o /tmp/kubectl.sha256 \
    && cd /tmp && echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check \
    && install -m 0755 kubectl /usr/local/bin/kubectl && rm kubectl kubectl.sha256
USER jenkins
RUN jenkins-plugin-cli --plugins workflow-aggregator git credentials-binding timestamper

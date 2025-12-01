FROM debian:trixie-slim

ARG SONAR_SCANNER_VERSION=7.3.0.5189
ARG SONAR_SCANNER_ZIP=sonar-scanner-cli-${SONAR_SCANNER_VERSION}-linux-x64
ARG SONAR_SCANNER_DIR=sonar-scanner-${SONAR_SCANNER_VERSION}-linux-x64

RUN apt update && apt install -y --no-install-recommends wget unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -m -d /home/sonar -s /bin/sh appuser \
    && mkdir -p /opt \
    && wget --secure-protocol=TLSv1_2 --max-redirect=0 -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/${SONAR_SCANNER_ZIP}.zip -P /tmp \
    && unzip /tmp/${SONAR_SCANNER_ZIP}.zip -d /opt \
    && rm /tmp/${SONAR_SCANNER_ZIP}.zip \
    && chown -R appuser:appuser /opt/${SONAR_SCANNER_DIR}

ENV PATH="/opt/${SONAR_SCANNER_DIR}/bin:${PATH}"

USER appuser

WORKDIR /src

COPY . .

ENTRYPOINT ["sonar-scanner"]
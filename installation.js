class VerisureInstallation {
  constructor(installation, client) {
    this.giid = installation.giid;
    this.locale = installation.locale;
    this.config = installation;

    this.baseClient = client;
  }

  client(options) {
    const requestOptions = Object.assign(options, {
      uri: `/installation/${this.giid}/${options.uri}`,
    });
    return this.baseClient(requestOptions);
  }

  getOverview() {
    return this.client({ uri: 'overview' });
  }
}

module.exports = VerisureInstallation;

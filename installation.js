class VerisureInstallation {
  constructor(installation, client) {
    this.giid = installation.giid;
    this.locale = installation.locale;
    this.config = installation;

    this.baseClient = client;
  }

  client(options) {
    const requestOptions = Object.assign(options, {
      url: `/installation/${this.giid}/${options.url}`,
    });
    return this.baseClient(requestOptions);
  }

  getOverview() {
    return this.client({ url: 'overview' });
  }
}

module.exports = VerisureInstallation;

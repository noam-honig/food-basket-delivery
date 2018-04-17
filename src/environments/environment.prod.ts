import * as radweb from 'radweb';
const serverUrl= '/';

export const environment = {
  production: true,
  serverUrl,
  //dataSource: new radweb.LocalStorageDataProvider() as radweb.DataProviderFactory
  dataSource : new radweb.RestDataProvider(serverUrl+ 'dataApi') as radweb.DataProviderFactory,
  openedDataApi: new radweb.RestDataProvider(serverUrl + 'openedDataApi') as radweb.DataProviderFactory
};

import { Authentication } from "./authentication";
import { myAuthInfo } from "./my-auth-info";
import { environment } from "../../environments/environment";
import { DataProviderFactory, RestDataProvider } from "radweb";

const auth = new Authentication<myAuthInfo>();
export const evilStatics = {
    auth: auth,
    //dataSource: new radweb.LocalStorageDataProvider() as radweb.DataProviderFactory
    dataSource: new RestDataProvider(environment.serverUrl + 'api', auth.AddAuthInfoToRequest()) as DataProviderFactory,
}
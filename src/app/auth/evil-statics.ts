import { Authentication } from "./authentication";
import { myAuthInfo } from "./my-auth-info";
import { environment } from "../../environments/environment";
import { DataProviderFactory, RestDataProvider } from "radweb";

const auth = new Authentication<myAuthInfo>();
export interface PasswordHelper {
    generateHash(password: string): string;
    verify(password: string, realPasswordHash: string): boolean;
}
const passwordHelper: PasswordHelper = {
    generateHash: x => { throw ""; },
    verify: (x, y) => { throw ""; }
};
export const evilStatics = {
    passwordHelper,
    auth: auth,
    //dataSource: new radweb.LocalStorageDataProvider() as radweb.DataProviderFactory
    dataSource: new RestDataProvider(environment.serverUrl + 'api', auth.AddAuthInfoToRequest()) as DataProviderFactory,
    routes: {
        assignFamilies: '',
        myFamilies: '',
        updateInfo: '',
        login: '',
        register: '',
        myWeeklyFamilies:'',
        weeklyFamiliesPack:''
    },

}

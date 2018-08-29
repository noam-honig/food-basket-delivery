import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { DataApi, DataApiSettings } from "radweb/utils/server/DataApi";
import { Entity } from "radweb";


export interface entityApiSettings {
    apiSettings?: (auth: myAuthInfo) => DataApiSettings<Entity<any>>;
}


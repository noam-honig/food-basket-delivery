import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { DataApi } from "radweb/utils/server/DataApi";

export interface entityWithApi {
    getDataApiSettings():entityApiSettings;
}
export interface entityApiSettings{
    allowOpenApi?:boolean;
    createDataApi?:(r:DataApiRequest<myAuthInfo>)=>DataApi<any>;
}
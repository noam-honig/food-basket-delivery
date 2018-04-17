import { Authentication } from "./authentication";
import { myAuthInfo } from "./my-auth-info";

export const evilStatics={
    auth: new Authentication<myAuthInfo>()
}
import { Remult } from "remult";
import fetch from 'node-fetch';

export async function doOnRemoteHagai<T>(what: (remoteRemult: Remult, url: string) => Promise<T>, withAdmin = false): Promise<T> {
    const info = process.env.REMOTE_HAGAI;
    if (info) {
        const url = info.split('|')[0];
        const token = info.split('|')[1];
        const remoteRemult = new Remult({
            url: url + '/guest/api',
            // httpClient: async (url: any, info: any) => {
            //     console.log({ headers: info.headers });
            //     return await fetch(url, info) as any
            // }
            httpClient: {
                get: () => undefined,
                put: () => undefined,
                delete: () => undefined,
                post: async (url, data) => {
                    const headers = {
                        "accept": "application/json, text/plain, */*",

                        "cache-control": "no-cache",
                        "content-type": "application/json"
                    }
                    if (withAdmin)
                        headers["authorization"] = "Bearer " + token;

                    const fetchResult = await fetch(url, {
                        method: "POST",
                        headers,
                        body: JSON.stringify(data)
                    }).then(x => x.json());
                    return fetchResult;
                }
            }
        })
        return await what(remoteRemult, url);
    }


}
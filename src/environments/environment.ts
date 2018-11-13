import * as radweb from 'radweb';
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
var serverUrl = 'http:/localhost:3000/';

if (typeof (window) === 'undefined') {

}
else {
  serverUrl = 'http://' + window.location.hostname + ':3000/';// + window.location.hostname + ':3000/';
}


export const environment = {
  production: false,
  serverUrl
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.

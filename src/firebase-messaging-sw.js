importScripts("https://www.gstatic.com/firebasejs/7.2.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/7.2.0/firebase-messaging.js");

firebase.initializeApp({
 "messagingSenderId": "828821759045"
});

const messaging = firebase.messaging();
messaging.setBackgroundMessageHandler(function(payload) {
    console.log('[firebase] Received background message ', payload);
});

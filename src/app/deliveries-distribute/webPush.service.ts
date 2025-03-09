import { Injectable } from '@angular/core'
import {
  getMessaging,
  getToken,
  Messaging,
  onMessage
} from 'firebase/messaging'
import { initializeApp } from 'firebase/app'
import { remult, repo } from 'remult'
import { Helpers } from '../helpers/helpers'
import { ApplicationSettings } from '../manage/ApplicationSettings'

@Injectable({
  providedIn: 'root'
})
export class webPushService {
  private messaging: Messaging

  constructor(private settings: ApplicationSettings) {
    let firebaseConfig = settings.firebaseConfig

    try {
      firebaseConfig = JSON.parse(firebaseConfig)

      if (firebaseConfig && settings.firebaseVapidKey) {
        const app = initializeApp(firebaseConfig)
        this.messaging = getMessaging(app)
      }
    } catch (error) {}
  }

  requestPermission() {
    if (this.messaging)
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') this.getToken()
        else console.log('Unable to get permission to notify.')
      })
  }

  getToken() {
    getToken(this.messaging, {
      vapidKey: this.settings.firebaseVapidKey
    })
      .then(async (currentToken) => {
        if (currentToken) {
          try {
            await repo(Helpers).update(remult.user.id, {
              deviceTokenNotifications: currentToken
            })
          } catch (err) {
            console.log(err)
          }
        } else
          console.log(
            'No Instance ID token available. Request permission to generate one.'
          )
      })
      .catch((err) => {
        console.log('An error occurred while retrieving token. ', err)
      })
  }

  listenForMessages() {
    onMessage(this.messaging, (payload) => {
      console.log('payload:', payload)
    })
  }
}

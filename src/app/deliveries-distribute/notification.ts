import { repo } from 'remult'

import { ApplicationSettings } from '../manage/ApplicationSettings'
import { Sites } from '../sites/sites'

export async function sendNotification(
  title: string,
  body: string,
  token: string
) {
  try {
    const setting = await repo(ApplicationSettings).findId(1, {
      createIfNotFound: true
    })
    const message = {
      notification: {
        title,
        body
      },
      webpush: {
        notification: {
          icon: setting?.logoUrl
        },
        fcmOptions: {
          link: '/' + Sites.getOrganizationFromContext() + '/login'
        }
      },
      token
    }
    const admin = require('firebase-admin')
    admin
      .messaging()
      .send(message)
      .then((response) => {
        console.log('Notification sent successfully: ' + response)
      })
      .catch((error) => {
        console.log('Error sending notification: ' + error)
      })
  } catch (error) {
    console.log(error)
  }
}

export async function initNotification(firebaseCredentials: any) {
  try {
    const credentials = firebaseCredentials
    if (!credentials) return
    const privateKey = credentials['private_key'].replace(/\\n/g, '\n')
    console.log('Credential initNotification', {
      projectId: credentials['project_id'],
      privateKey,
      clientEmail: credentials['client_email']
    })
    if (
      credentials['project_id'] &&
      privateKey &&
      credentials['client_email']
    ) {
      const admin = require('firebase-admin')

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: credentials['project_id'],
          privateKey,
          clientEmail: credentials['client_email']
        })
      })
    }
  } catch (err) {
    console.log('Error initNotification', err)
  }
}

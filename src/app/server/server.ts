//import { CustomModuleLoader } from '../../../../radweb/projects/test-angular/src/app/server/CustomModuleLoader';
//let moduleLoader = new CustomModuleLoader('/dist/server/radweb/projects');
import { ApplicationImages } from '../manage/ApplicationImages'
import * as express from 'express'
import * as fs from 'fs' //
//import * as heapdump from 'heapdump'
import { serverInit } from './serverInit'
import {
  ApplicationSettings,
  getSettings,
  setSettingsForSite
} from '../manage/ApplicationSettings'
import {
  ControllerBase,
  Filter,
  OmitEB,
  remult,
  Remult,
  SqlDatabase
} from 'remult'
import { Sites, setLangForSite, getSiteFromUrl } from '../sites/sites'

import {
  AdjustGeocode,
  GeocodeCache,
  GeoCodeOptions
} from '../shared/googleApiHelpers'
import { Families } from '../families/families'
import {
  PostgresSchemaBuilder,
  preparePostgresQueueStorage
} from 'remult/postgres'
import * as forceHttps from 'express-force-https'
import * as jwt from 'express-jwt'
import * as compression from 'compression'
import { InitContext } from '../helpers/init-context'
import { Helpers, HelpersBase } from '../helpers/helpers'
import { Phone } from '../model-shared/phone'
import * as fetch from 'node-fetch'
import { volunteersInEvent, Event, eventStatus } from '../events/events'

import { OverviewController } from '../overview/overview.controller'
import {
  ActiveFamilyDeliveries,
  DeliveryChanges,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats'
import { BasketType } from '../families/BasketType'
import { DeliveryImage, FamilyImage } from '../families/DeiveryImages'
import { FamilySources } from '../families/FamilySources'
import {
  CitiesStats,
  CitiesStatsPerDistCenter,
  FamilyDeliveryStats
} from '../family-deliveries/family-deliveries-stats'
import { HelperGifts } from '../helper-gifts/HelperGifts'
import {
  HelperCommunicationHistory,
  InRouteHelpers
} from '../in-route-follow-up/in-route-helpers'
import { DistributionCenters } from '../manage/distribution-centers'
import { Groups } from '../manage/groups'
import { GroupsStatsPerDistributionCenter } from '../manage/GroupsStatsPerDistributionCenter'
import { GroupsStatsForAllDeliveryCenters } from '../manage/GroupsStatsForAllDeliveryCenters'
import { VolunteerReportInfo } from '../print-volunteer/VolunteerReportInfo'
import { RegisterURL } from '../resgister-url/regsiter-url'
import { SitesEntity } from '../sites/sites.entity'
import { SendSmsAction } from '../asign-family/send-sms-action'
import { AsignFamilyController } from '../asign-family/asign-family.controller'
import {
  AuthServiceController,
  INVALID_TOKEN_ERROR
} from '../auth/auth-service.controller'
import { CreateNewEvent } from '../create-new-event/create-new-event'
import { DeliveryFollowUpController } from '../delivery-follow-up/delivery-follow-up.controller'
import { DistributionMapController } from '../distribution-map/distribution-map.controller'
import { DuplicateFamiliesController } from '../duplicate-families/duplicate-families.controller'
import { RegisterToEvent } from '../event-info/RegisterToEvent'
import { FamiliesController } from '../families/families.controller'
import { Stats } from '../families/stats-action'
import { FamilyDeliveriesController } from '../family-deliveries/family-deliveries.controller'
import { FamilyInfoController } from '../family-info/family-info.controller'
import { FamilySelfOrderController } from '../family-self-order/family-self-order.controller'
import { HelperFamiliesController } from '../helper-families/helper-families.controller'
import { moveDeliveriesHelperController } from '../helper-families/move-deliveries-helper.controller'
import { HelpersController } from '../helpers/helpers.controller'
import { SendBulkSms } from '../helpers/send-bulk-sms'
import { ImportFromExcelController } from '../import-from-excel/import-from-excel.controller'
import { ImportHelpersFromExcelController } from '../import-helpers-from-excel/import-helpers-from-excel.controller'
import { ManageController, SendTestSms } from '../manage/manage.controller'
import { MergeFamiliesController } from '../merge-families/merge-families.controller'
import { MltFamiliesController } from '../mlt-families/mlt-families.controller'
import { OrgEventsController } from '../org-events/org-events.controller'
import { PreviousDeliveryController } from '../previous-delivery-comments/previous-delivery-comments.controller'
import { VolunteerReportDefs } from '../print-stickers/VolunteerReportDefs'
import { donorForm } from '../register-donor/register-donor.controller'
import { SelectCompanyController } from '../select-company/select-company.controller'
import { SelectHelperController } from '../select-helper/select-helper.controller'
import { SiteOverviewController } from '../site-overview/site-overview.controller'
import { WeeklyReportMltController } from '../weekly-report-mlt/weekly-report-mlt.controller'
import { DeliveryHistoryController } from '../delivery-history/delivery-history.controller'
import { NewDelivery, SendSmsToFamilies } from '../families/familyActions'
import {
  DeleteDeliveries,
  SendSmsForFamilyDetailsConfirmation
} from '../family-deliveries/family-deliveries-actions'
import { PlaybackController } from '../playback/playback.controller'
import {
  DialogController,
  StatusChangeChannel
} from '../select-popup/dialog.controller'
import { ShipmentAssignScreenController } from '../shipment-assign-screen/shipment-assign-screen.controller'
import { PrintVolunteersController } from '../print-volunteers/print-volunteers.controller'
import { PromiseThrottle } from '../shared/utils'
import { SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { Roles } from '../auth/roles'
import { ChangeLog, FieldDecider } from '../change-log/change-log'
import { CallerController } from '../caller/caller.controller'

import { postgresColumnSyntax } from 'remult/postgres/schema-builder'
import { remultExpress, RemultExpressServer } from 'remult/remult-express'
import { Callers } from '../manage-callers/callers'
import { MessageTemplate } from '../edit-custom-message/messageMerger'
import {
  InitRequestOptions,
  RemultServer,
  RemultServerCore,
  SseSubscriptionServer
} from 'remult/server'

import * as ably from 'ably'

import {
  LiveQueryStorage,
  InMemoryLiveQueryStorage,
  SubscriptionServer
} from 'remult'
import { MemoryStats } from './stats'
import { FamilyConfirmDetailsController } from '../family-confirm-details/family-confirm-details.controller'
import { randomUUID } from 'crypto'

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  console.trace()
  // application specific logging, throwing an error, or other logic here
  //1
})
const entities = [
  MemoryStats,
  DeliveryChanges,
  ChangeLog,
  HelpersAndStats,
  Event,
  volunteersInEvent,
  BasketType,
  DeliveryImage,
  FamilyImage,
  FamilySources,
  CitiesStats,
  CitiesStatsPerDistCenter,
  HelperGifts,
  HelpersBase,
  Helpers,
  InRouteHelpers,
  ApplicationImages,
  ApplicationSettings,
  DistributionCenters,
  Groups,
  GroupsStatsForAllDeliveryCenters,
  GroupsStatsPerDistributionCenter,
  VolunteerReportInfo,
  RegisterURL,
  GeocodeCache,
  SitesEntity,
  Families,
  FamilyDeliveries,
  ActiveFamilyDeliveries,
  Callers,
  MessageTemplate,
  HelperCommunicationHistory
]
const controllers = [
  SendSmsForFamilyDetailsConfirmation,
  FamilyConfirmDetailsController,
  SendTestSms,
  AdjustGeocode,
  CallerController,
  SendSmsAction,
  AsignFamilyController,
  AuthServiceController,
  CreateNewEvent,
  DeliveryFollowUpController,
  DistributionMapController,
  DuplicateFamiliesController,
  RegisterToEvent,
  FamiliesController,
  SendSmsToFamilies,
  Stats,
  FamilyDeliveryStats,
  FamilyDeliveriesController,
  FamilyInfoController,
  FamilySelfOrderController,
  HelperFamiliesController,
  moveDeliveriesHelperController,
  HelpersController,
  SendBulkSms,
  ImportFromExcelController,
  ImportHelpersFromExcelController,
  ManageController,
  MergeFamiliesController,
  MltFamiliesController,
  OrgEventsController,
  PreviousDeliveryController,
  VolunteerReportDefs,
  donorForm,
  SelectCompanyController,
  SelectHelperController,
  SiteOverviewController,
  WeeklyReportMltController,
  DeliveryHistoryController,
  NewDelivery,
  DeleteDeliveries,
  PlaybackController,
  DialogController,
  ShipmentAssignScreenController,
  PrintVolunteersController,
  OverviewController
]

let publicRoot = 'hagai'
if (!fs.existsSync(publicRoot + '/index.html'))
  publicRoot = 'dist/' + publicRoot
serverInit().then(async ({ dataSource, initDatabase }) => {
  let app = express()
  app.use(
    jwt({
      secret: process.env.TOKEN_SIGN_KEY,
      credentialsRequired: false,
      algorithms: ['HS256']
    })
  )
  app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
      res.status(401).send(INVALID_TOKEN_ERROR)
    }
  })

  if (!process.env.DEV_MODE) app.use(forceHttps)

  let redirect: string[] = []
  {
    let x = process.env.REDIRECT
    if (x && process.env.REDIRECT_TARGET) redirect = x.split(',')
  }

  async function sendIndex(res: express.Response, req: express.Request) {
    if (req.headers.accept?.includes('json')) {
      res.status(404).json('missing route: ' + req.originalUrl)
      return
    }

    try {
      let org = remult.context.getSite()
      if (redirect.includes(org)) {
        const target = process.env.REDIRECT_TARGET + req.originalUrl
        console.log('Redirect ', target)
        res.redirect(target)
        return
      }
      if (!Sites.isValidOrganization(org)) {
        res.redirect('/' + Sites.guestSchema + '/')
        return
      }
      const index = publicRoot + '/index.html'

      if (fs.existsSync(index)) {
        let x = ''

        let settings = await ApplicationSettings.getAsync()
        setLangForSite(Sites.getValidSchemaFromContext(), settings.forWho)
        setSettingsForSite(Sites.getValidSchemaFromContext(), settings)
        x = settings.organisationName
        let result = fs
          .readFileSync(index)
          .toString()
          .replace(/!TITLE!/g, x)
          .replace('/*!SITE!*/', 'multiSite=' + Sites.multipleSites)
        let key = process.env.GOOGLE_MAP_JAVASCRIPT_KEY
        if (!key) key = 'AIzaSyDbGtO6VwaRqGoduRaGjSAB15mZPiPt9mM' //default key to use only for development
        result = result.replace(/GOOGLE_MAP_JAVASCRIPT_KEY/g, key)

        let tagid = 'UA-121891791-1' // default key for Google Analytics
        if (settings.isSytemForMlt) {
          //tagid = 'AW-452581833';
          result = result.replace(
            '/*ANOTHER_GTAG_CONFIG*/',
            "gtag('config', 'AW-452581833');gtag('config', 'UA-174556479-1');"
          )
          result = result.replace(
            /<!--FACEBOOK_AND_LINKEDIN_PLACEHOLDER-->/g,
            `
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '432475371126727');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=432475371126727&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->

    
<script type="text/javascript">
_linkedin_partner_id = "2525417";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script><script type="text/javascript">
(function(){var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})();
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=2525417&fmt=gif" />
</noscript>
                `
          )
        } else {
          result = result.replace(
            /<!--FACEBOOK_AND_LINKEDIN_PLACEHOLDER-->/g,
            `
<!-- Facebook Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '4976882262329043');
  fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=4976882262329043&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->
`
          )
        }
        result = result.replace(/GOOGLE_PIXEL_TAG_ID/g, tagid)

        if (settings.forWho.args.leftToRight) {
          result = result.replace(/<body dir="rtl">/g, '<body dir="ltr">')
        }
        if (settings.forWho.args.languageCode) {
          let lang = settings.forWho.args.languageCode
          result = result
            .replace(/&language=iw&/, `&language=${lang}&`)
            .replace(/&amp;language=iw&amp;/, `&language=${lang}&`)
            .replace(/טוען/g, 'Loading')
        }
        if (settings.forWho.args.languageFile) {
          let lang = settings.forWho.args.languageFile
          result = result.replace(
            /document.lang = ''/g,
            `document.lang = '${lang}'`
          )
        }
        if (Sites.multipleSites) {
          result = result
            .replace('"favicon.ico', '"/' + org + '/favicon.ico')
            .replace(
              '"/assets/apple-touch-icon.png"',
              '"/' + org + '/assets/apple-touch-icon.png"'
            )
        }
        res.send(result)
      } else {
        res.send('No Result: ' + req.originalUrl)
      }
    } catch (err) {
      console.log(err)
      res.send('Sorry, please try again in a few minutes')
    }
  }
  if (process.env.DISABLE_GEOCODE) {
    console.log('geocode disabled')
    GeoCodeOptions.disableGeocode = true
  }

  if (!process.env.DISABLE_SERVER_EVENTS) {
    let lastMessage = new Date()
    Families.SendMessageToBrowsers = (x, distCenter) => {
      if (new Date().valueOf() - lastMessage.valueOf() > 1000) {
        lastMessage = new Date()
        StatusChangeChannel.publish(x)
      }
    }
  }
  app.use(compression())
  //

  const siteEventPublishers = new Map<
    string,
    {
      subscriptionServer: SubscriptionServer
      liveQueryStorage: LiveQueryStorage
    }
  >()

  async function initRemultContext(
    { url, origin, referer }: initRemultContextInfo,
    options: InitRequestOptions
  ) {
    const site = getSiteFromUrl(url)
    remult.context.requestRefererOnBackend = referer
    remult.context.getSite = () => site
    remult.context.requestUrlOnBackend = url
    if (!remult.isAllowed(Sites.getOrgRole())) remult.user = undefined
    remult.dataProvider = dataSource(remult)
    remult.context.getOrigin = () => origin

    let found = siteEventPublishers.get(site)
    if (!found) {
      let subscriptionServer: SubscriptionServer
      //TODO YONI - review channel name
      let x = new SseSubscriptionServer((channel, remult) => {
        if (channel === StatusChangeChannel.channelKey)
          return remult.isAllowed(Roles.distCenterAdmin)
        return channel.startsWith(`users:${remult.user?.id}`)
      })
      //x.debugFileSaver = x => fs.writeFileSync('./tmp/' + site + 'dispatcher.json', JSON.stringify(x, undefined, 2))
      //x.debugMessageFileSaver = (id, channel, message) => fs.writeFileSync('./tmp/messages/' + site + new Date().toISOString().replace(/:/g, '') + '.json', JSON.stringify({ channel, message, id }, undefined, 2));
      subscriptionServer = x

      var liveQueryStorage = new InMemoryLiveQueryStorage()
      siteEventPublishers.set(
        site,
        (found = {
          subscriptionServer,
          //TODO - replace with storage that is stored in the db
          liveQueryStorage
        })
      )
      //storage.debugFileSaver = x => fs.writeFileSync('./tmp/' + site + 'liveQueryStorage.json', JSON.stringify(x, undefined, 2));
    }
    //z.debugFileSaver = x => fs.writeFileSync('./tmp/messages/' + site + new Date().toISOString().replace(/:/g, '') + '.json', JSON.stringify(x, undefined, 2));
    remult.subscriptionServer = found.subscriptionServer
    options.liveQueryStorage = found.liveQueryStorage
    await InitContext(remult, undefined)
  }

  let api = remultExpress({
    entities,
    controllers,
    logApiEndPoints: process.env.logUrls == 'true',
    initRequest: async (req, options) => {
      let url = ''
      let origin = ''
      let referer = ''
      if (req) {
        if (req.headers) {
          referer = req.headers['referer']?.toString()
          origin = req.headers['origin'] as string
        }
        if (req.originalUrl) url = req.originalUrl
        else if (req.url) url = req.url
        else url = req.path
      }
      await initRemultContext({ url, origin, referer }, options)
    },
    contextSerializer: {
      serialize: async () =>
        ({
          origin: remult.context.getOrigin(),
          referer: remult.context.requestRefererOnBackend,
          url: remult.context.requestUrlOnBackend
        } as initRemultContextInfo),
      deserialize: async (json, options) => {
        await initRemultContext(json, options)
      }
    },
    initApi: async (remult) => {
      await initDatabase()
      if (!process.env.DEV_MODE) return
      remult.context.getSite = () => 'test1'
      remult.dataProvider = dataSource(remult)
      await InitContext(remult, undefined)

      if (false) {
        let h1 = await remult
          .repo(Helpers)
          .findFirst({ phone: new Phone('0507330590') })
        console.log(h1)

        let row = await SqlDatabase.getDb(remult).execute(
          "select id, name, smsDate, doNotSendSms, company, totalKm, totalTime, shortUrlKey, distributionCenter, eventComment, needEscort, theHelperIAmEscorting, escort, leadHelper, myGiftsURL, archive, frozenTill, internalComment, blockedFamilies, case when (frozenTill is null or frozenTill <= '2023-05-07T21:00:00.000Z') then false else true end, id || escort || theHelperIAmEscorting, phone, lastSignInDate, password, socialSecurityNumber, email, addressApiResult, preferredDistributionAreaAddress, preferredDistributionAreaAddressCity, addressApiResult2, preferredDistributionAreaAddress2, preferredFinishAddressCity, createDate, passwordChangeDate, EULASignDate, reminderSmsDate, referredBy, isAdmin, labAdmin, isIndependent, distCenterAdmin, familyAdmin, caller, includeGroups, excludeGroups, callQuota\n" +
            ` from Helpers where phone = '0507330590' Order By id  limit 1 offset 0`
        )
        let val = row.rows[0][row.getColumnKeyInResultForIndexInSelect(18)]
        console.log(val)
        console.log(
          remult.repo(Helpers).fields.blockedFamilies.valueConverter.fromDb(val)
        )
      }

      const path = './db-structure/'
      for (const entity of entities) {
        let meta = remult.repo(
          entity as {
            new (...args: any[]): any
          }
        ).metadata
        const db = await meta.getDbName()
        if (!db.includes('select ')) {
          let s = 'create table ' + db
          for (const f of meta.fields.toArray()) {
            if (!f.options.sqlExpression)
              s += '\n' + (await postgresColumnSyntax(f, await f.getDbName()))
          }
          fs.writeFileSync(path + meta.key + '.sql', s)
        }
      }

      //console.table(remult.repo(FamilyDeliveries).metadata.fields.toArray().map(x => ({ key: x.key, api: x.options.includeInApi })));
      if (false) {
        console.log(
          '---------------------------------------------------------------------------'
        )
        var h = await remult.repo(Helpers).findFirst()
        console.log(
          '---------------------------------------------------------------------------1'
        )
        remult.user = {
          distributionCenter: 'dist',
          escortedHelperName: '',
          id: h.id,
          name: 'Asdf',
          roles: [Roles.admin],
          theHelperIAmEscortingId: ''
        }
        h.blockedFamilies = ['1', '2']
        h.blockedFamilies = null
        await h.save()
        console.log(h.blockedFamilies)
      }
      // console.table((await remult.repo(ActiveFamilyDeliveries).find({ where: ActiveFamilyDeliveries.filterPhone('315') })).map(({name, phone1}) => ({ name, phone1 })))
    },
    rootPath: '/*/api',
    queueStorage: await preparePostgresQueueStorage(dataSource(new Remult()))
  })
  if (true)
    setInterval(() => {
      api.withRemult(
        {
          url: '/' + Sites.guestSchema + '/xx'
        } as any,
        undefined,
        async () => {
          let vals = {
            total: 0,
            total$sse: 0
          }
          for (const key of siteEventPublishers.keys()) {
            await siteEventPublishers
              .get(key)
              .liveQueryStorage.forEach('', async () => {})
            let val =
              //@ts-ignore
              siteEventPublishers.get(key).liveQueryStorage.queries.length
            vals.total += val
            if (val > 0) vals[key] = val
            let v2 =
              //@ts-ignore
              siteEventPublishers.get(key).subscriptionServer.connections.length
            if (v2) {
              vals.total$sse += v2
              vals[key + '$sse'] = v2
            }
          }
          OverviewController.stats = vals
          await remult.repo(MemoryStats).insert({
            mem: process.memoryUsage(),
            stats: vals
          })
        }
      )
    }, 60000)
  app.use(api)

  if (Sites.multipleSites) {
    registerImageUrls(app, api, '/*')
  } else {
    registerImageUrls(app, api, '')
  }
  app.use('/*/api/incoming-sms', api.withRemult, async (req, res) => {
    try {
      let org = Sites.getOrganizationFromContext()
      if (redirect.includes(org)) {
        console.log('Incoming SMS Redirect', {
          p: req.path,
          q: req.query,
          o: req.originalUrl
        })
        const target = process.env.REDIRECT_TARGET + req.originalUrl
        try {
          await fetch.default(target)
        } catch (err) {
          console.error('Incoming sms redirect err', err)
        }
      } else {
        let comRepo = remult.repo(
          (await import('../in-route-follow-up/in-route-helpers'))
            .HelperCommunicationHistory
        )

        let com = comRepo.create({
          apiResponse: req.query,
          message: req.query.message as string,
          phone: req.query.cell as string,
          incoming: true
        })
        try {
          com.message = unescape(com.message).trim()
          com.volunteer = await remult
            .repo(Helpers)
            .findFirst({ phone: new Phone(com.phone) })
          if (!com.volunteer) {
            let p = '+972' + com.phone.substring(1)
            com.volunteer = await remult
              .repo(Helpers)
              .findFirst({ phone: new Phone(p) })
          }

          if (com.volunteer) {
            remult.user = {
              id: com.volunteer.id,
              name: com.volunteer.name,
              roles: [],
              distributionCenter: undefined,
              escortedHelperName: undefined,
              theHelperIAmEscortingId: undefined
            }
            if (com.message == 'כן' || com.message == 'לא') {
              let previousMessage = await comRepo.findFirst(
                { volunteer: com.volunteer },
                {
                  orderBy: { createDate: 'desc' }
                }
              )
              if (previousMessage && previousMessage.eventId) {
                let e = await remult.repo(Event).findId(previousMessage.eventId)
                if (e?.eventStatus == eventStatus.active) {
                  let v = await remult.repo(volunteersInEvent).findFirst({
                    eventId: previousMessage.eventId,
                    helper: com.volunteer
                  })
                  if (v) {
                    switch (com.message) {
                      case 'כן':
                        v.confirmed = true
                        v.canceled = false
                        com.automaticAction = 'אישר הגעה לאירוע'
                        await v.save()
                        break
                      case 'לא':
                        v.canceled = true
                        com.automaticAction += 'ביטל הגעה לאירוע'
                        await v.save()
                        break
                    }
                  }
                }
              }
            }

            if (com.message == 'הסר') {
              await com.volunteer.getHelper().then(async (h) => {
                h.doNotSendSms = true
                await h.save()
              })
              com.automaticAction = 'הוסר מרשימת הSMS'
            }
          }
        } catch (err) {
          console.error(err)
          com.apiResponse = { ...com.apiResponse, err }
        }

        await com.save()
      }
      res.send('thanks')
    } catch (err) {
      res.statusCode = 404
      res.send(err)
    }
  })

  app.get('', api.withRemult, (req, res) => {
    sendIndex(res, req)
  })

  app.get('/index.html', api.withRemult, (req, res) => {
    sendIndex(res, req)
  })
  app.use(express.static(publicRoot))

  app.use('/*', api.withRemult, async (req, res) => {
    await sendIndex(res, req)
  })

  //await downloadPaperTrailLogs();

  let port = process.env.PORT || 3000
  app.listen(port)
})
//
export interface monitorResult {
  totalFamilies: number
  name: string
  familiesInEvent: number
  dbConnections: number
  deliveries: number
  onTheWay: number
  helpers: number
}

async function downloadPaperTrailLogs() {
  try {
    var myHeaders = new fetch.Headers()
    myHeaders.append('X-Papertrail-Token', process.env.PaperTrailToken)

    var requestOptions = {
      method: 'GET',
      headers: myHeaders
    }

    var t = new PromiseThrottle(50)
    for (let day = 1; day < 28; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const theTime =
          '2022-02-' +
          day.toString().padStart(2, '0') +
          '-' +
          hour.toString().padStart(2, '0')
        const file = 'c:\\fbd\\temp\\' + theTime + '.tsv.gz'
        if (!fs.existsSync(file)) {
          console.log('fetch', theTime)
          await t.push(
            fetch
              .default(
                'https://papertrailapp.com/api/v1/archives/' +
                  theTime +
                  '/download',
                requestOptions
              )
              .then(async (response) =>
                fs.writeFileSync(file, await response.buffer())
              )
              .then((result) => console.log('done', theTime))
              .catch((error) => console.log('error ' + theTime, error))
          )
          await new Promise((res) =>
            setTimeout(() => {
              res({})
            }, 350)
          )
        } else console.log(theTime, 'exists')
      }
    }
    await t.done()
    console.log('DONE ')
  } catch (err) {
    console.error(err)
  }
}
function registerImageUrls(app, api: RemultExpressServer, sitePrefix: string) {
  app.use(
    sitePrefix + '/assets/apple-touch-icon.png',
    api.withRemult,
    async (req, res) => {
      try {
        let imageBase = (await ApplicationImages.getAsync())
          .base64PhoneHomeImage
        res.contentType('png')
        if (imageBase) {
          res.send(Buffer.from(imageBase, 'base64'))
          return
        }
      } catch (err) {}
      try {
        res.send(fs.readFileSync(publicRoot + '/assets/apple-touch-icon.png'))
      } catch (err) {
        res.statusCode = 404
        res.send(err)
      }
    }
  )
  let key = ''
  app.get('/guest/dump', api.withRemult, async (req, res: express.Response) => {
    if (remult.isAllowed(Roles.overview)) {
      key = randomUUID()
      console.log("begin dump")
      console.time("dump")
      //heapdump.writeSnapshot('./test.heapsnapshot')
      console.timeEnd("dump")
      res.send(key)
    } else res.send('not cool!!!')
  })
  app.get('/guest/download', (req: express.Request, res: express.Response) => {
    if (req.query.key == key) res.sendFile(process.cwd() + '/test.heapsnapshot')
    else res.send('not cool!!!')
  })
  app.use('/guest/favicon.ico', async (req, res) => {
    try {
      res.send(fs.readFileSync(publicRoot + '/favicon.ico'))
    } catch {
      res.send(fs.readFileSync(publicRoot + '/assets/favicon.ico'))
    }
  })
  app.use(sitePrefix + '/favicon.ico', api.withRemult, async (req, res) => {
    try {
      res.contentType('ico')
      let imageBase = (await ApplicationImages.getAsync()).base64Icon
      if (imageBase) {
        res.send(Buffer.from(imageBase, 'base64'))
        return
      }
    } catch (err) {}
    try {
      res.send(fs.readFileSync(publicRoot + '/favicon.ico'))
    } catch (err) {
      res.statusCode = 404
      res.send(err)
    }
  })
}

function test<t = never>(what: (a: t, b: number) => void) {}

test<any>((a, b) => {
  a.toString()
})

declare type initRemultContextInfo = {
  url: string
  origin: string
  referer: string
}

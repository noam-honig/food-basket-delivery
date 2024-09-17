//import { CustomModuleLoader } from '../../radweb/src/app/server/CustomModuleLoader';
//let moduleLoader = new CustomModuleLoader('/out-tsc/server-test/radweb/projects');
import { remult, Remult, SqlDatabase } from 'remult'
import './app/manage/ApplicationSettings'
import 'jasmine'
import { AsignFamilyComponent } from './app/asign-family/asign-family.component'
import { Roles } from './app/auth/roles'
import { HelpersAndStats } from './app/delivery-follow-up/HelpersAndStats'
import { DeliveryStatus } from './app/families/DeliveryStatus'
import { Families } from './app/families/families'
import {
  UpdateArea,
  UpdateAreaForDeliveries,
  UpdateStatus,
  UpdateStatusForDeliveries
} from './app/families/familyActions'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from './app/families/FamilyDeliveries'
import { FamilyStatus } from './app/families/FamilyStatus'
import {
  DeleteDeliveries,
  UpdateDeliveriesStatus
} from './app/family-deliveries/family-deliveries-actions'
import { Helpers } from './app/helpers/helpers'
import { ApplicationSettings } from './app/manage/ApplicationSettings'
import { initSettings, serverInit } from './app/server/serverInit'
import { GeocodeInformation } from './app/shared/googleApiHelpers'
import { fitAsync, itAsync } from './app/shared/test-helper'
import { Sites } from './app/sites/sites'
import { DistributionCenters } from './app/manage/distribution-centers'
import { Phone } from './app/model-shared/phone'
import { AuthService } from './app/auth/auth-service'
import { actionInfo } from 'remult/internals'
import { InitContext } from './app/helpers/init-context'
import { AsignFamilyController } from './app/asign-family/asign-family.controller'
import { getDb } from './app/model-shared/SqlBuilder'
import { columnOrderAndWidthSaver } from './app/common-ui-elements/interfaces'
initSettings.disableSchemaInit = true

function init() {
  let helperWhoIsAdmin: Helpers

  actionInfo.runningOnServer = true

  let sql: SqlDatabase

  beforeAll((done) => {
    InitContext(remult).then(() => {
      serverInit().then(async (x) => {
        if (initSettings.disableSchemaInit) {
          //SqlDatabase.LogToConsole = true;
        }
        let dp = Sites.getDataProviderForOrg('test')
        sql = <any>dp
        remult.dataProvider = dp

        done()
      })
    })
  })

  describe('helpers', () => {
    itAsync('helpers and stats work', async () => {
      let h = await remult.repo(HelpersAndStats).find()
    })
  })
  describe('the test', () => {
    beforeEach(async (done) => {
      for (const r of [Families, FamilyDeliveries, Helpers].map(
        (x: any) => remult.repo(x).metadata.key
      )) {
        await getDb().execute('delete from ' + r)
      }

      let as = await ApplicationSettings.getAsync()
      {
        let g = new GeocodeInformation({
          status: 'OK',
          results: [
            {
              address_components: [],
              formatted_address: '',
              partial_match: false,
              place_id: '123',
              types: [],
              geometry: {
                location: { lat: 0, lng: 0 },
                location_type: '',
                viewport: {
                  northeast: { lat: 0, lng: 0 },
                  southwest: { lat: 0, lng: 0 }
                }
              }
            }
          ]
        })
        as.addressApiResult = g.saveToString()
        await as.save()
      }
      let h = remult.repo(Helpers).create()
      h.name = 'a'
      h._disableOnSavingRow = true
      h.admin = true
      await h.save()
      helperWhoIsAdmin = h
      remult.user = {
        id: helperWhoIsAdmin.id,
        name: 'admin',
        roles: [Roles.admin, Roles.distCenterAdmin],
        distributionCenter: undefined,
        escortedHelperName: undefined,
        theHelperIAmEscortingId: undefined
      }
      await InitContext(remult)
      done()
    })
    async function callAddBox(num = 1) {
      return await AsignFamilyController.AddBox(helperWhoIsAdmin, null, null, {
        allRepeat: false,
        area: '',
        city: '',
        group: '',
        numOfBaskets: num,
        preferRepeatFamilies: false
      })
    }
    async function createDelivery(distanceFromRoot: number) {
      let d = remult.repo(ActiveFamilyDeliveries).create()
      d.internalDeliveryComment = distanceFromRoot.toString()
      d.addressLatitude = distanceFromRoot
      d.family = distanceFromRoot.toString()
      await d.save()
      return d
    }

    itAsync('Starts with farthest delivery', async () => {
      await createDelivery(10)
      await createDelivery(5)
      let r = await callAddBox()
      const families = await remult.repo(ActiveFamilyDeliveries).find({
        orderBy: {
          routeOrder: 'asc'
        }
      })
      expect(families.length).toBe(1)
      expect(families[0].internalDeliveryComment).toBe('10')
    })
    itAsync('chooses closest to previous delivery', async () => {
      await createDelivery(10)
      await createDelivery(5)
      let d = await createDelivery(6)
      d.courier = helperWhoIsAdmin
      await d.save()
      expect(
        await remult.repo(ActiveFamilyDeliveries).count({ courier: null })
      ).toBe(2)
      let r = await callAddBox()
      const families = await remult.repo(ActiveFamilyDeliveries).find({
        orderBy: {
          routeOrder: 'asc'
        }
      })
      expect(families.length).toBe(2)

      expect(
        families.some((d) => d.internalDeliveryComment == '6')
      ).toBeTruthy()
      expect(
        families.some((d) => d.internalDeliveryComment == '5')
      ).toBeTruthy()
    })
    itAsync('chooses closest to previous delivery2', async () => {
      await createDelivery(0)
      await createDelivery(7)
      await createDelivery(5)
      await createDelivery(8)
      await createDelivery(10)
      let d = await createDelivery(6)
      d.courier = helperWhoIsAdmin
      await d.save()
      expect(
        await remult.repo(ActiveFamilyDeliveries).count({ courier: null })
      ).toBe(5)
      let r = await callAddBox(3)
      const families = await remult.repo(ActiveFamilyDeliveries).find({
        orderBy: {
          routeOrder: 'asc'
        }
      })
      expect(families.length).toBe(4)

      expect(
        families.some((d) => d.internalDeliveryComment == '6')
      ).toBeTruthy()
      expect(
        families.some((d) => d.internalDeliveryComment == '5')
      ).toBeTruthy()
      expect(
        families.some((d) => d.internalDeliveryComment == '7')
      ).toBeTruthy()
      expect(
        families.some((d) => d.internalDeliveryComment == '8')
      ).toBeTruthy()
    })
    itAsync('chooses closest to helper', async () => {
      await createDelivery(10)
      await createDelivery(5)

      helperWhoIsAdmin.addressApiResult = new GeocodeInformation({
        status: 'OK',
        results: [
          {
            address_components: [],
            formatted_address: '',
            partial_match: false,
            place_id: '123',
            types: [],
            geometry: {
              location: { lat: 6, lng: 0 },
              location_type: '',
              viewport: {
                northeast: { lat: 0, lng: 0 },
                southwest: { lat: 0, lng: 0 }
              }
            }
          }
        ]
      }).saveToString()
      remult.clearAllCache()
      helperWhoIsAdmin._disableOnSavingRow = true
      await helperWhoIsAdmin.save()

      let r = await callAddBox()
      const families = await remult.repo(ActiveFamilyDeliveries).find({
        orderBy: {
          routeOrder: 'asc'
        }
      })
      expect(families.length).toBe(1)

      expect(families[0].internalDeliveryComment).toBe('5')
    })
    itAsync('prefer repeat family', async () => {
      await createDelivery(10)

      let d = await createDelivery(5)
      d.deliverStatus = DeliveryStatus.Success
      d.courier = helperWhoIsAdmin
      await d.save()
      await createDelivery(5)
      let r = await callAddBox()
      const families = await remult.repo(ActiveFamilyDeliveries).find({
        orderBy: {
          routeOrder: 'asc'
        }
      })
      expect(families.length).toBe(1)
      expect(families[0].internalDeliveryComment).toBe('5')
    })
    itAsync('prefer repeat family over helper preference', async () => {
      await createDelivery(10)

      let d = await createDelivery(5)
      d.deliverStatus = DeliveryStatus.Success
      d.courier = helperWhoIsAdmin
      await d.save()
      await createDelivery(5)

      helperWhoIsAdmin.addressApiResult = new GeocodeInformation({
        status: 'OK',
        results: [
          {
            address_components: [],
            formatted_address: '',
            partial_match: false,
            place_id: '123',
            types: [],
            geometry: {
              location: { lat: 9, lng: 0 },
              location_type: '',
              viewport: {
                northeast: { lat: 0, lng: 0 },
                southwest: { lat: 0, lng: 0 }
              }
            }
          }
        ]
      }).saveToString()
      await helperWhoIsAdmin.save()

      let r = await callAddBox()
      const families = await remult.repo(ActiveFamilyDeliveries).find({
        orderBy: {
          routeOrder: 'asc'
        }
      })
      expect(families.length).toBe(1)
      expect(families[0].internalDeliveryComment).toBe('5')
    })
  })
  describe('test update family status', () => {
    beforeEach(async (done) => {
      for (const d of await remult.repo(FamilyDeliveries).find()) {
        await d.delete()
      }
      for (const f of await remult.repo(Families).find()) {
        await f.delete()
      }
      for (const f of await remult.repo(Helpers).find()) {
        await f.delete()
      }
      for (const f of await remult.repo(DistributionCenters).find()) {
        await f.delete()
      }
      await remult
        .repo(DistributionCenters)
        .create({ id: '', name: 'stam' })
        .save()
      done()
    })
    itAsync('update status, updatesStatus and deletes delivery', async () => {
      let f = await remult.repo(Families).create()
      f.name = 'test'
      await f.save()

      let fd = f.createDelivery(null)
      fd.deliverStatus = DeliveryStatus.FailedBadAddress
      await fd.save()

      let fd2 = f.createDelivery(null)
      fd2.deliverStatus = DeliveryStatus.FailedBadAddress
      await fd2.save()

      expect(
        +(await remult.repo(ActiveFamilyDeliveries).count({ family: f.id }))
      ).toBe(2)

      let b = new UpdateStatusForDeliveries()
      let u = b.orig as UpdateStatus
      u.status = FamilyStatus.Frozen
      u.archiveFinshedDeliveries = true

      await b.internalForTestingCallTheServer({
        count: 1,
        where: { id: fd.id }
      })
      await f._.reload()

      let fd_after = await remult.repo(FamilyDeliveries).findId(fd.id)
      expect(fd_after.archive).toBe(true, 'fd')
      let fd2_after = await remult.repo(FamilyDeliveries).findId(fd2.id)
      expect(fd2_after.archive).toBe(true, 'fd2')
    })
    itAsync('update status for delivery', async () => {
      let f = await remult.repo(Families).create()
      f.name = 'test'
      await f.save()
      let fd = f.createDelivery(null)
      await fd.save()

      expect(
        +(await remult.repo(ActiveFamilyDeliveries).count({ id: fd.id }))
      ).toBe(1)
      let u = new UpdateDeliveriesStatus()

      u.status = DeliveryStatus.Frozen

      await u.internalForTestingCallTheServer({
        count: 1,
        where: { id: fd.id }
      })
      let fd_after = await remult.repo(ActiveFamilyDeliveries).findId(fd.id)
      expect(fd_after.deliverStatus).toBe(DeliveryStatus.Frozen, 'fd')
    })
    itAsync('update area for family', async () => {
      let f = await remult.repo(Families).create()
      f.name = 'test'
      await f.save()

      let u = new UpdateArea()

      u.area = 'north'

      await u.internalForTestingCallTheServer({
        count: 1,
        where: { id: f.id }
      })
      let fd_after = await remult.repo(Families).findId(f.id)
      expect(fd_after.area).toBe('north')
    })
    itAsync('update area', async () => {
      let f = await remult.repo(Families).create()
      f.name = 'test'
      await f.save()
      let fd = f.createDelivery(null)
      await fd.save()

      let b = new UpdateAreaForDeliveries()
      let u = b.orig as UpdateArea
      u.area = 'north'

      await b.internalForTestingCallTheServer({
        count: 1,
        where: { id: fd.id }
      })

      let fd_after = await remult.repo(FamilyDeliveries).findId(fd.id)
      expect(fd_after.area).toBe('north', 'fd')
    })
    itAsync('test Action Where', async () => {
      let f = await remult.repo(Families).create()
      f.name = 'test'
      await f.save()
      let fd = f.createDelivery(null)
      fd.deliverStatus = DeliveryStatus.Success
      await fd.save()
      var u = new DeleteDeliveries()
      await u.internalForTestingCallTheServer({
        count: 0,
        where: undefined
      })
      expect(+(await remult.repo(FamilyDeliveries).count())).toBe(1)
      fd.deliverStatus = DeliveryStatus.ReadyForDelivery
      await fd.save()
      await u.internalForTestingCallTheServer({
        count: 1,
        where: undefined
      })
      expect(+(await remult.repo(FamilyDeliveries).count())).toBe(0)
    })
    itAsync('test delete only works for user dist center', async () => {
      let f = await remult.repo(Families).create()
      f.name = 'test'
      await f.save()
      let a = await remult
        .repo(DistributionCenters)
        .create({
          id: 'a',
          name: 'a'
        })
        .save()

      let d = await f.createDelivery(a).save()
      expect(d.distributionCenter.name).toBe('a')
    })
    it('test delete only works for user dist center', async () => {
      let f = await remult.repo(Families).create()
      f.name = 'test'
      await f.save()
      let a = await remult
        .repo(DistributionCenters)
        .create({
          id: 'a',
          name: 'a'
        })
        .save()
      let b = await remult
        .repo(DistributionCenters)
        .create({
          id: 'b',
          name: 'b'
        })
        .save()
      await f.createDelivery(a).save()
      await f.createDelivery(a).save()
      await f.createDelivery(b).save()
      let distAdmin = await remult
        .repo(Helpers)
        .create({
          id: 'distCenterAdmin',
          name: 'distCenterAdmin',
          distributionCenter: b,
          phone: new Phone('1234')
        })
        .save()

      remult.user = {
        id: distAdmin.id,
        name: 'distCenterAdmin',
        distributionCenter: 'b',
        escortedHelperName: undefined,
        theHelperIAmEscortingId: undefined,
        roles: [Roles.distCenterAdmin]
      }
      remult.clearAllCache()
      await InitContext(remult)

      expect(+(await remult.repo(ActiveFamilyDeliveries).count())).toBe(3)
      var u = new DeleteDeliveries()
      await u.internalForTestingCallTheServer({
        count: 1,
        where: {}
      })
      expect(+(await remult.repo(ActiveFamilyDeliveries).count())).toBe(2)
    })
  })
}
init()

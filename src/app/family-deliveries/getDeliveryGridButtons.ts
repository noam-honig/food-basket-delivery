import { Roles } from '../auth/roles'
import { GridSettings, RowButton } from '../common-ui-elements/interfaces'
import {
  FamilyDeliveries,
  ActiveFamilyDeliveries,
  DeliveryChanges
} from '../families/FamilyDeliveries'
import {
  canSendWhatsapp,
  Families,
  sendWhatsappToFamily
} from '../families/families'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { getLang } from '../sites/sites'
import { UITools } from '../helpers/init-context'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { remult } from 'remult'

export interface deliveryButtonsHelper {
  ui: UITools
  settings: ApplicationSettings
  refresh: () => void
  deliveries: () => GridSettings<FamilyDeliveries>
  showAllBeforeNew?: boolean
}
export function getDeliveryGridButtons(
  args: deliveryButtonsHelper
): RowButton<ActiveFamilyDeliveries>[] {
  let newDelivery: (d: FamilyDeliveries) => void = async (d) => {
    let f = await remult.repo(Families).findId(d.family)

    if (args.showAllBeforeNew) {
      f.showDeliveryHistoryDialog({
        settings: args.settings,
        ui: args.ui
      })
      return
    }

    await f.showNewDeliveryDialog(args.ui, args.settings, {
      copyFrom: d,
      aDeliveryWasAdded: async (newDeliveryId) => {
        if (args.settings.isSytemForMlt) {
          if (d.deliverStatus.isProblem) {
            let newDelivery = await remult
              .repo(ActiveFamilyDeliveries)
              .findId(newDeliveryId)
            for (const otherFailedDelivery of await remult
              .repo(ActiveFamilyDeliveries)
              .find({
                where: {
                  family: newDelivery.family,
                  deliverStatus: DeliveryStatus.isProblem()
                }
              })) {
              await Families.addDelivery(
                otherFailedDelivery.family,
                otherFailedDelivery.basketType,
                otherFailedDelivery.distributionCenter,
                otherFailedDelivery.courier,
                {
                  quantity: otherFailedDelivery.quantity,
                  selfPickup: false,
                  comment: otherFailedDelivery.deliveryComments
                }
              )
              otherFailedDelivery.archive = true
              await otherFailedDelivery.save()
            }
          }
        }
        args.refresh()
      }
    })
  }
  return [
    {
      name: getLang().newDelivery,
      icon: 'add_shopping_cart',
      click: async (d) => {
        newDelivery(d)
      },
      visible: (d) =>
        remult.isAllowed(Roles.admin) && !d.deliverStatus.IsAResultStatus()
    },
    {
      textInMenu: () => getLang().newDelivery,
      icon: 'add_shopping_cart',
      showInLine: true,
      click: async (d) => {
        newDelivery(d)
      },
      visible: (d) =>
        remult.isAllowed(Roles.admin) && d.deliverStatus.IsAResultStatus()
    },
    {
      name: getLang().sendWhatsAppToFamily,
      click: (f) => sendWhatsappToFamily(f),
      visible: (f) => canSendWhatsapp(f),
      icon: 'textsms'
    },
    {
      textInMenu: () => getLang().assignVolunteer,
      icon: 'person_search',
      showInLine: true,
      click: async (d) => {
        await args.ui.selectHelper({
          onSelect: async (selectedHelper) => {
            d.courier = selectedHelper
            await d.save()
            var fd = await remult.repo(ActiveFamilyDeliveries).find({
              where: {
                id: { '!=': d.id },
                distributionCenter: args.ui.filterDistCenter(),
                $and: [
                  FamilyDeliveries.readyFilter(),
                  d.addressOk
                    ? {
                        addressLongitude: d.addressLongitude,
                        addressLatitude: d.addressLatitude
                      }
                    : { family: d.family }
                ]
              }
            })
            if (fd.length > 0) {
              if (
                await args.ui.YesNoPromise(
                  args.settings.lang.thereAreAdditional +
                    ' ' +
                    fd.length +
                    ' ' +
                    args.settings.lang.deliveriesAtSameAddress
                )
              ) {
                for (const f of fd) {
                  f.courier = d.courier
                  await f.save()
                }
                args.refresh()
              }
            }
          },
          location: d.getDrivingLocation()
        })
      },
      visible: (d) =>
        !d.deliverStatus.IsAResultStatus() &&
        remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang().volunteerAssignments,
      icon: 'list_alt',
      showInLine: true,
      click: async (d) => {
        await args.ui.helperAssignment(d.courier)
        args.refresh()
      },
      visible: (d) => d.courier && remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang().volunteerInfo,

      click: async (d) => {
        let h = await d.courier.getHelper()
        h.displayEditDialog(args.ui)
      },
      visible: (d) => d.courier && remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang().cancelAsignment,
      showInLine: true,
      icon: 'person_add_disabled',
      click: async (d) => {
        if (
          await args.ui.YesNoPromise(getLang().cancelAssignmentFor + d.name)
        ) {
          {
            d.courier = null
            await d.save()
          }
        }
      },
      visible: (d) =>
        d.deliverStatus == DeliveryStatus.ReadyForDelivery && d.courier
    },
    {
      name: getLang().familyDeliveries,
      click: async (fd) => {
        let f = await remult.repo(Families).findId(fd.family)
        f.showDeliveryHistoryDialog({
          settings: args.settings,
          ui: args.ui
        })
      },
      visible: (f) => !f.isNew()
    },
    {
      name: getLang().freezeDelivery,
      click: async (d) => {
        if (
          await args.ui.YesNoPromise(
            getLang().freezeDeliveryHelp + d.name + '?'
          )
        ) {
          {
            d.deliverStatus = DeliveryStatus.Frozen
            await d.save()
          }
        }
      },
      visible: (d) =>
        d.deliverStatus == DeliveryStatus.ReadyForDelivery && d.courier
    },
    {
      name: getLang().unFreezeDelivery,
      click: async (d) => {
        {
          d.deliverStatus = DeliveryStatus.ReadyForDelivery
          await d.save()
        }
      },
      visible: (d) => d.deliverStatus == DeliveryStatus.Frozen
    },
    {
      name: getLang().deleteDelivery,
      icon: 'delete',
      click: async (d) => {
        if (
          await args.ui.YesNoPromise(getLang().shouldDeleteDeliveryFor + d.name)
        ) {
          {
            let fd = await remult.repo(FamilyDeliveries).findId(d.id)
            await fd.delete()
            args
              .deliveries()
              .items.splice(args.deliveries().items.indexOf(d), 1)
          }
        }
      },
      visible: (d) =>
        !d.deliverStatus.IsAResultStatus() &&
        remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang().archiveDelivery,
      showInLine: true,
      icon: 'archive',
      click: async (d) => {
        if (await args.ui.YesNoPromise(getLang().shouldArchiveDelivery)) {
          {
            let fd = await remult.repo(FamilyDeliveries).findId(d.id)
            fd.archive = true
            await fd.save()
            args
              .deliveries()
              .items.splice(args.deliveries().items.indexOf(d), 1)
          }
        }
      },
      visible: (d) =>
        !d.archive &&
        d.deliverStatus.IsAResultStatus() &&
        remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang().sendWhatsAppToFamily,
      click: async (d) => {
        d.phone1.sendWhatsapp(getLang().hello + ' ' + d.name + ',')
      },
      visible: (d) =>
        d.phone1 &&
        remult.isAllowed(Roles.distCenterAdmin) &&
        args.settings.isSytemForMlt
    },
    {
      name: getLang().assignHistory,
      visible: (h) => remult.repo(DeliveryChanges).metadata.apiReadAllowed,
      click: (h) =>
        args.ui.gridDialog({
          title: getLang().assignHistory + ' - ' + h.name,
          settings: new GridSettings(remult.repo(DeliveryChanges), {
            numOfColumnsInGrid: 8,
            columnSettings: (x) => [
              x.courier,
              x.previousCourier,
              x.status,
              x.previousDeliveryStatus,
              x.deleted,
              x.userName,
              x.changeDate,
              x.appUrl,
              x.apiUrl
            ],
            where: {
              deliveryId: h.id
            }
          })
        })
    }
  ] as RowButton<FamilyDeliveries>[]
}

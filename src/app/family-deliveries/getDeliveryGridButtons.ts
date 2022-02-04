import { Roles } from '../auth/roles';
import { GridSettings, RowButton } from '@remult/angular/interfaces';
import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { canSendWhatsapp, Families, sendWhatsappToFamily } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { getLang } from '../sites/sites';
import { Remult } from 'remult';
import { UITools } from '../helpers/init-context';
import { ApplicationSettings } from '../manage/ApplicationSettings';


export interface deliveryButtonsHelper {
  remult: Remult,
  ui: UITools,
  settings: ApplicationSettings,
  refresh: () => void,
  deliveries: () => GridSettings<FamilyDeliveries>,
  showAllBeforeNew?: boolean
}
export function getDeliveryGridButtons(args: deliveryButtonsHelper): RowButton<ActiveFamilyDeliveries>[] {
  let newDelivery: (d: FamilyDeliveries) => void = async (d) => {
    let f = await args.remult.repo(Families).findId(d.family);

    if (args.showAllBeforeNew) {
      f.showDeliveryHistoryDialog({
        settings: args.settings,
        ui: args.ui
      });
      return;
    }

    await f.showNewDeliveryDialog(args.ui, args.settings, {
      copyFrom: d, aDeliveryWasAdded: async (newDeliveryId) => {
        if (args.settings.isSytemForMlt) {
          if (d.deliverStatus.isProblem) {
            let newDelivery = await args.remult.repo(ActiveFamilyDeliveries).findId(newDeliveryId);
            for (const otherFailedDelivery of await args.remult.repo(ActiveFamilyDeliveries).find({
              where: {
                family: newDelivery.family,
                deliverStatus: DeliveryStatus.isProblem()
              }
            })) {
              await Families.addDelivery(otherFailedDelivery.family, otherFailedDelivery.basketType, otherFailedDelivery.distributionCenter, otherFailedDelivery.courier, {
                quantity: otherFailedDelivery.quantity,
                selfPickup: false,
                comment: otherFailedDelivery.deliveryComments
              });
              otherFailedDelivery.archive = true;
              await otherFailedDelivery.save();
            }
          }
        }
        args.refresh();
      }
    });
  };
  return [
    {
      name: getLang(args.remult).newDelivery,
      icon: 'add_shopping_cart',
      click: async (d) => {
        newDelivery(d);
      },
      visible: d => args.remult.isAllowed(Roles.admin) && !d.deliverStatus.IsAResultStatus()
    },
    {
      textInMenu: () => getLang(args.remult).newDelivery,
      icon: 'add_shopping_cart',
      showInLine: true,
      click: async (d) => {
        newDelivery(d);
      },
      visible: d => args.remult.isAllowed(Roles.admin) && d.deliverStatus.IsAResultStatus()
    },
    {
      name: getLang(args.remult).sendWhatsAppToFamily,
      click: f => sendWhatsappToFamily(f, args.remult),
      visible: f => canSendWhatsapp(f),
      icon: 'textsms'
    },
    {
      textInMenu: () => getLang(args.remult).assignVolunteer,
      icon: 'person_search',
      showInLine: true,
      click: async (d) => {
        await args.ui.selectHelper({
          onSelect: async (selectedHelper) => {
            d.courier = selectedHelper;
            await d.save();
            var fd = await args.remult.repo(ActiveFamilyDeliveries).find({
              where: {
                id: { "!=": d.id },
                distributionCenter: args.ui.filterDistCenter(),
                $and: [
                  FamilyDeliveries.readyFilter(),
                  d.addressOk ?
                    {
                      addressLongitude: d.addressLongitude,
                      addressLatitude: d.addressLatitude
                    } :
                    { family: d.family }
                ]
              }
            });
            if (fd.length > 0) {
              if (await args.ui.YesNoPromise(args.settings.lang.thereAreAdditional + " " + fd.length + " " + args.settings.lang.deliveriesAtSameAddress)) {
                for (const f of fd) {
                  f.courier = d.courier;
                  await f.save();
                }
                args.refresh();
              }
            }
          }, location: d.getDrivingLocation()
        });
      },
      visible: d => !d.deliverStatus.IsAResultStatus() && args.remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.remult).volunteerAssignments,
      icon: 'list_alt',
      showInLine: true,
      click: async (d) => {

        await args.ui.helperAssignment(d.courier);
        args.refresh();



      },
      visible: d => d.courier && args.remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.remult).volunteerInfo,


      click: async (d) => {
        let h = await d.courier.getHelper();
        h.displayEditDialog(args.ui);



      },
      visible: d => d.courier && args.remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.remult).cancelAsignment,
      showInLine: true,
      icon: 'person_add_disabled',
      click: async (d) => {
        if (await args.ui.YesNoPromise(getLang(args.remult).cancelAssignmentFor + d.name)) {
          {
            d.courier = null;
            await d.save();
          }
        }
      },
      visible: d => d.deliverStatus == DeliveryStatus.ReadyForDelivery && d.courier
    },
    {
      name: getLang(args.remult).familyDeliveries,
      click: async (fd) => {
        let f = await args.remult.repo(Families).findId(fd.family);
        f.showDeliveryHistoryDialog({
          settings: args.settings,
          ui: args.ui
        });
      },
      visible: f => !f.isNew()
    },
    {
      name: getLang(args.remult).freezeDelivery,
      click: async (d) => {
        if (await args.ui.YesNoPromise(getLang(args.remult).freezeDeliveryHelp + d.name + "?")) {
          {
            d.deliverStatus = DeliveryStatus.Frozen;
            await d.save();
          }
        }
      },
      visible: d => d.deliverStatus == DeliveryStatus.ReadyForDelivery && d.courier
    },
    {
      name: getLang(args.remult).unFreezeDelivery,
      click: async (d) => {
        {
          d.deliverStatus = DeliveryStatus.ReadyForDelivery;
          await d.save();
        }
      },
      visible: d => d.deliverStatus == DeliveryStatus.Frozen
    },
    {
      name: getLang(args.remult).deleteDelivery,
      icon: 'delete',
      click: async (d) => {
        if (await args.ui.YesNoPromise(getLang(args.remult).shouldDeleteDeliveryFor + d.name)) {
          {
            let fd = await args.remult.repo(FamilyDeliveries).findId(d.id);
            await fd.delete();
            args.deliveries().items.splice(args.deliveries().items.indexOf(d), 1);
          }
        }
      },
      visible: d => !(d.deliverStatus.IsAResultStatus()) && args.remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.remult).archiveDelivery,
      showInLine: true,
      icon: 'archive',
      click: async (d) => {
        if (await args.ui.YesNoPromise(getLang(args.remult).shouldArchiveDelivery)) {
          {
            let fd = await args.remult.repo(FamilyDeliveries).findId(d.id);
            fd.archive = true;
            await fd.save();
            args.deliveries().items.splice(args.deliveries().items.indexOf(d), 1);
          }
        }
      }, visible: d => !d.archive && (d.deliverStatus.IsAResultStatus()) && args.remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.remult).sendWhatsAppToFamily,
      click: async (d) => {
        d.phone1.sendWhatsapp(args.remult, getLang(args.remult).hello + ' ' + d.name + ',');
      },
      visible: d => d.phone1 && args.remult.isAllowed(Roles.distCenterAdmin) && args.settings.isSytemForMlt
    }
  ] as RowButton<FamilyDeliveries>[];
}

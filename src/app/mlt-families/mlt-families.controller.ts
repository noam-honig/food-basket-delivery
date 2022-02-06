import { Component, Input, OnInit } from '@angular/core';
import { BusyService, openDialog } from '@remult/angular';
import { Remult, BackendMethod, Allow } from 'remult';
import { Roles } from '../auth/roles';
import { EditCommentDialogComponent } from '../edit-comment-dialog/edit-comment-dialog.component';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';

import { DeliveryInList, HelperFamiliesController } from '../helper-families/helper-families.controller';
import { HelperGifts } from '../helper-gifts/HelperGifts';
import { MyGiftsDialogComponent } from '../helper-gifts/my-gifts-dialog.component';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { DistributionCenters } from '../manage/distribution-centers';
import { MyFamiliesComponent } from '../my-families/my-families.component';
import { SelectListComponent } from '../select-list/select-list.component';
import { DialogService } from '../select-popup/dialog';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { getCurrentLocation, GetDistanceBetween, Location } from '../shared/googleApiHelpers';
import { use } from '../translate';


export class MltFamiliesController {
    @BackendMethod({ allowed: Roles.indie })
    static async assignFamilyDeliveryToIndie(deliveryIds: string[], remult?: Remult) {
        for (const id of deliveryIds) {

            let fd = await remult.repo(ActiveFamilyDeliveries).findId(id);
            if (fd.courier && fd.deliverStatus == DeliveryStatus.ReadyForDelivery) {//in case the delivery was already assigned to someone else
                fd.courier = (await remult.getCurrentUser());
                await fd.save();
            }
        }
    }
    @BackendMethod({ allowed: Allow.authenticated })
  static async changeDestination(newDestinationId: DistributionCenters, remult?: Remult) {
    let s = (await remult.getSettings());
    if (!s.isSytemForMlt)
      throw "not allowed";
    for (const fd of await remult.repo(ActiveFamilyDeliveries).find({ where: { courier: (await remult.getCurrentUser()) } })) {
      fd.distributionCenter = newDestinationId;
      await fd.save();
    }
  }
}
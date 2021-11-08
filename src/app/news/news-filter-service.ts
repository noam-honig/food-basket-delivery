import { Injectable } from '@angular/core';

import { NewsFilter } from './news.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';


import { DeliveryStatus } from '../families/DeliveryStatus';
import { FamilySources } from '../families/FamilySources';
import { EntityFilter } from 'remult';
@Injectable()
export class NewsFilterService {
    constructor(private settings: ApplicationSettings) {

    }
    setToNeedsWork() {
        this.currentFilter = this.filters[2];
    }
    filters: NewsFilter[] = [{
        name: this.settings.lang.allNew,
        where: { archive: false }

    },
    {
        name: this.settings.lang.problemsThatRequireFollowup,
        where: { deliverStatus: DeliveryStatus.isProblem(), needsWork: true }
    },
    {
        name: this.settings.lang.requireFollowUp,
        where: { needsWork: true }
    }, {
        name: this.settings.lang.problems,
        where: { deliverStatus: DeliveryStatus.isProblem(), archive: false }
    }, {
        name: this.settings.lang.commentsWrittenByVolunteers,
        where: {
            courierComments: { "!=": '' },
            deliverStatus: DeliveryStatus.isAResultStatus(),
            archive: false
        }
    }];
    currentFilter: NewsFilter = this.filters[0];
    currentFamilySource: FamilySources = undefined;
    where(): EntityFilter<ActiveFamilyDeliveries> {
        return {
            familySource: this.currentFamilySource ? this.currentFamilySource : undefined,
            $and: [this.currentFilter.where]
        };
    }
}

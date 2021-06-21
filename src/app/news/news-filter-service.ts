import { Injectable } from '@angular/core';

import { NewsFilter } from './news.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { FilterFactories } from '@remult/core';

import { DeliveryStatus } from '../families/DeliveryStatus';
import { FamilySources } from '../families/FamilySources';
@Injectable()
export class NewsFilterService {
    constructor(private settings: ApplicationSettings) {

    }
    setToNeedsWork() {
        this.currentFilter = this.filters[2];
    }
    filters: NewsFilter[] = [{
        name: this.settings.lang.allNew,
        where: f => f.archive.isEqualTo(false)

    },
    {
        name: this.settings.lang.problemsThatRequireFollowup,
        where: f => DeliveryStatus.isProblem(f.deliverStatus).and(f.needsWork.isEqualTo(true))
    },
    {
        name: this.settings.lang.requireFollowUp,
        where: f => f.needsWork.isEqualTo(true)
    }, {
        name: this.settings.lang.problems,
        where: f => DeliveryStatus.isProblem(f.deliverStatus).and(f.archive.isEqualTo(false))
    }, {
        name: this.settings.lang.commentsWrittenByVolunteers,
        where: f => f.courierComments.isDifferentFrom('').and(DeliveryStatus.isAResultStatus(f.deliverStatus)).and(f.archive.isEqualTo(false))
    }];
    currentFilter: NewsFilter = this.filters[0];
    currentFamilySource: FamilySources = undefined;
    where(n: FilterFactories<ActiveFamilyDeliveries>) {
        if (this.currentFamilySource) {
            if (this.currentFilter.where)
                return n.familySource.isEqualTo(this.currentFamilySource).and(this.currentFilter.where(n));
            else
                return n.familySource.isEqualTo(this.currentFamilySource);
        }
        if (this.currentFilter.where)
            return this.currentFilter.where(n);
        return undefined;
    }
}

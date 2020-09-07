import { Injectable } from '@angular/core';

import { NewsFilter } from './news.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
@Injectable()
export class NewsFilterService {
    constructor(private settings:ApplicationSettings){

    }
    setToNeedsWork() {
        this.currentFilter = this.filters[2];
    }
    filters: NewsFilter[] = [{
        name: this.settings.lang.allNew,
        where:f=>f.archive.isEqualTo(false)

    },
    {
        name: this.settings.lang.problemsThatRequireFollowup,
        where: f => f.deliverStatus.isProblem().and(f.needsWork.isEqualTo(true))
    },
    {
        name: this.settings.lang.requireFollowUp,
        where: f => f.needsWork.isEqualTo(true)
    }, {
        name: this.settings.lang.problems,
        where: f => f.deliverStatus.isProblem().and(f.archive.isEqualTo(false))
    }, {
        name: this.settings.lang.commentsWrittenByVolunteers,
        where: f => f.courierComments.isDifferentFrom('').and(f.deliverStatus.isAResultStatus()).and(f.archive.isEqualTo(false))
    }];
    currentFilter: NewsFilter = this.filters[0];
    currentFamilySource: string = undefined;
    where(n: ActiveFamilyDeliveries) {
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

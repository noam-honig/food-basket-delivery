import { Injectable } from '@angular/core';

import { NewsFilter } from './news.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
@Injectable()
export class NewsFilterService {
    setToNeedsWork() {
        this.currentFilter = this.filters[2];
    }
    filters: NewsFilter[] = [{
        name: 'כל החדשות'
    },
    {
        name: 'בעיות הצריכות טיפול',
        where: f => f.deliverStatus.isProblem().and(f.needsWork.isEqualTo(true))
    },
    {
        name: 'כל הצריך טיפול',
        where: f => f.needsWork.isEqualTo(true)
    }, {
        name: 'בעיות',
        where: f => f.deliverStatus.isProblem()
    }, {
        name: 'הערות',
        where: f => f.courierComments.isDifferentFrom('').and(f.deliverStatus.isAResultStatus())
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

import { Injectable } from '@angular/core';
import { NewsUpdate } from "./NewsUpdate";
import { NewsFilter } from './news.component';
@Injectable()
export class NewsFilterService {
    filters: NewsFilter[] = [{
        name: 'כל החדשות'
    },
    {
        name: 'בעיות הצריכות טיפול',
        where: f => f.deliverStatus.isProblem().and(f.updateType.isEqualTo(1)).and(f.needsWork.isEqualTo(true))
    },
    {
        name: 'כל הצריך טיפול',
        where: f => f.updateType.isEqualTo(1).and(f.needsWork.isEqualTo(true))
    }, {
        name: 'בעיות',
        where: f => f.deliverStatus.isProblem().and(f.updateType.isEqualTo(1))
    }, {
        name: 'הערות',
        where: f => f.courierComments.isDifferentFrom('').and(f.updateType.isEqualTo(1).and(f.deliverStatus.isAResultStatus()))
    }];
    currentFilter: NewsFilter = this.filters[0];
    currentFamilySource: string = undefined;
    where(n: NewsUpdate) {
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

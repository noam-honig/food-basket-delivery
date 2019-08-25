import { Helpers } from '../helpers/helpers';
import { FilterBase } from 'radweb';

export interface SelectServiceInterface {
    selectHelper(ok: (selectedValue: Helpers) => void, filter?: (helper: Helpers) => FilterBase);
    updateGroup(group: string, ok: (s: string) => void);
}
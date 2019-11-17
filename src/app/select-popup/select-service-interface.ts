import { Helpers, HelpersBase } from '../helpers/helpers';
import { FilterBase } from '@remult/core';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';

export interface SelectServiceInterface {
    selectHelper(ok: (selectedValue: HelpersBase) => void, filter?: (helper: HelpersAndStats) => FilterBase);
    updateGroup(group: string, ok: (s: string) => void);
}
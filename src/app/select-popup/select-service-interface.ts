import { Helpers } from '../helpers/helpers';

export interface SelectServiceInterface{
    selectHelper(ok: (selectedValue: Helpers) => void);
}
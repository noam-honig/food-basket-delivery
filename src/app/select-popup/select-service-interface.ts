import { Helpers } from "../models";

export interface SelectServiceInterface{
    selectHelper(ok: (selectedValue: Helpers) => void);
}
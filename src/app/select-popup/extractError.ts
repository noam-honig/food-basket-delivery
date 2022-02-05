export function extractError(err: any) {
    if (typeof err === "string")
        return err;
    if (err.modelState) {
        if (err.message)
            return err.message;
        for (const key in err.modelState) {
            if (err.modelState.hasOwnProperty(key)) {
                const element = err.modelState[key];
                return key + ": " + element;

            }
        }
    }
    if (err.rejection)
        return extractError(err.rejection); //for promise failed errors and http errors
    if (err.message) {
        let r = err.message;
        if (err.error && err.error.message)
            r = err.error.message;
        return r;
    }
    if (err.error)
        return extractError(err.error);


    return JSON.stringify(err);
}

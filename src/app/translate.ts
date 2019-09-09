var special = false;

export function translate(s: string) {
    if (!special)
        return s;
    return s.replace(/משפחות/g,"חיילים");

}
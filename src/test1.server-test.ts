import "jasmine";
import { itAsync } from "./app/shared/test-helper";

describe("the test",()=>{
    it("test it",()=>{
        expect(1).toBe(1);
    });
    itAsync("async",async()=>{

        expect(1).toBe(1);
    });
});
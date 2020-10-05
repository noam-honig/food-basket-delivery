export function itAsync(name: string, what: () => Promise<void>) {
    it("testing basics", async done => {
        try {
            await what();
            done();
        }
        catch (err) {
            done.fail(err);
        }
    });
}
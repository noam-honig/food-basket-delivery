export function itAsync(name: string, what: () => Promise<void>) {
  it(name, async (done) => {
    try {
      await what()
      done()
    } catch (err) {
      done.fail(err)
    }
  })
}
export function fitAsync(name: string, what: () => Promise<void>) {
  fit(name, async (done) => {
    try {
      await what()
      done()
    } catch (err) {
      done.fail(err)
    }
  })
}

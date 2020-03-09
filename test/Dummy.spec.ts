import { test } from "../src/Dummy"

describe("Dummy", () => {
    it("should return \"test\"", () => {
        expect(test()).toBe("test")
    })
})

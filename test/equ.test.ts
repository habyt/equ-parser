import { parse } from "../src/equ"

const example = `name.first[eq:"foo"|eq:"bar"]|email[ct:"foo",ct:"bar"],age[(gt:4.5,lt:-10)|eq:15]`

describe("equ", () => {
    it("should parse a string to its RPN representation", () => {
        const result = parse(example)

        expect(result).toMatchSnapshot()
    })
})

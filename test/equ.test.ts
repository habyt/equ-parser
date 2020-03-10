import { parse } from "../src/equ"

const example = `name.first[eq:"foo"|eq:"bar"]|email[ct:"foo",ct:"bar"],age[(gt:4.5,lt:-10)|eq:15]`

describe("equ", () => {
    it("should parse a string to its RPN representation", () => {
        const result = parse(example)

        expect(result).toMatchSnapshot()
    })

    it("should parse new operators with booleans", () => {
        const result = parse("path[ex:true],path2[ex:false]")

        expect(result).toMatchSnapshot()
    })

    it("should throw an error on parsing ex operator without a boolean", () => {
        expect(() => parse("path[ex:1]")).toThrowErrorMatchingSnapshot()
    })
})

import { lex } from "../src/lexer"

const example = `name.first[eq:"foo"|eq:"bar"]|email[ct:"foo",ct:"bar"],age[(gt:4.5,lt:-10)|eq:15]`

describe("lexer", () => {
    it("should lex the example correctly", () => {
        const result = lex(example)

        expect(result).toMatchSnapshot()
    })

    it("should throw an EQUParsingError on error", () => {
        // expect(() => lex("ioi[")).toThrow()
    })
})

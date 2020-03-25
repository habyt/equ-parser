import { lex } from "../src/lexer"

const example = `name.first[eq:"foo"|eq:"bar"]|email[ct:"foo",ct:"bar"],age[(gt:4.5,lt:-10)|eq:15]`

describe("lexer", () => {
    it("should lex the example correctly", () => {
        const result = lex(example)

        expect(result).toMatchSnapshot()
    })

    it("should throw an EQUParsingError on error", () => {
        expect(() => lex("ioi[")).toThrowErrorMatchingSnapshot()
    })

    it("should throw a parsing error on unended string values", () => {
        expect(() => lex(`path[eq:"asd`)).toThrowErrorMatchingSnapshot()
    })

    it("should lex booleans correctly", () => {
        const result = lex(`path[ex:true],path2[ex:false]`)

        expect(result).toMatchSnapshot()
    })

    it("should lex bundles correctly", () => {
        const result = lex(`(path[eq:"asd"],path2[eq:"bdf"])`)

        expect(result).toMatchSnapshot()
    })

    it("should lex expression bundles correctly", () => {
        const result = lex(`path[eq:"asd"|gt:"asdf",lt:"asdf"]`)

        expect(result).toMatchSnapshot()
    })

    it("should throw an error if the path is missing", () => {
        expect(() => lex("[")).toThrowErrorMatchingSnapshot()
    })

    it("should throw an error on missing start filters", () => {
        expect(() => lex("as")).toThrowErrorMatchingSnapshot()
    })

    it("should throw an error on missing filterIs", () => {
        expect(() => lex("as[eq]")).toThrowErrorMatchingSnapshot()
    })

    it("should throw an error on an invalid filter value", () => {
        expect(() => lex("as[eq:[]")).toThrowErrorMatchingSnapshot()
    })

    it("should correctly parse esacpe sequences", () => {
        const result = lex(`path[eq:"string with \\\\ in it and also \\""]`)

        expect(result).toMatchSnapshot()
    })

    it("should throw an error on an invalid escape sequence", () => {
        expect(() => lex(`path[eq:"\\s"]`)).toThrowErrorMatchingSnapshot()
    })

    it("should throw an error on an invalid number", () => {
        expect(() => lex("path[eq:.12.12]")).toThrowErrorMatchingSnapshot()
    })

    it("should throw an error on invalid combinator", () => {
        expect(() =>
            lex("path[eq:123]:path[eq:123]")
        ).toThrowErrorMatchingSnapshot()
    })

    it("should lex decimal numbers correctly", () => {
        const result = lex("path[eq:-123.123]")
        const result2 = lex("path[eq:.123]")

        expect(result).toMatchSnapshot()
        expect(result2).toMatchSnapshot()
    })

    it("should lex a date correctly", () => {
        const result = lex("path[eq:2020-01-01]")

        expect(result).toMatchSnapshot()
    })

    it("should lex zulu date time", () => {
        const result = lex("path[eq:2020-01-01T12:00:00.000Z]")

        expect(result).toMatchSnapshot()
    })

    it("should lex offset date time", () => {
        const result = lex("path[eq:2020-01-01T12:00:00.000+01:00]")

        expect(result).toMatchSnapshot()
    })

    it("should not lex dates with invalid formats", () => {
        expect(() => lex("path[eq:2020-1-1]")).toThrowErrorMatchingSnapshot()
    })

    it("should not lex incomplete dates", () => {
        expect(() => lex("path[eq:2020-23]")).toThrowErrorMatchingSnapshot()
    })

    it("should not lex incomplete date time values", () => {
        expect(() =>
            lex("path[eq:2020-10-10T12]")
        ).toThrowErrorMatchingSnapshot()
        expect(() =>
            lex("path[eq:2020-10-10T12:12]")
        ).toThrowErrorMatchingSnapshot()
        expect(() =>
            lex("path[eq:2020-10-10T12:12:12]")
        ).toThrowErrorMatchingSnapshot()
        expect(() =>
            lex("path[eq:2020-10-10T12:12:12.123]")
        ).toThrowErrorMatchingSnapshot()
        expect(() =>
            lex("path[eq:2020-10-10T12:12:12.123+]")
        ).toThrowErrorMatchingSnapshot()
        expect(() =>
            lex("path[eq:2020-10-10T12:12:12.123+12]")
        ).toThrowErrorMatchingSnapshot()
        expect(() =>
            lex("path[eq:2020-10-10T12:12:12.123+12:]")
        ).toThrowErrorMatchingSnapshot()
    })
})

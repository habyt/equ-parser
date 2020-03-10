import { parse } from "../src/parser"
import { Item } from "../src/lexer"

const example: Array<Item> = [
    { str: "name.first", type: "path" },
    { str: "[", type: "filtersStart" },
    { str: "eq", type: "filterEq" },
    { str: "foo", type: "string" },
    { str: "|", type: "or" },
    { str: "eq", type: "filterEq" },
    { str: "bar", type: "string" },
    { str: "]", type: "filtersEnd" },
    { str: "|", type: "or" },
    { str: "email", type: "path" },
    { str: "[", type: "filtersStart" },
    { str: "ct", type: "filterCt" },
    { str: "foo", type: "string" },
    { str: ",", type: "and" },
    { str: "ct", type: "filterCt" },
    { str: "bar", type: "string" },
    { str: "]", type: "filtersEnd" },
    { str: ",", type: "and" },
    { str: "age", type: "path" },
    { str: "[", type: "filtersStart" },
    { str: "(", type: "bundleStart" },
    { str: "gt", type: "filterGt" },
    { str: "4.5", type: "number" },
    { str: ",", type: "and" },
    { str: "lt", type: "filterLt" },
    { str: "-10", type: "number" },
    { str: ")", type: "bundleEnd" },
    { str: "|", type: "or" },
    { str: "eq", type: "filterEq" },
    { str: "15", type: "number" },
    { str: "]", type: "filtersEnd" },
    { str: "", type: "eof" }
]

describe("parser", () => {
    it("should parse the example", () => {
        const result = parse(example)

        expect(result).toMatchSnapshot()
    })

    it("should throw a parse error", () => {
        expect(() => parse([])).toThrowErrorMatchingSnapshot()
    })

    it("should throw a parse error on unimplemented items", () => {
        expect(() =>
            parse([{ str: "test", type: "error" }])
        ).toThrowErrorMatchingSnapshot()
    })

    it("should throw a parse error for parsing expressions without a filter", () => {
        expect(() =>
            parse([
                { str: "", type: "path" },
                { str: "test", type: "filtersStart" },
                { str: "test", type: "filtersEnd" }
            ])
        ).toThrowErrorMatchingSnapshot()
    })

    it("should parse bundles correctly", () => {
        const bundleExample: Array<Item> = [
            { str: "(", type: "bundleStart" },
            { str: "path", type: "path" },
            { str: "[", type: "filtersStart" },
            { str: "eq", type: "filterEq" },
            { str: "asd", type: "string" },
            { str: "]", type: "filtersEnd" },
            { str: ",", type: "and" },
            { str: "path2", type: "path" },
            { str: "[", type: "filtersStart" },
            { str: "eq", type: "filterEq" },
            { str: "bdf", type: "string" },
            { str: "]", type: "filtersEnd" },
            { str: ")", type: "bundleEnd" },
            { str: "", type: "eof" }
        ]

        const result = parse(bundleExample)
        expect(result).toMatchSnapshot()
    })

    it("should throw a parse error on missing filter start", () => {
        expect(() =>
            parse([
                { str: "test", type: "path" },
                { str: "bla", type: "error" }
            ])
        ).toThrowErrorMatchingSnapshot()
    })

    it("should parse gte statements", () => {
        const result = parse([
            { str: "path", type: "path" },
            { str: "[", type: "filtersStart" },
            { str: "gte", type: "filterGte" },
            { str: "value", type: "string" },
            { str: "]", type: "filtersEnd" },
            { str: "", type: "eof" }
        ])

        expect(result).toMatchSnapshot()
    })

    it("should parse nex statements", () => {
        const result = parse([
            { str: "path", type: "path" },
            { str: "[", type: "filtersStart" },
            { str: "nex", type: "filterNex" },
            { str: "value", type: "string" },
            { str: "]", type: "filtersEnd" },
            { str: "", type: "eof" }
        ])

        expect(result).toMatchSnapshot()
    })

    it("should parse neq statements", () => {
        const result = parse([
            { str: "path", type: "path" },
            { str: "[", type: "filtersStart" },
            { str: "neq", type: "filterNeq" },
            { str: "value", type: "string" },
            { str: "]", type: "filtersEnd" },
            { str: "", type: "eof" }
        ])

        expect(result).toMatchSnapshot()
    })

    it("should parse ex statements", () => {
        const result = parse([
            { str: "path", type: "path" },
            { str: "[", type: "filtersStart" },
            { str: "ex", type: "filterEx" },
            { str: "value", type: "string" },
            { str: "]", type: "filtersEnd" },
            { str: "", type: "eof" }
        ])

        expect(result).toMatchSnapshot()
    })

    it("should parse rgx statements", () => {
        const result = parse([
            { str: "path", type: "path" },
            { str: "[", type: "filtersStart" },
            { str: "rgx", type: "filterRgx" },
            { str: "value", type: "string" },
            { str: "]", type: "filtersEnd" },
            { str: "", type: "eof" }
        ])

        expect(result).toMatchSnapshot()
    })

    it("should parse lte statements", () => {
        const result = parse([
            { str: "path", type: "path" },
            { str: "[", type: "filtersStart" },
            { str: "lte", type: "filterLte" },
            { str: "value", type: "string" },
            { str: "]", type: "filtersEnd" },
            { str: "", type: "eof" }
        ])

        expect(result).toMatchSnapshot()
    })

    it("should throw an error when parsing invalid values", () => {
        expect(() =>
            parse([
                { str: "path", type: "path" },
                { str: "[", type: "filtersStart" },
                { str: "lte", type: "filterLte" },
                { str: "value", type: "error" },
                { str: "]", type: "filtersEnd" },
                { str: "", type: "eof" }
            ])
        ).toThrowErrorMatchingSnapshot()
    })

    it("should parse bundles in expressions correctly", () => {
        const result = parse([
            { str: "path", type: "path" },
            { str: "[", type: "filtersStart" },
            { str: "eq", type: "filterEq" },
            { str: "asd", type: "string" },
            { str: "|", type: "or" },
            { str: "gt", type: "filterGt" },
            { str: "asdf", type: "string" },
            { str: ",", type: "and" },
            { str: "lt", type: "filterLt" },
            { str: "asdf", type: "string" },
            { str: "]", type: "filtersEnd" },
            { str: "", type: "eof" }
        ])

        expect(result).toMatchSnapshot()
    })

    it("should throw an error when encountering eof at the end of an expression", () => {
        expect(() =>
            parse([
                { str: "path", type: "path" },
                { str: "[", type: "filtersStart" },
                { str: "eq", type: "filterEq" },
                { str: "asd", type: "string" },
                { str: "|", type: "or" },
                { str: "gt", type: "filterGt" },
                { str: "asdf", type: "string" },
                { str: "", type: "eof" }
            ])
        ).toThrowErrorMatchingSnapshot()
    })

    it("should throw an error when encountering error after a filter", () => {
        expect(() =>
            parse([
                { str: "path", type: "path" },
                { str: "[", type: "filtersStart" },
                { str: "eq", type: "filterEq" },
                { str: "asd", type: "string" },
                { str: "]", type: "filtersEnd" },
                { str: "", type: "error" }
            ])
        ).toThrowErrorMatchingSnapshot()
    })
})

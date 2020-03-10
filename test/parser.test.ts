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
})

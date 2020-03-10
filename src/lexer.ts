import assert from "assert"
export type Token =
    | "eof"
    | "error"
    | "path"
    | "or"
    | "and"
    | "filtersStart"
    | "filtersEnd"
    | "bundleStart"
    | "bundleEnd"
    | "string"
    | "number"
    | "filterGt"
    | "filterLt"
    | "filterGte"
    | "filterLte"
    | "filterEq"
    | "filterCt"

const filters: { [k: string]: Token } = {
    eq: "filterEq",
    lt: "filterLt",
    gt: "filterGt",
    lte: "filterLte",
    gte: "filterGte",
    ct: "filterCt"
}

const tokenBundleStart = "("
const tokenBundleEnd = ")"

const tokenOr = "|"
const tokenAnd = ","

const tokenFiltersStart = "["
const tokenFiltersEnd = "]"

const tokenFilterIs = ":"

const tokenValidPath =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._"
const tokenValidOperator = "abcdefghijklmnopqrstuvwxyz"
const tokenValidNumberStart = "+-.0123456789"

type StateFn = ((lexer: Lexer) => StateFn) | undefined

export class EQUParsingError extends Error {
    constructor(msg?: string) {
        super(msg)
    }
}

function lexError(msg?: string): never {
    throw new EQUParsingError(msg)
}

class Lexer {
    input: string
    pos: number = 0
    items: Array<Item> = []
    start: number = 0
    width: number = 0

    constructor(str: string) {
        this.input = str
    }

    emit(token: Token) {
        let value = this.input.substring(this.start, this.pos)

        if (token === "string") {
            value = value.replace("\\\\", "\\")
            value = value.replace('\\"', '"')
        }

        this.items.push({ str: value, type: token })
        this.start = this.pos
    }

    next(): string {
        const next = this.input.substr(this.pos, 1)
        this.width = next.length
        this.pos += this.width
        return next
    }

    accept(valid: string): boolean {
        if (valid.indexOf(this.next()) >= 0) {
            return true
        }

        this.backup()
        return false
    }

    backup() {
        this.pos -= this.width
    }

    peek(): string {
        const next = this.next()
        this.backup()
        return next
    }

    acceptRun(valid: string) {
        while (true) {
            const next = this.next()
            if (next === "") {
                break
            }

            if (valid.indexOf(next) === -1) {
                break
            }
        }

        this.backup()
    }

    acceptRunUntil(...stops: Array<string>) {
        while (true) {
            const next = this.next()
            if (next === "") {
                this.backup()
                return false
            }

            if (stops.indexOf(next) >= 0) {
                this.backup()
                return true
            }
        }
    }

    ignore() {
        this.start = this.pos
    }

    rest(): string {
        return this.input.substring(this.start)
    }

    current(): string {
        return this.input.substring(this.start, this.pos)
    }
}

export type Item = {
    str: string
    type: Token
}

function lexFilters(l: Lexer): StateFn {
    if (l.peek() === tokenBundleStart) {
        return lexToken(tokenBundleStart, "bundleStart", lexFilters)
    }

    l.acceptRun(tokenValidPath)
    if (l.pos <= l.start) {
        throw new EQUParsingError("expected path, but got " + l.rest())
    }

    l.emit("path")

    if (l.peek() !== tokenFiltersStart) {
        throw new EQUParsingError("expected '[', but got " + l.rest())
    }

    return lexToken(tokenFiltersStart, "filtersStart", lexInsideFilters)
}

function lexInsideFilters(l: Lexer): StateFn {
    if (l.peek() === tokenBundleStart) {
        return lexToken(tokenBundleStart, "bundleStart", lexInsideFilters)
    }

    l.acceptRun(tokenValidOperator)
    const nextFilter = l.current()
    const filterType =
        filters[nextFilter] ??
        lexError("expected filter type, got " + nextFilter)
    l.emit(filterType)

    if (l.next() !== tokenFilterIs) {
        lexError("expected " + tokenFilterIs + " but got " + l.current())
    }

    l.ignore()

    return lexFilterValue
}

function lexFilterValue(l: Lexer): StateFn {
    const next = l.peek()

    if (tokenValidNumberStart.indexOf(next) >= 0) {
        return lexNumberValue
    }

    if (next === '"') {
        l.next()
        l.ignore()
        return lexStringValue
    }

    lexError("expected filter value but got " + l.rest())
}

function lexStringValue(l: Lexer): StateFn {
    while (true) {
        const found = l.acceptRunUntil("\\", '"')
        if (!found) {
            lexError("expected string to end, but got " + l.rest())
        }

        const next = l.peek()
        if (next === '"') {
            l.emit("string")

            l.next()
            l.ignore()
            return lexAfterFilterValue
        }

        // if we're here next must be a \ because of acceptRunUntil
        assert(next === "\\")
        l.next()

        const escapedSymbol = l.peek()

        if (escapedSymbol === "\\" || escapedSymbol === '"') {
            l.next()
        } else {
            lexError("invalid escape sequence: \\" + escapedSymbol)
        }
    }
}

function lexNumberValue(l: Lexer): StateFn {
    l.accept("+-")

    let decimalOccured = l.accept(".")

    l.acceptRun("0123456789")
    if (l.accept(".")) {
        if (decimalOccured) {
            lexError("invalid number: " + l.current())
        }

        l.acceptRun("0123456789")
    }

    l.emit("number")
    return lexAfterFilterValue
}

function lexAfterFilterValue(l: Lexer): StateFn {
    const next = l.next()
    switch (next) {
        case tokenOr: {
            l.emit("or")
            break
        }
        case tokenAnd: {
            l.emit("and")
            break
        }
        case tokenFiltersEnd: {
            l.backup()
            return lexToken(tokenFiltersEnd, "filtersEnd", lexAfterFilter)
        }
        case tokenBundleEnd: {
            l.backup()
            return lexToken(tokenBundleEnd, "bundleEnd", lexAfterFilterValue)
        }
    }

    return lexInsideFilters
}

function lexAfterFilter(l: Lexer): StateFn {
    const next = l.next()

    if (next === "") {
        l.emit("eof")
        return undefined
    }

    switch (next) {
        case tokenOr: {
            l.emit("or")
            return lexFilters
        }
        case tokenAnd: {
            l.emit("and")
            return lexFilters
        }
        case tokenBundleEnd: {
            l.backup()
            return lexToken(tokenBundleEnd, "bundleEnd", lexAfterFilter)
        }
    }

    lexError("invalid combinator: " + next)
}

function lexToken(tokenValue: string, token: Token, next: StateFn): StateFn {
    return (lexer: Lexer) => {
        lexer.pos += tokenValue.length
        lexer.emit(token)
        return next
    }
}

export type LexerOptions = {
    debug?: boolean
}

export function lex(str: string): Array<Item> {
    const lexer = new Lexer(str)

    let state: StateFn = lexFilters
    while (state !== undefined) {
        state = state(lexer)
    }

    return lexer.items
}

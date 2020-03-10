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
    | "boolean"
    | "filterGt"
    | "filterLt"
    | "filterGte"
    | "filterLte"
    | "filterEq"
    | "filterCt"
    | "filterRgx"
    | "filterEx"
    | "filterNeq"

export const filters: { [k: string]: Token } = {
    eq: "filterEq",
    lt: "filterLt",
    gt: "filterGt",
    lte: "filterLte",
    gte: "filterGte",
    ct: "filterCt",
    rgx: "filterRgx",
    ex: "filterEx",
    neq: "filterNeq"
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

const tokenTrue = "true"
const tokenFalse = "false"

type StateFn = ((ctx: LexerContext) => StateFn) | undefined

export class EQUParsingError extends Error {
    constructor(msg?: string) {
        super(msg)
    }
}

function lexError(msg?: string): never {
    throw new EQUParsingError(msg)
}

class LexerContext {
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

    acceptExact(str: string): boolean {
   const match = this.input.substring(this.pos).startsWith(str)
   if (match) {
       this.pos += str.length
       this.width = str.length
    }
    return match
}
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

function lexFilters(ctx: LexerContext): StateFn {
    if (ctx.peek() === tokenBundleStart) {
        return lexToken(tokenBundleStart, "bundleStart", lexFilters)
    }

    ctx.acceptRun(tokenValidPath)
    if (ctx.pos <= ctx.start) {
        throw new EQUParsingError("expected path, but got " + ctx.rest())
    }

    ctx.emit("path")

    if (ctx.peek() !== tokenFiltersStart) {
        throw new EQUParsingError("expected '[', but got " + ctx.rest())
    }

    return lexToken(tokenFiltersStart, "filtersStart", lexInsideFilters)
}

function lexInsideFilters(ctx: LexerContext): StateFn {
    if (ctx.peek() === tokenBundleStart) {
        return lexToken(tokenBundleStart, "bundleStart", lexInsideFilters)
    }

    ctx.acceptRun(tokenValidOperator)
    const nextFilter = ctx.current()
    const filterType =
        filters[nextFilter] ??
        lexError("expected filter type, got " + nextFilter)
    ctx.emit(filterType)

    if (ctx.next() !== tokenFilterIs) {
        lexError("expected " + tokenFilterIs + " but got " + ctx.current())
    }

    ctx.ignore()

    return lexFilterValue
}

function lexFilterValue(ctx: LexerContext): StateFn {
    const next = ctx.peek()

    if (ctx.acceptExact(tokenTrue) || ctx.acceptExact(tokenFalse)) {
        ctx.emit("boolean")
        return lexAfterFilterValue
    }

    if (tokenValidNumberStart.indexOf(next) >= 0) {
        return lexNumberValue
    }

    if (next === '"') {
        ctx.next()
        ctx.ignore()
        return lexStringValue
    }

    lexError("expected filter value but got " + ctx.rest())
}

function lexStringValue(ctx: LexerContext): StateFn {
    while (true) {
        const found = ctx.acceptRunUntil("\\", '"')
        if (!found) {
            lexError("expected string to end, but got " + ctx.rest())
        }

        const next = ctx.peek()
        if (next === '"') {
            ctx.emit("string")

            ctx.next()
            ctx.ignore()
            return lexAfterFilterValue
        }

        // if we're here next must be a \ because of acceptRunUntil
        assert(next === "\\")
        ctx.next()

        const escapedSymbol = ctx.peek()

        if (escapedSymbol === "\\" || escapedSymbol === '"') {
            ctx.next()
        } else {
            lexError("invalid escape sequence: \\" + escapedSymbol)
        }
    }
}

function lexNumberValue(ctx: LexerContext): StateFn {
    ctx.accept("+-")

    let decimalOccured = ctx.accept(".")

    ctx.acceptRun("0123456789")
    if (ctx.accept(".")) {
        if (decimalOccured) {
            lexError("invalid number: " + ctx.current())
        }

        ctx.acceptRun("0123456789")
    }

    ctx.emit("number")
    return lexAfterFilterValue
}

function lexAfterFilterValue(ctx: LexerContext): StateFn {
    const next = ctx.next()
    switch (next) {
        case tokenOr: {
            ctx.emit("or")
            break
        }
        case tokenAnd: {
            ctx.emit("and")
            break
        }
        case tokenFiltersEnd: {
            ctx.backup()
            return lexToken(tokenFiltersEnd, "filtersEnd", lexAfterFilter)
        }
        case tokenBundleEnd: {
            ctx.backup()
            return lexToken(tokenBundleEnd, "bundleEnd", lexAfterFilterValue)
        }
    }

    return lexInsideFilters
}

function lexAfterFilter(ctx: LexerContext): StateFn {
    const next = ctx.next()

    if (next === "") {
        ctx.emit("eof")
        return undefined
    }

    switch (next) {
        case tokenOr: {
            ctx.emit("or")
            return lexFilters
        }
        case tokenAnd: {
            ctx.emit("and")
            return lexFilters
        }
        case tokenBundleEnd: {
            ctx.backup()
            return lexToken(tokenBundleEnd, "bundleEnd", lexAfterFilter)
        }
    }

    lexError("invalid combinator: " + next)
}

function lexToken(tokenValue: string, token: Token, next: StateFn): StateFn {
    return (ctx: LexerContext) => {
        ctx.pos += tokenValue.length
        ctx.emit(token)
        return next
    }
}

export function lex(str: string): Array<Item> {
    const lexer = new LexerContext(str)

    let state: StateFn = lexFilters
    while (state !== undefined) {
        state = state(lexer)
    }

    return lexer.items
}

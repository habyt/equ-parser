import assert from "assert"
import { EQULexingError } from "./error"

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
    | "date"
    | "dateTime"
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
    neq: "filterNeq",
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

const tokenValidDateTime = "-0123456789T:+Z"
const tokenValidDigits = "0123456789"

const tokenTrue = "true"
const tokenFalse = "false"

type StateFn = ((ctx: LexerContext) => StateFn) | undefined

function lexError(msg?: string): never {
    throw new EQULexingError(msg)
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

        const item = { str: value, type: token }

        this.items.push(item)
        this.start = this.pos
    }

    next(length?: number): string {
        const next = this.input.substr(this.pos, length ?? 1)
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

    peek(length?: number): string {
        const next = this.next(length)
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

    assertLength(length: number, error: string) {
        if (this.pos - this.start !== length) {
            lexError(error)
        }
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
        lexError("expected path, but got " + ctx.rest())
    }

    ctx.emit("path")

    if (ctx.peek() !== tokenFiltersStart) {
        lexError("expected '[', but got " + ctx.rest())
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
        return lexNumberOrDateTime
    }

    if (next === '"') {
        ctx.next()
        ctx.ignore()
        return lexStringValue
    }

    lexError("expected filter value but got " + ctx.rest())
}

function lexNumberOrDateTime(ctx: LexerContext): StateFn {
    const peek = ctx.peek()

    if (peek === "+" || peek === "-" || peek === ".") {
        return lexNumberValue
    }

    ctx.acceptRun(tokenValidDigits)
    if (ctx.accept("-")) {
        ctx.assertLength(5, "invalid date value: " + ctx.current())
        return lexRestOfDateTime
    }

    ctx.accept(".")
    ctx.acceptRun(tokenValidDigits)
    ctx.emit("number")

    return lexAfterFilterValue
}

function lexRestOfDateTime(ctx: LexerContext): StateFn {
    // month
    ctx.acceptRun(tokenValidDigits)
    ctx.assertLength(7, "invalid date value: " + ctx.current())

    if (!ctx.accept("-")) {
        lexError("invalid date value: " + ctx.current())
    }

    // day
    ctx.acceptRun(tokenValidDigits)
    ctx.assertLength(10, "invalid date value: " + ctx.current())

    if (ctx.accept("T")) {
        return lexRestOfTime
    }

    ctx.emit("date")
    return lexAfterFilterValue
}

function lexRestOfTime(ctx: LexerContext): StateFn {
    // hour
    ctx.acceptRun(tokenValidDigits)
    ctx.assertLength(
        13,
        "invalid date time value: " +
            ctx.current() +
            "; hour is not 2 digits long"
    )
    if (!ctx.accept(":")) {
        lexError("invalid date time value: " + ctx.current())
    }

    // minute
    ctx.acceptRun(tokenValidDigits)
    ctx.assertLength(
        16,
        "invalid date time value: " +
            ctx.current() +
            "; minute is not 2 digits long"
    )
    if (!ctx.accept(":")) {
        lexError("invalid date time value: " + ctx.current())
    }

    // second
    ctx.acceptRun(tokenValidDigits)
    ctx.assertLength(
        19,
        "invalid date value: " + ctx.current() + "; second is not 2 digits long"
    )
    if (!ctx.accept(".")) {
        lexError("invalid date time value: " + ctx.current())
    }

    // second fraction
    ctx.acceptRun(tokenValidDigits)
    ctx.assertLength(
        23,
        "invalid date value: " +
            ctx.current() +
            "; second fraction is not 3 digits long"
    )
    if (ctx.accept("Z")) {
        ctx.emit("dateTime")
        return lexAfterFilterValue
    }

    if (!ctx.accept("-+")) {
        lexError("invalid date time value: " + ctx.current())
    }

    // offset hour
    ctx.acceptRun(tokenValidDigits)
    ctx.assertLength(
        26,
        "invalid date value: " +
            ctx.current() +
            "; offset hour is not 2 digits long"
    )
    if (!ctx.accept(":")) {
        lexError("invalid date time value: " + ctx.current())
    }

    // offset minute
    ctx.acceptRun(tokenValidDigits)
    ctx.assertLength(
        29,
        "invalid date value: " +
            ctx.current() +
            "; offset minute is not 2 digits long"
    )
    ctx.emit("dateTime")

    return lexAfterFilterValue
}

function lexNumberValue(ctx: LexerContext): StateFn {
    ctx.accept("+-")

    let decimalOccured = ctx.accept(".")

    ctx.acceptRun(tokenValidDigits)
    if (ctx.accept(".")) {
        if (decimalOccured) {
            lexError("invalid number: " + ctx.current())
        }

        ctx.acceptRun(tokenValidDigits)
    }

    ctx.emit("number")
    return lexAfterFilterValue
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

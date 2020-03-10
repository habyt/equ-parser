import { ParseItem } from "./parser"
import { lex } from "./lexer"
import { parse as parseLex } from "./parser"

export function parse(equ: string): Array<ParseItem> {
    const lexed = lex(equ)

    return parseLex(lexed)
}

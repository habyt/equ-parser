
export class EQUError extends Error {
    constructor(msg?: string) {
        super(msg)
    }
}

export class EQULexingError extends EQUError {
    constructor(msg?: string) {
        super(msg)
    }
}

export class EQUParsingError extends EQUError {
    constructor(msg?: string) {
        super(msg)
    }
}


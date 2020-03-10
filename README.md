# Entity Query Parser

This is the entity query language parser for TypeScript.

The project contains a lexer and a parser which both are based on a
continunation passing style approach. State is represented as a
function that is called with a context, which then returns the next
state function while mutating the context.

The output is a list of EQU operators and operands in reverse polish
notation which will be transformed to queries by other projects.

## License

See LICENSE file.

## Copyright

homefully GmbH

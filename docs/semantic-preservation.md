# Semantic preservation

Formatting syntax must not turn template data into syntax, or synthesize output
whitespace at a boundary that originally had none.

## Expressions

`normalizeTemplateExpression` recognizes quoting, escapes and bracket paths before
normalizing parenthesis whitespace. `parseTemplateExpression` recognizes block
parameters only as a trailing top-level `as |...|` declaration. Quoted text and
nested expressions cannot supply this declaration. These helpers implement an
expression grammar; Mustache names must not be passed through them.

## Whitespace and source ranges

`trimHtmlWhitespace` and `normalizeInlineText` operate on HTML's five ASCII
whitespace characters only. Unicode spaces, including NBSP and narrow NBSP, are
data, not indentation or line-breaking opportunities. Edge trimming is linear.

The opt-in `template-format-core/prettier` export provides
`sourceSequenceToDoc(source, range, items, mode, maxEmptyLines)`. Items are ordered,
non-overlapping source ranges and their native Prettier Docs. Invalid ranges are
rejected, not silently sliced or duplicated. Literal mode retains source gaps;
HTML mode can collapse/wrap existing ASCII whitespace and cap existing blank
lines. Neither mode invents a separator between adjacent nodes. The dialect owns
content classification, syntax printing and whether a boundary is structural.

Inline element edges and whitespace-only content are significant. Formatting an
opening tag across lines is safe; inserting whitespace between that tag and its
inline content is not. HTML `strict` mode keeps element boundaries significant.
Plain text templates and text-only branch bodies retain their source line breaks
and indentation. Print width and HTML indentation do not override literal data.
The usual Prettier final-newline convention remains; configured EOL conversion is
not a promise of byte equality with differently encoded input.

## Dialect boundaries

- Nunjucks `-` is whitespace control only immediately adjacent to a delimiter.
  A leading minus after whitespace remains expression data.
- Handlebars `&` is an unescaped-expression marker, not part of a path name.
- Standalone partial indentation is passed into every line of its runtime result;
  it is grammar, not disposable outer HTML indentation.
- Comment trim flags must survive parsing and printing, including long comments.
- Mustache keys are opaque names, not helper argument lists. A positive section
  can be a lambda at runtime. Its body (including nested syntax, delimiter changes,
  raw language bodies and whitespace) must remain source. No formatting option
  can safely infer that an unknown context will never supply a lambda.

## Proof and integration

Each consumer has a semantic-preservation suite that executes both templates with
the real runtime, then checks repeat formatting. Literal output is compared
exactly; HTML text-flow fixtures collapse only ASCII browser whitespace, never
Unicode spaces or missing node boundaries. Negative controls and existing raw
embedding tests remain enabled. Historical layout expectations that removed data
are intentionally changed, not treated as semantic oracles. Mustache's historical
fixtures stay immutable; the reviewed section delta is independent test code and
is additionally checked against real lambda execution.

When testing unreleased helpers across repositories, consumer development manifests
may temporarily pin `file:../template-format-core`. Build the core first. The existing
prepublish guard rejects these pins: release the core first, then update consumer
registry ranges and lockfiles to that released version and rerun installed-package
checks. Do not ship a local pin, use a fictitious registry version, or silently
test against an older installed core.

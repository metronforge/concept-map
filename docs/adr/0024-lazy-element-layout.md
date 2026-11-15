# ADR 0024: load an engine only when an element needs layout

Status: implemented for review; requested by the author for 0.2.0

## Decision

A source map may select `layout="dagre"` or `layout="elk"` on `<concept-map>`.
The element dynamically imports the layout entry and only the selected adapter.
Literal import paths let bundlers split the modules and CDNs rewrite their URLs.
Only adapters import engine packages. A narrow dependency rule allows the
loader's dynamic imports and still forbids static imports of layout from it.
The player and renderer keep their existing dependency boundaries.

A supplied `element.layout` function takes priority over the attribute. Resolved
maps bypass both choices and load no engine. With no attribute or function,
source maps keep the existing explanatory error. Unsupported attribute values
produce an error before any import, but do not affect resolved maps or callbacks.
There is no implicit default; examples will explicitly select dagre.

Changing the attribute retries the original input. Inline source data is kept
in the element after rendering replaces its script, so changing engines or
reconnecting does not accidentally reuse resolved geometry. Native module
caching shares imports across elements. Dynamic imports cannot be aborted, but
superseded results cannot replace the current map; fetch still uses AbortSignal.

## Size and CDN checks

The pre-resolved component budget counts its entry and recursively imported
static chunks, including Zod. Deferred chunks are emitted but excluded from this
scenario; neither engine is externalized to obtain a smaller number. The limit
remains 40,650 bytes gzip. Browser tests separately assert which engine chunks
are requested.

The CDN check uses an ordinary HTML page and esm.sh's GitHub source entry pinned
to a commit, since the feature is not yet published on npm. The procedure and
observed results belong in the pull request; it is not a claim that the current
npm release already supports the attribute.

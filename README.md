Orb
===

Orb is a graph visualization library.

> TBD: Add short description and image

Read more about Orb in the following guides:

* [Handling nodes and edges](./docs/data.md)
* [Styling nodes and edges](./docs/styles.md)
* [Handling events](./docs/events.md)
* Using different views
  * [Default view]() 
  * [Map view](./docs/view-map.md)

## Install

> **Important note**: Please note that there might be breaking changes in minor version upgrades until
> the orb reaches version 1.0.0, so we recommend to either set strict version (`@memgraph/orb: "0.x.y"`)
> of the orb in your `package.json` or to allow only fix updates (`@memgraph/orb: "~0.x.y"`).

> TBD: Add: Install via npm, or script link 

With `npm` install:

```
npm install @memgraph/orb
```

With a link:

```html
<!-- Direct reference -->
<script src="dist/orb.min.js"></script>

<!-- unpkg CDN non-minified -->
<script src="https://unpkg.com/orb"></script>
<!-- unpkg CDN minified for production use, version X.Y.Z -->
<script src="https://unpkg.com/orb@X.Y.Z/lib/orb.min.js"></script>
```

## Example

```html
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset="UTF-8">
  <title>Orb | Simple graph</title>
  <script type="text/javascript" src="./orb.js"></script>
  <style>
    #graph {
      border: 1px solid #e0e0e0;
      width: 600px;
      height: 600px;
    }
  </style>
</head>
<body>
<div id="graph"></div>
<script>
  const container = document.getElementById('graph');

  const nodes = [
    { id: 1, label: 'Orb' },
    { id: 2, label: 'Graph' },
    { id: 3, label: 'Canvas' },
  ];
  const edges = [
    { id: 1, start: 1, end: 2, label: 'DRAWS' },
    { id: 2, start: 2, end: 3, label: 'ON' },
  ];

  const orb = new Orb.Orb(container);

  // Initialize nodes and edges
  orb.data.setup({ nodes, edges });

  // Render and recenter the view
  orb.view.render(() => {
    orb.view.recenter();
  });
</script>
</body>
</html>
```

## Build

> TBD: Add build commands

## Test

```
npm run test
```

## Commits

> TODO: Move this somewhere else and create a pre-commit hook

Our commit message format is as follows:

```
Tag: Short description (fixes #1234)

Longer description here if necessary
```

The first line of the commit message (the summary) must have a specific format.
This format is checked by our build tools.

The `Tag` is one of the following:

* `Fix` - for a bug fix.
* `Update` - either for a backwards-compatible enhancement or for a rule change 
  that adds reported problems.
* `New` - implemented a new feature.
* `Breaking` - for a backwards-incompatible enhancement or feature.
* `Docs` - changes to documentation only.
* `Build` - changes to build process only.
* `Upgrade` - for a dependency upgrade.
* `Chore` - for refactoring, adding tests, etc. (anything that isn't user-facing).

The message summary should be a one-sentence description of the change, and it must
be 72 characters in length or shorter. If the pull request addresses an issue, then
the issue number should be mentioned at the end. If the commit doesn't completely fix
the issue, then use `(refs #1234)` instead of `(fixes #1234)`.

Here are some good commit message summary examples:

```
Build: Update Travis to only test Node 0.10 (refs #734)
Fix: Semi rule incorrectly flagging extra semicolon (fixes #840)
Upgrade: Esprima to 1.2, switch to using comment attachment (fixes #730)
```

The commit message format is important because these messages are used to create
a changelog for each release. The tag and issue number help to create more consistent
and useful changelogs.

[Check ESLint Convention](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-eslint)

## License

Copyright (c) 2016-2022 [Memgraph Ltd.](https://memgraph.com)

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.

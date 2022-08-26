Styling nodes and edges in Orb
===

Styling nodes and edges in Orb refers to configuration of colors, size, width and other visual
properties. In the following section you can find all the details and available properties to set
up for nodes and edges.

# Node style properties

Once graph structure is created with `orb.data.setup` or update with `orb.data.merge`, a node
(`orb.INode`) object will be created upon your input data. Node object contains a property `properties`
through which you can get and set style properties.

```typescript
const node = orb.data.getNodeById(0);
// Set node size to 10
node.properties.size = 10;
```

## Properties

The interface that defines all the node properties is `orb.INodeProperties`. It contains the following
properties:

| Property name         | Type                | Description                                     |
| --------------------- | ------------------- | ----------------------------------------------- |
| `borderColor`         | Color &#124; string | Node border color.                              |
| `borderColorHover`    | Color &#124; string | Node border color on mouse hover event. If not defined, `borderColor` is used. |
| `borderColorSelected` | Color &#124; string | Node border color on mouse click event. If not defined, `borderColor` is used. |
| `borderWidth`         | number              | Node border width.                              |
| `borderWidthSelected` | number              | Node border width on mouse click event. If not defined, `borderWidth` is used. |
| `color`               | Color &#124; string | Node background color. Default is `#1d87c9`.    |
| `colorHover`          | Color &#124; string | Node background color on mouse hover event. If not defined `color` is used. |
| `colorSelected`       | Color &#124; string | Node background color on mouse click event. If not defined `color` is used. |
| `fontBackgroundColor` | Color &#124; string | Node text (label) background color.             |
| `fontColor`           | Color &#124; string | Node text (label) font color. Default is `#000000`. |
| `fontFamily`          | string              | Node text (label) font family. Default is `"Roboto, sans-serif"`. |
| `fontSize`            | number              | Node text (label) font size. Default is `4`.    |
| `imageUrl`            | string              | Image used for a node background. If image is defined, `color` won't be used. | 
| `imageUrlSelected`    | string              | Image used for a node background on mouse click event. If image is defined, `colorSelected` and `color` won't be used. |
| `label`               | string              | Node text content. Text content will be shown below the node if `fontSize` is greater than zero. |
| `shadowColor`         | Color &#124; string | Node background shadow color.                   |
| `shadowSize`          | number              | Node shadow blur size. If set to `0` the shadow will be a solid color defined by `shadowColor`. |
| `shadowOffsetX`       | number              | Node shadow horizontal offset. A positive value puts the shadow on the right side of the element, a negative value puts the shadow on the left side of the element. |
| `shadowOffsetY`       | number              | Node shadow vertical offset. A positive value puts the shadow below the element, a negative value puts the shadow above the element. |
| `shape`               | NodeShapeType       | Node shape enum. Possible values are: `CIRCLE`, `DOT` (same as circle), `SQUARE`, `DIAMOND`, `TRIANGLE`, `TRIANGLE_DOWN`, `STAR`, `HEXAGON`. Default is `NodeShapeEnum.CIRCLE`. |
| `size`                | number              | Node size (usually the radius). Default is `5`. |
| `mass`                | number              | Node mass. _(Currently not used)_               |

## Shape enumeration

The enum `orb.NodeShapeType` which is used for node `shape` property is defined as:

```typescript
export enum NodeShapeType {
  CIRCLE = 'circle',
  DOT = 'dot',
  SQUARE = 'square',
  DIAMOND = 'diamond',
  TRIANGLE = 'triangle',
  TRIANGLE_DOWN = 'triangleDown',
  STAR = 'star',
  HEXAGON = 'hexagon',
}
```

## Default property values

Default node property values are defined as follows:

```typescript
const DEFAULT_NODE_PROPERTIES: Partial<INodeProperties> = {
  size: 5,
  color: new Color('#1d87c9'),
  fontSize: 4,
  fontColor: '#000000',
  fontFamily: 'Roboto, sans-serif',
  shape: NodeShapeType.CIRCLE,
};
```

> Note: By default, the Orb doesn't know which field to use as node text (label), so make sure to
> set node property `label` to the appropriate text that you want to show for each node. Check the example
> below:

```typescript
const nodes = [
  { id: 1, name: "First" },
  { id: 1, name: "Second" },
];

const orb = new Orb('container');
orb.data.setup({ nodes });
orb.setDefaultStyle({
  getNodeStyle: (node) => {
    return {
      ...node.properties,
      label: node.data.name,
    };
  },
});
```

# Edge style properties

Once graph structure is created with `orb.data.setup` or update with `orb.data.merge`, an edge
(`orb.IEdge`) object will be created upon your input data. Edge object contains a property `properties`
through which you can get and set style properties.

```typescript
const edge = orb.data.getEdgebyId(0);
// Set edge width to 1
edge.properties.width = 1;
```

## Properties

The interface that defines all the node properties is `orb.IEdgeProperties`. It contains the following
properties:

| Property name         | Type                | Description                                         |
| --------------------- | ------------------- | --------------------------------------------------- |
| `arrowSize`           | number              | Scale of the edge arrow compared to the `width` of the edge. If set to `0`, arrow will be dismissed. Default is `1` (follows the size of the edge `width`). |
| `color`               | Color &#124; string | Edge line color. Default is `#ababab`.              |
| `colorHover`          | Color &#124; string | Edge line color on mouse hover event. If not defined `color` is used. |
| `colorSelected`       | Color &#124; string | Edge line color on mouse click event. If not defined `color` is used. |
| `fontBackgroundColor` | Color &#124; string | Edge text (label) background color.
| `fontColor`           | Color &#124; string | Edge text (label) font color. Default is `#000000`. |
| `fontFamily`          | string              | Edge text (label) font family. Default is `"Roboto, sans-serif"`. |
| `fontSize`            | number              | Edge text (label) font size. Default is `4`.        |
| `label`               | string              | Edge text content. Text content will be shown at the middle of the edge line if `fontSize` is greater than zero. |
| `shadowColor`         | Color &#124; string | Edge line background shadow color.                  |
| `shadowSize`          | number              | Edge line shadow blur size. If set to `0` the shadow will be a solid color defined by `shadowColor`. |
| `shadowOffsetX`       | number              | Edge shadow horizontal offset. A positive value puts the shadow on the right side of the line, a negative value puts the shadow on the left side of the line. |
| `shadowOffsetY`       | number              | Edge shadow vertical offset. A positive value puts the shadow below the line, a negative value puts the shadow above the line. |
| `width`               | number              | Edge line width. If width is `0`, the edge won't be drawn. Default is `0.3`. |
| `widthHover`          | number              | Edge line width on mouse hover event. If not defined `width` is used. |
| `widthSelected`       | number              | Edge line width on mouse click event. If not defined `width` is used. |

## Default property values

Default edge property values are defined as follows:

```typescript
const DEFAULT_EDGE_PROPERTIES: Partial<IEdgeProperties> = {
  color: new Color('#ababab'),
  width: 0.3,
  fontSize: 4,
  arrowSize: 1,
  fontColor: '#000000',
  fontFamily: 'Roboto, sans-serif',
};
```

# Utility class `Color`

As you might have seen, all color-based properties accept `Color` or `string`. A string value should always
be a Color HEX code (e.g. `#FFFFFF` for white).

Orb exports a utility class `Color` which you can use to define colors too. It comes with several utility
functions for easier color handling:

```typescript
import { Color } from 'orb';

// Constructor always receives a color HEX code
const red = new Color('#FF0000');

// Returns darker or ligher color by input factor (default is 0.3)
const darkerRed = red.getDarkerColor();
const lighterRed = red.getLighterColor();

// Mix two colors (RGB values are joined and divided by 2)
const mixedColor = red.getMixedColor(new Color('#ffffff'));

// Get a color object by RGB values, not HEX code
const redByRGB = Color.getColorFromRGB({ r: 255, g: 0, b: 0 });

// Get random color - great solution for all of you having issues finding a right color
const randomColor = Color.getRandomColor();
```

If you would like to have a lighter/darker tone of a node on node select/hover, then you can easily do
that with `getLigherColor` or `getDarkerColor` functions:

```typescript
const nodeBaseColor = new Color('#FF0000');

node.properties.color = nodeBaseColor;
node.properties.colorSelected = nodeBaseColor.getDarkerColor();
node.properties.colorHover = nodeBaseColor.getLighterColor();
```

# Setting up styles

> TBD: How to setup styles.

# Configuring style globals

Each Orb view has a render settings that you can configure which will affect global styling
options. Usually these settings are performance related, and you will get an idea on how to
use it in the following section:

## Disable/enable labels

Having labels (text) on nodes and edges will definitely degrade the performance of the rendering
for large number of nodes/edges. To simplify the way to disable/enable labels for the whole graph
without setting `(node|edge).properties.label = ""` or `(node|edge).properties.fontSize = 0` for
each node/edge, you can use the view settings to enable/disable labels globally:

```typescript
// Change on view init
orb.setView((context) => new DefaultView(context, {
  render: {
    labelsIsEnabled: true,
    labelsOnEventIsEnabled: true,
  },
}));

// Change anytime for the current view
orb.view.setSettings({
  render: {
    labelsIsEnabled: true,
    labelsOnEventIsEnabled: true,
  },
});
```

Property `labelsIsEnabled` will affect all the nodes/edges while `labelsOnEventIsEnabled` will
affect labels when node/edge is selected (clicked on) or hovered. Default values for both
properties are `true`.

## Disable/enable shadows

Just like labels, having shadows on nodes and edges will definitely degrade the performance of the
rendering for large number of nodes/edges. To simplify the way to disable/enable shadows for the
whole graph you can use the view settings to enable/disable shadows globally:

```typescript
// Change on view init
orb.setView((context) => new DefaultView(context, {
  render: {
    shadowsIsEnabled: true,
    shadowsOnEventIsEnabled: true,
  },
}));

// Change anytime for the current view
orb.view.setSettings({
  render: {
    shadowsIsEnabled: true,
    shadowsOnEventIsEnabled: true,
  },
});
```

Property `shadowsIsEnabled` will affect all the nodes/edges while `shadowsOnEventIsEnabled` will
affect shadows when node/edge is selected (clicked on) or hovered. Default values for both
properties are `true`.

## Configure transparency on hover/click

Additional performance affected property is the transparency of nodes/edges that are not selected nor
hovered. Default Orb behaviour on node/edge select (click) and hover to make all other nodes 30%
transparent, so the selection/hover is easily visible. 

You can configure the transparency with the following two properties:

* `contextAlphaOnEvent` - Transparency factor between 0 (hidden) and 1 (opaque). Default is `0.3`.
* `contextAlphaOnEventIsEnabled` - Enable or disable transparency regardless of the factor. Default is `true`.

```typescript
// Change on view init
orb.setView((context) => new DefaultView(context, {
  render: {
    contextAlphaOnEvent: 0.3,
    contextAlphaOnEventIsEnabled: true,
  },
}));

// Change anytime for the current view
orb.view.setSettings({
  render: {
    contextAlphaOnEvent: 0.3,
    contextAlphaOnEventIsEnabled: true,
  },
});
```

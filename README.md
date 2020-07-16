# Ts-ECS
A naive implementation of the ECS pattern in typescript!

npm package can be found [here](https://www.npmjs.com/package/naive-ts-ecs)

# quick guide

- Be sure to checkout the wave shooter demo for a practical example
- Make sure to install the package, preferably through npm, but you could use the master branch if you want to, although expect breaking changes.

This is a WIP project and things are bound to change. I strive to make it as user friendly as possible, but there is a lot to reach that goal. That being said. This is how you can use 1.4:

```typescript
// create some types that represent components
interface Circle {
  radius: number;
}

interface Position {
  x: number;
  y: number;
}

interface Colored {
  color: string;
}


// create a manager
const manager = new ECSManager();

// register your types in the manager with default values
registerComponentType<Circle>(manager, { radius: 10 });
registerComponentType<Position>(manager, { x: 0, y: 0 });
registerComponentType<Colored>(manager, { color: '#ff0000' });

// create an entity and attach components to them
const { entityId } = manager.createEntity();
const radius = Math.random() * circleMaxSize;
addComponent<Circle>(manager, entityId, { radius: radius });
addComponent<Position>(manager, entityId, { x: Math.random() * canvas.width, y: Math.random() * canvas.height });
addComponent<Colored>(manager, entityId, { color: '#'+(Math.random()*0xFFFFFF<<0).toString(16) });

// create systems that will run each frame 
// all systems take in delta time as their first argument (the time since last frame)
// all other arguments needs to be wrapped in a Component<T>
const drawCircleSystem = (dt: number, circle: Component<Circle>, pos: Component<Position>, color: Component<Colored>) => {
    ctx.beginPath();
    ctx.strokeStyle = color.data.color;
    ctx.arc(pos.data.x, pos.data.y, circle.data.radius, 0, 2 * Math.PI);
    ctx.stroke();
}

// For simple query requirements ts-ecs can generate the query for you base on your system
// Simple meaning only "AND" so in this case we ask for all entities with circle and position and color
registerSystem(manager, drawCircleSystem);

manager.dispatch();
```

See the [circle demo](https://github.com/Avokadoen/ts-ecs-circles-demo) for a better overview of a simple application.

# Using this project
This project utilizes [typescript transformers](https://github.com/madou/typescript-transformer-handbook). In order for it to work in your project you will have to enable the transformers. How you do this depends on the project facilities:

## In Webpack
```js
const managerEndpointsTransformer = require('naive-ts-ecs/manager-endpoints.transformer').default; // <--

module.exports = ['ts-loader'].map(loader => ({
   // ... omitted
    module: {
        rules: [
            {
                // ... omitted
                options: {
                    // make sure not to set `transpileOnly: true` here, otherwise it will not work
                    getCustomTransformers: program => ({
                        before: [
                            managerEndpointsTransformer(program)
                        ]
                    })
                }
            },
        ],
    },
}));
```
read more about webpack [here](https://webpack.js.org/guides/getting-started/)

## in ttypescript
Remeber to build using `ttsc` not `tsc`
```json
{
    ...
    "compilerOptions": {
        ...
        "plugins": [
            { "transform": "naive-ts-ecs/manager-endpoints.transformer" },
        ]
    }
    ...
}
```
read more about ttypescript [here](https://github.com/cevek/ttypescript)

# Documentation
Open index.html from the docs folder in a browser

You can also build the documentation using
``npm run doc``

# How to build
##### Make sure you have [node and npm](https://www.npmjs.com/get-npm) 

Install dependencies:
```bash 
npm install
```

To build:
```bash 
npm run build
```

To run tests: 
```bash 
npm test
```

# Examples
You can check out my simple wave shooter implementation [here](https://github.com/Avokadoen/ts-ecs-waveshoot)
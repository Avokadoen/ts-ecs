# Ts-ECS
A naive implementation of the ECS pattern in typescript! This was made for fun. 
It is not meant to be used in any production game.

npm package can be found [here](https://www.npmjs.com/package/naive-ts-ecs)

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
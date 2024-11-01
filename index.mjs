/**
 * index.mjs
 */

const APP = {
    "memory": undefined,
    "canvas": document.querySelector("canvas"),
};

const GL = APP.canvas.getContext("webgl2");

const shaders = [];
const glPrograms = [];
const glBuffers = [];
const glUniformLocations = [];

var CONSOLE_LOG_BUFFER = "";

const ENV = {
    // utility functions
    "compileShader": (sourcePtr, sourceLen, type) => {
        const source = readCharStr(APP, sourcePtr, sourceLen);
        const shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            throw "Error compiling shader:" + GL.getShaderInfoLog(shader);
        }
        shaders.push(shader);
        return shaders.length - 1;
    },
    "linkShaderProgram": (vertexShaderId, fragmentShaderId) => {
        const program = GL.createProgram();
        GL.attachShader(program, shaders[vertexShaderId]);
        GL.attachShader(program, shaders[fragmentShaderId]);
        GL.linkProgram(program);
        if (!GL.getProgramParameter(program, GL.LINK_STATUS)) {
            throw ("Error linking program:" + GL.getProgramInfoLog(program));
        }
        glPrograms.push(program);
        return glPrograms.length - 1;
    },
    "getUniformLocation": (programId, namePtr, nameLen) => {
        glUniformLocations.push(GL.getUniformLocation(glPrograms[programId], readCharStr(APP, namePtr, nameLen)));
        return glUniformLocations.length - 1;
    },
    "createBuffer": () => {
        glBuffers.push(GL.createBuffer());
        return glBuffers.length - 1;
    },
    "bufferData": (type, dataPtr, count, drawType) => {
        const floats = new Float32Array(APP.memory.buffer, dataPtr, count);
        GL.bufferData(type, floats, drawType);
    },

    // stateful pass-throughs
    "getAttribLocation": (programId, namePtr, nameLen) => {
        GL.getAttribLocation(glPrograms[programId], readCharStr(APP, namePtr, nameLen));
    },
    "useProgram": (programId) => {
        GL.useProgram(glPrograms[programId]);
    },
    "bindBuffer": (type, bufferId) => {
        GL.bindBuffer(type, glBuffers[bufferId]);
    },
    "uniform4fv": (locationId, x, y, z, w) => {
        GL.uniform4fv(glUniformLocations[locationId], [x, y, z, w]);
    },

    // stateless pass-throughs
    // "enable": (x) => {
    //     GL.enable(x);
    // },
    // "depthFunc": (x) => {
    //     GL.depthFunc(x);
    // },
    // "clear": (x) => {
    //     GL.clear(x);
    // },
    // "enableVertexAttribArray": (x) => {
    //     GL.enableVertexAttribArray(x);
    // },
    // "vertexAttribPointer": (attribLocation, size, type, normalize, stride, offset) => {
    //     GL.vertexAttribPointer(attribLocation, size, type, normalize, stride, offset);
    // }

    // direct bindings

};

function generateGlApi(gl) {
    const api = {};
    window.glFunctions = [];
    window.glConstants = [];
    for (const key in gl) {
        if (typeof (gl[key]) === "function") {
            api[key] = gl[key].bind(gl);
            window.glFunctions.push(key);
        } else if (typeof (gl[key]) === "number") {
            api[key] = gl[key];
            window.glConstants.push(key);
        }
    }
    return api;
}

function onWindowLoad(event) {
    setViewportFromApp(APP);
    fetchAndInstantiate('main.wasm', {
        "gl": {
            ...generateGlApi(GL),
            ...ENV
        },
        "sys": {
            "jsConsoleLogWrite": (ptr, len) => {
                CONSOLE_LOG_BUFFER += new TextDecoder().decode(new Uint8Array(APP.memory.buffer, ptr, len));
            },
            "jsConsoleLogFlush": () => {
                console.log(CONSOLE_LOG_BUFFER);
                CONSOLE_LOG_BUFFER = "";
            }
        },
        "env": {
            ...generateGlApi(GL),
            ...ENV, // some functions from GL are transcribed and therefore must override the generated API
        }
    }).then(function (instance) {
        APP.memory = instance.exports.memory;
        instance.exports.onInit();

        const onAnimationFrame = instance.exports.onAnimationFrame;

        function step(timestamp) {
            onAnimationFrame(timestamp);
            window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
    });
}

function fetchAndInstantiate(url, importObject) {
    return fetch(url).then(response =>
        response.arrayBuffer()
    ).then(bytes =>
        WebAssembly.instantiate(bytes, importObject)
    ).then(results =>
        results.instance
    );
}

function readCharStr(app, ptr, len) {
    const bytes = new Uint8Array(app.memory.buffer, ptr, len);
    return new TextDecoder("utf-8").decode(bytes);
}

function setViewportFromApp(app) {
    const bcr = app.canvas.getBoundingClientRect();
    app.canvas.width = bcr.width;
    app.canvas.height = bcr.height;
    GL.viewport(0, 0, bcr.width, bcr.height); // TODO: should be able to use bcr for all of them
}

function onWindowResize(event) {
    console.log("Window resized:", event);
    const bcr = APP.canvas.getBoundingClientRect();
    APP.canvas.width = bcr.width;
    APP.canvas.height = bcr.height;
    GL.viewport(0, 0, bcr.width, bcr.height); // TODO: should be able to use bcr for all of them
}

window.addEventListener("load", onWindowLoad);
window.addEventListener("resize", onWindowResize);

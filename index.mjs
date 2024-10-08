/**
 * 
 */

let memory;

const readCharStr = (ptr, len) => {
    const bytes = new Uint8Array(memory.buffer, ptr, len);
    return new TextDecoder("utf-8").decode(bytes);
}

const canvas = document.querySelector("canvas");
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
const bcr = canvas.getBoundingClientRect();
gl.viewport(bcr.left, bcr.top, canvas.width, canvas.height); // TODO: should be able to use bcr for all of them
console.log(bcr);

const shaders = [];
const glPrograms = [];
const glBuffers = [];
const glUniformLocations = [];

const compileShader = (sourcePtr, sourceLen, type) => {
    const source = readCharStr(sourcePtr, sourceLen);
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw "Error compiling shader:" + gl.getShaderInfoLog(shader);
    }
    shaders.push(shader);
    return shaders.length - 1;
}

const linkShaderProgram = (vertexShaderId, fragmentShaderId) => {
    const program = gl.createProgram();
    gl.attachShader(program, shaders[vertexShaderId]);
    gl.attachShader(program, shaders[fragmentShaderId]);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw ("Error linking program:" + gl.getProgramInfoLog(program));
    }
    glPrograms.push(program);
    return glPrograms.length - 1;
}

const glClearColor = (r, g, b, a) => gl.clearColor(r, g, b, a);
const glEnable = x => gl.enable(x);
const glDepthFunc = x => gl.depthFunc(x);
const glClear = x => gl.clear(x);
const glGetAttribLocation = (programId, namePtr, nameLen) => gl.getAttribLocation(glPrograms[programId], readCharStr(namePtr, nameLen));
const glGetUniformLocation = (programId, namePtr, nameLen) => {
    glUniformLocations.push(gl.getUniformLocation(glPrograms[programId], readCharStr(namePtr, nameLen)));
    return glUniformLocations.length - 1;
}
const glUniform4fv = (locationId, x, y, z, w) => gl.uniform4fv(glUniformLocations[locationId], [x, y, z, w]);
const glCreateBuffer = () => {
    glBuffers.push(gl.createBuffer());
    return glBuffers.length - 1;
}
const glBindBuffer = (type, bufferId) => gl.bindBuffer(type, glBuffers[bufferId]);
const glBufferData = (type, dataPtr, count, drawType) => {
    const floats = new Float32Array(memory.buffer, dataPtr, count);
    gl.bufferData(type, floats, drawType);
}
const glUseProgram = (programId) => gl.useProgram(glPrograms[programId]);
const glEnableVertexAttribArray = (x) => gl.enableVertexAttribArray(x);
const glVertexAttribPointer = (attribLocation, size, type, normalize, stride, offset) => {
    gl.vertexAttribPointer(attribLocation, size, type, normalize, stride, offset);
}
const glDrawArrays = (type, offset, count) => gl.drawArrays(type, offset, count);

const env = {
    compileShader,
    linkShaderProgram,
    glClearColor,
    glEnable,
    glDepthFunc,
    glClear,
    glGetAttribLocation,
    glGetUniformLocation,
    glUniform4fv,
    glCreateBuffer,
    glBindBuffer,
    glBufferData,
    glUseProgram,
    glEnableVertexAttribArray,
    glVertexAttribPointer,
    glDrawArrays
};

fetchAndInstantiate('main.wasm', { env }).then(function (instance) {
    memory = instance.exports.memory;
    instance.exports.onInit();

    const onAnimationFrame = instance.exports.onAnimationFrame;

    function step(timestamp) {
        onAnimationFrame(timestamp);
        window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
});

function fetchAndInstantiate(url, importObject) {
    return fetch(url).then(response =>
        response.arrayBuffer()
    ).then(bytes =>
        WebAssembly.instantiate(bytes, importObject)
    ).then(results =>
        results.instance
    );
}
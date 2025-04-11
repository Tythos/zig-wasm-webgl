const std = @import("std");
const ConsoleZtl = @import("./ConsoleZtl.zig");
const WebglZtl = @import("./WebglZtl.zig");

// Matrix math functions
fn createRotationMatrix(rotation_angle: f32) [16]f32 {
    const c = @cos(rotation_angle);
    const s = @sin(rotation_angle);
    return [16]f32{
        c, -s, 0, 0,
        s, c,  0, 0,
        0, 0,  1, 0,
        0, 0,  0, 1,
    };
}

// Shaders
const vertexShader =
    \\attribute vec2 a_position;
    \\attribute vec3 a_color;
    \\uniform mat4 u_transform;
    \\varying vec3 v_color;
    \\void main() {
    \\  gl_Position = u_transform * vec4(a_position, 0, 1);
    \\  v_color = a_color;
    \\}
;

const fragmentShader =
    \\precision mediump float;
    \\varying vec3 v_color;
    \\void main() {
    \\  gl_FragColor = vec4(v_color, 1.0);
    \\}
;

// Vertex data with positions and colors
const vertices: []const f32 = &.{
    // positions    // colors
    0.0, 0.5, 1.0, 0.0, 0.0, // top (red)
    -0.5, -0.5, 0.0, 1.0, 0.0, // bottom left (green)
    0.5, -0.5, 0.0, 0.0, 1.0, // bottom right (blue)
};

var program_id: u32 = undefined;
var positionAttributeLocation: i32 = undefined;
var colorAttributeLocation: i32 = undefined;
var transformUniformLocation: i32 = undefined;
var vertexBuffer: u32 = undefined;
var angle: f32 = 0;

fn buildShaderProgram(vertexSource: []const u8, fragmentSource: []const u8) u32 {
    // compile vertex shader
    const vertex_shader_id: u32 = WebglZtl.createShader(WebglZtl.VERTEX_SHADER);
    WebglZtl.shaderSource(vertex_shader_id, &vertexSource[0], vertexSource.len);
    WebglZtl.compileShader(vertex_shader_id);

    // compile fragment shader
    const fragment_shader_id: u32 = WebglZtl.createShader(WebglZtl.FRAGMENT_SHADER);
    WebglZtl.shaderSource(fragment_shader_id, &fragmentSource[0], fragmentSource.len);
    WebglZtl.compileShader(fragment_shader_id);

    // link program, return
    const shader_program_id: u32 = WebglZtl.createProgram();
    WebglZtl.attachShader(shader_program_id, vertex_shader_id);
    WebglZtl.attachShader(shader_program_id, fragment_shader_id);
    WebglZtl.linkProgram(shader_program_id);
    return shader_program_id;
}

export fn enter() void {
    ConsoleZtl.log_message("Starting application entrance...", .{});

    // Initialize GL
    WebglZtl.clearColor(0.1, 0.1, 0.1, 1.0);
    WebglZtl.enable(WebglZtl.DEPTH_TEST);
    WebglZtl.depthFunc(WebglZtl.LEQUAL);
    WebglZtl.clear(WebglZtl.COLOR_BUFFER_BIT | WebglZtl.DEPTH_BUFFER_BIT);

    // Create and setup shader program
    program_id = buildShaderProgram(vertexShader, fragmentShader);

    // Get attribute and uniform locations
    const a_position = "a_position";
    const a_color = "a_color";
    const u_transform = "u_transform";

    positionAttributeLocation = WebglZtl.getAttribLocation(program_id, &a_position[0], a_position.len);
    colorAttributeLocation = WebglZtl.getAttribLocation(program_id, &a_color[0], a_color.len);
    transformUniformLocation = WebglZtl.getUniformLocation(program_id, &u_transform[0], u_transform.len);

    // Create and setup vertex buffer
    vertexBuffer = WebglZtl.createBuffer();
    WebglZtl.bindBuffer(WebglZtl.ARRAY_BUFFER, vertexBuffer);
    WebglZtl.bufferData(WebglZtl.ARRAY_BUFFER, &vertices[0], vertices.len, WebglZtl.STATIC_DRAW);

    ConsoleZtl.log_message("Finished application entrance!", .{});
}

export fn step(_: i32) void {
    // Update rotation angle
    angle += 0.01;
    if (angle > std.math.tau) angle -= std.math.tau;

    const rotationMatrix = createRotationMatrix(angle);

    WebglZtl.clear(WebglZtl.COLOR_BUFFER_BIT | WebglZtl.DEPTH_BUFFER_BIT);
    WebglZtl.useProgram(program_id);

    // Setup position attribute
    WebglZtl.enableVertexAttribArray(@intCast(positionAttributeLocation));
    WebglZtl.bindBuffer(WebglZtl.ARRAY_BUFFER, vertexBuffer);
    WebglZtl.vertexAttribPointer(@intCast(positionAttributeLocation), 2, WebglZtl.FLOAT, 0, 20, 0);

    // Setup color attribute
    WebglZtl.enableVertexAttribArray(@intCast(colorAttributeLocation));
    WebglZtl.vertexAttribPointer(@intCast(colorAttributeLocation), 3, WebglZtl.FLOAT, 0, 20, 8);

    // Set transformation matrix
    WebglZtl.uniformMatrix4fv(transformUniformLocation, false, &rotationMatrix[0], 16);

    // Draw the triangle
    WebglZtl.drawArrays(WebglZtl.TRIANGLES, 0, 3);
}

export fn exit() void {
    ConsoleZtl.log_message("Starting application exit...", .{});
    // ...
    ConsoleZtl.log_message("Finished application exit!", .{});
}

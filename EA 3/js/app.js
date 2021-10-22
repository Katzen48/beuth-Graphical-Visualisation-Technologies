const scale = 0.45;

const modelData = {
    vertices: [
        // house base top right 0
        [1, 1],
        // house base top left 1
        [-1, 1],
        // house base bottom right 2
        [1, -1],
        // house base bottom left 3
        [-1, -1],
        // house roof top 4
        [0, 2],
        // garage top right 5
        [2, 0],
        // garage top left 6
        [1, 0],
        // garage bottom right 7
        [2, -1],
        // garage roof top 8
        [1.5, .5],
        // manikin right leg bottom right 9
        [-1.25, -1],
        // manikin right leg bottom left 10
        [-1.375, -1],
        // manikin left leg bottom left 11
        [-1.5, -1],
        // manikin right leg top right 12
        [-1.25, -0.75],
        // manikin right leg top left 13
        [-1.375, -0.75],
        // manikin left leg top left 14
        [-1.5, -0.75],
        // manikin upper body top right 15
        [-1.25, -0.5],
        // manikin upper body top left 16
        [-1.5, -0.5],
        // manikin right arm bottom right 17
        [-1.165, -0.75],
        // manikin right arm top right 18
        [-1.165, -0.5],
        // manikin left arm bottom left 19
        [-1.585, -0.75],
        // manikin left arm top left 20
        [-1.585, -0.5],
        // manikin head bottom right 21
        [-1.27, -0.5],
        // manikin head bottom left 22
        [-1.48, -0.5],
        // manikin head top right 23
        [-1.27, -0.29],
        // manikin head top left 24
        [-1.48, -0.29],
    ],
    polygonVertices: [
        // house base
        [0, 2, 3],
        [3, 1, 0],
        // house roof
        [0, 1, 4],
        // garage base
        [6, 5, 7],
        [7, 2, 6],
        // garage roof
        [5, 6, 8],
        // manikin right leg
        [9, 10, 13],
        [9, 13, 12],
        // manikin left leg
        [10, 11, 14],
        [10, 14, 13],
        // manikin upper body
        [12, 14, 16],
        [12, 16, 15],
        // manikin right arm
        [17, 12, 15],
        [17, 15, 18],
        // manikin left arm
        [14, 19, 20],
        [14, 20, 16],
        // manikin head
        [21, 22, 24],
        [21, 24, 23],
    ],
    colors: [
        [256, 100, 0, 256],
        [256, 0, 150, 256],
        [256, 0, 150, 256],
        [256, 250, 0, 256],
        [256, 100, 0, 256],
        [256, 0, 0, 256],
        [256, 0, 150, 256],
        [256, 0, 150, 256],
        [256, 150, 0, 256],
        [256, 150, 0, 256],
        [256, 150, 0, 256],
        [256, 150, 0, 256],
        [256, 150, 0, 256],
        [256, 150, 0, 256],
        [256, 150, 0, 256],
        [256, 150, 150, 256],
        [256, 150, 150, 256],
        [256, 150, 150, 256],
        [256, 150, 150, 256],
        [256, 150, 150, 256],
        [256, 150, 150, 256],
        [256, 150, 150, 256],
        [256, 150, 150, 256],
        [256, 0, 0, 256],
        [256, 0, 0, 256],
    ],
}

window.onload = function () {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('experimental-webgl');

    gl.clearColor(0, 0, 0, 1);
    gl.frontFace(gl.CW);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    const vsSource = `
                attribute vec2 pos;
                attribute vec4 u_color;
                varying vec4 color;
                void main() {
                    color = u_color;
                    gl_Position = vec4(pos * ${scale}, 0, 1);
                }`;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fsSource = `
                precision mediump float;
                varying vec4 color;
                void main() {
                    gl_FragColor = color;
                }`;
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const vertices = new Float32Array(modelData.vertices.flat());
    const colors = new Float32Array(modelData.colors.map((color) => color = color.map((colorHex) => colorHex = colorHex / 256)).flat());
    const indices = new Uint16Array(modelData.polygonVertices.flat());

    const vboPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(prog, 'pos');
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posAttrib);

    const vboCol = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboCol);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    const colAttrib = gl.getAttribLocation(prog, 'u_color');
    gl.vertexAttribPointer(colAttrib, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colAttrib);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    ibo.numerOfEmements = indices.length;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, ibo.numerOfEmements, gl.UNSIGNED_SHORT, 0);
};
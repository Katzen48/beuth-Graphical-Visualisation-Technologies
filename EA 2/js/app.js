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
        // manikin left arm bottom right 19
        [-1.585, -0.75],
        // manikin left arm top right 20
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
        [0, 1],
        [2, 3],
        [0, 2],
        [1, 3],
        // house base cross
        [0, 3],
        [1, 2],
        // house roof
        [0, 4],
        [4, 1],
        // garage base
        [5, 6],
        [5, 7],
        [2, 7],
        // garage base cross
        [2, 5],
        [6, 7],
        // garage roof
        [5, 8],
        [6, 8],
        // manikin right leg
        [9, 12],
        [9, 10],
        [10, 13],
        [12, 13],
        // manikin left leg
        [10, 11],
        [11, 14],
        [13, 14],
        [12, 13],
        // manikin upper body
        [15, 16],
        [12, 15],
        [14, 16],
        // manikin right arm
        [17, 18],
        [12, 17],
        [15, 18],
        // manikin left arm
        [19, 20],
        [14, 19],
        [16, 20],
        // manikin head
        [21, 23],
        [22, 24],
        [23, 24],
    ],
    colors: [
        // house base
        [256, 0, 0, 0],
        [256, 0, 0, 0],
        [256, 0, 0, 0],
        [256, 0, 0, 0],
        // house base cross
        [256, 0, 0, 0],
        [256, 0, 0, 0],
        // house roof
        [256, 0, 150, 0],
        [256, 0, 150, 0],
        // garage base
        [256, 150, 0, 0],
        [256, 150, 0, 0],
        [256, 150, 0, 0],
        // garage base cross
        [256, 150, 0, 0],
        [256, 150, 0, 0],
        // garage roof
        [256, 150, 0, 0],
        [256, 150, 0, 0],
        // manikin right leg
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        // manikin left leg
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        // manikin upper body
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        // manikin right arm
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        // manikin left arm
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        // manikin head
        [256, 150, 150, 0],
        [256, 150, 150, 0],
        [256, 150, 150, 0],
    ],
}

window.onload = function () {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('experimental-webgl');
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const vsSource = `
                attribute vec2 pos;
                void main() {
                    gl_Position = vec4(pos * ${scale}, 0, 1);
                }`;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fsSource = `
                precision mediump float;
                uniform vec4 u_color;
                void main() {
                    gl_FragColor = u_color;
                }`;
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    modelData.polygonVertices.forEach(function(polygonVertex, index) {
        const vertices = [];
        polygonVertex.forEach(function(vertexIndex) {
            modelData.vertices[vertexIndex].forEach(function (vertexPosition) {
                vertices.push(vertexPosition);
            })
        });
        const array = new Float32Array(vertices);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);

        const posAttrib = gl.getAttribLocation(prog, 'pos');
        gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posAttrib);

        const colorUniform = gl.getUniformLocation(prog, 'u_color');
        gl.uniform4f(colorUniform, modelData.colors[index][0] / 256, modelData.colors[index][1] / 256, modelData.colors[index][2] / 256, modelData.colors[index][3] / 256)

        gl.drawArrays(gl.LINES, 0, 2);
    })
};
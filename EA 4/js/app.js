var vertices, indices, indicesTris;
var canvas, gl;

var filled = false;
var renderedType;

window.onload = function () {
    canvas = document.getElementById('canvas');
    gl = canvas.getContext('experimental-webgl');
};

function switchFilled() {
    filled = !filled;
    render(renderedType);
}

function render(type) {
    renderedType = type;

    gl.clearColor(.95, .95, .95, 1);
    gl.frontFace(gl.CCW);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    const vsSource = `
                attribute float scale;
                attribute vec3 pos;
                attribute vec4 u_color;
                varying vec4 color;
                void main() {
                    color = u_color;
                    gl_Position = vec4(pos * scale, 1);
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
    gl.bindAttribLocation(prog, 0, 'pos');
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const scaleAttrib = gl.getAttribLocation(prog, 'scale');

    switch (type) {
        case 'mobius':
            createMobiusVertexData();
            gl.vertexAttrib1f(scaleAttrib, 0.6);
            break;
        case 'funnel':
            createFunnelVertexData();
            gl.vertexAttrib1f(scaleAttrib, 0.25);
            break;
    }

    const vboPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(prog, 'pos');
    gl.vertexAttribPointer(posAttrib, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posAttrib);

    const colAttrib = gl.getAttribLocation(prog, 'u_color');

    const iboLines = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboLines);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    iboLines.numberOfElements = indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);


    // Setup tris index buffer object.
    const iboTris = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboTris);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesTris, gl.STATIC_DRAW);
    iboTris.numberOfElements = indicesTris.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // Clear framebuffer and render primitives.
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (filled) {
        // Setup rendering tris.
        gl.vertexAttrib4f(colAttrib, 0, 1, 1, 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboTris);
        gl.drawElements(gl.TRIANGLES, iboTris.numberOfElements, gl.UNSIGNED_SHORT, 0);
    } else {
        // Setup rendering lines.
        gl.vertexAttrib4f(colAttrib, 0, 0, 1, 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboLines);
        gl.drawElements(gl.LINES, iboLines.numberOfElements, gl.UNSIGNED_SHORT, 0);
    }
}

function createMobiusVertexData() {
    var n = 32;
    var m = 4;
    // Positions.
    vertices = new Float32Array(3*(n+1)*(m+1));
    // Index data for Linestrip.
    indices = new Uint16Array(3 * 2 * n * m);
    indicesTris  = new Uint16Array(3 * 2 * n * m);

    var dA = 2*Math.PI/n;
    var dR = 2/m;
    // Counter for entries in index array.
    var iLines = 0;
    var iTris = 0;

    // Loop a.
    for(var i=0, a=0; i <= n; i++, a += dA) {

        // Loop r.
        for(var j=0, r=-1; j <= m; j++, r += dR){
            var r2cosA2 = 1 + r / 2 * Math.cos(a / 2);

            var iVertex = i*(m+1) + j;

            var x = Math.cos(a) * r2cosA2;
            var y = Math.sin(a) * r2cosA2;
            var z = (r / 2) * Math.sin(a / 2);

            // Set vertex positions.
            vertices[iVertex * 3] = x;
            vertices[iVertex * 3 + 1] = y;
            vertices[iVertex * 3 + 2] = z;

            if(i > 0) {
                indices[iLines++] = iVertex - (m + 1);
                indices[iLines++] = iVertex;

                if(j > 0) {
                    if(j % m === 0) {
                        indices[iLines++] = iVertex - m;
                        indices[iLines++] = iVertex;
                    }

                    if(i < (n / 2) + 1) {
                        indicesTris[iTris++] = iVertex - (m + 1);
                        indicesTris[iTris++] = iVertex - 1;
                        indicesTris[iTris++] = iVertex - (m + 1) - 1;

                        indicesTris[iTris++] = iVertex;
                        indicesTris[iTris++] = iVertex - 1;
                        indicesTris[iTris++] = iVertex - (m + 1);
                    } else {
                        indicesTris[iTris++] = iVertex - (m + 1) - 1;
                        indicesTris[iTris++] = iVertex - 1;
                        indicesTris[iTris++] = iVertex - (m + 1);

                        indicesTris[iTris++] = iVertex - (m + 1);
                        indicesTris[iTris++] = iVertex - 1;
                        indicesTris[iTris++] = iVertex;
                    }
                }
            }
        }
    }
}

function createFunnelVertexData() {
    var n = 32;
    var m = 16;

    // Positions.
    vertices = new Float32Array(3*(n+1)*(m+1));
    // Index data for Linestrip.
    indices = new Uint16Array(3 * 2 * n * m);
    indicesTris  = new Uint16Array(3 * 2 * n * m);

    var dU = 1.9/m;
    var dV = 2*Math.PI/m;
    // Counter for entries in index array.
    var iLines = 0;
    var iTris = 0;

    // Loop a.
    for(var i=0, u=0.1; i <= n; i++, u += dU) {
        // Loop r.
        for(var j=0, v=0; j <= m; j++, v += dV){
            var x = u * Math.cos(v);
            var z = u * Math.sin(v);
            var y = Math.log(u);

            var iVertex = i*(m+1) + j;

            // Set vertex positions.
            vertices[iVertex * 3] = x;
            vertices[iVertex * 3 + 1] = y;
            vertices[iVertex * 3 + 2] = z;

            // Set index.
            // Line on beam.
            if(j>0 && i>0){
                indices[iLines++] = iVertex - 1;
                indices[iLines++] = iVertex;
            }
            // Line on ring.
            if(j>0 && i>0){
                indices[iLines++] = iVertex - (m+1);
                indices[iLines++] = iVertex;
            }

            // Set index.
            // Two Triangles.
            if(j>0 && i>0){
                indicesTris[iTris++] = iVertex - (m+1);
                indicesTris[iTris++] = iVertex - 1;
                indicesTris[iTris++] = iVertex;
                //
                indicesTris[iTris++] = iVertex - (m+1);
                indicesTris[iTris++] = iVertex - (m+1) - 1;
                indicesTris[iTris++] = iVertex - 1;
            }
        }
    }
}

function Vector2(x, z) {
    this.x = x;
    this.z = z;
}

function dotGridGradient(x0, z0, x, z) {
    let gradient = randomGradient(x0, z0);
    let dX = x - x0;
    let dZ = z - z0;

    return dX * gradient.x + dZ * gradient.z;
}

function randomGradient(x, z) {
    let random = Math.random() * Math.PI * 2;

    return new Vector2(
        Math.sin(random),
        Math.cos(random)
    );
}

function interpolate(a0, a1, x) {
    if (x < 0.0) return a0;
    if (x > 1.0) return a1;

    return (a1 - a0) * x + a0;
}
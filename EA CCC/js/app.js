var app = (function() {

    var gl;

    // The shader program object is also used to
    // store attribute and uniform locations.
    var prog;

    // Array of model objects.
    var models = [];

    var spheres = [];

    // Model that is target for user input.
    var interactiveModel;

    var camera = {
        // Initial position of the camera.
        eye : [ 0, 1, 4 ],
        // Point to look at.
        center : [ 0, 0, 0 ],
        // Roll and pitch of the camera.
        up : [ 0, 1, 0 ],
        // Opening angle given in radian.
        // radian = degree*2*PI/360.
        fovy : 60.0 * Math.PI / 180,
        // Camera near plane dimensions:
        // value for left right top bottom in projection.
        lrtb : 2.0,
        // View matrix.
        vMatrix : glMatrix.mat4.create(),
        // Projection matrix.
        pMatrix : glMatrix.mat4.create(),
        // Projection types: ortho, perspective, frustum.
        projectionType : "perspective",
        // Angle to Z-Axis for camera when orbiting the center
        // given in radian.
        zAngle : 0,
        // Distance in XZ-Plane from center when orbiting.
        distance : 4,
    };

    // Objekt with light sources characteristics in the scene.
    var illumination = {
        ambientLight : [.5,.5,.5],
        light : [
            {isOn:true, position:[3.,1.,3.], color:[1.,1.,1.], zAngle: 0},
            {isOn:true, position:[-3.,1.,-3.], color:[1.,1.,1.], zAngle: 0},
        ]
    };

    function disableSetup() {
        document.getElementById('k').disabled = true;
        document.getElementById('n').disabled = true;
        document.getElementById('r').disabled = true;
        document.getElementById('z').disabled = true;
        document.getElementById('p').disabled = true;
        document.getElementById('submit').disabled = true;
    }

    function start() {
        disableSetup();

        init();
        render();

        setInterval(render, 50);
    }

    function init() {
        initWebGL();
        initShaderProgram();
        initUniforms();
        initModels();
        initEventHandler();
        initPipline();

        initChart();
    }

    function initChart() {
        window.chart = new Chart(
            document.getElementById('chart'),
            {
                type: 'pie',
                data: {
                    datasets: [{
                        data: [window.k, window.g],
                        backgroundColor: [
                            'rgb(255,0,0)',
                            'rgb(0,255,0)',
                        ],
                    }],
                    labels: [
                        'Unhealthy',
                        'Healthy',
                    ],
                },
                options: {
                    responsive: false
                }
            }
        );
    }

    function initWebGL() {
        // Get canvas and WebGL context.
        canvas = document.getElementById('canvas');
        gl = canvas.getContext('experimental-webgl');
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    }

    /**
     * Init pipeline parmters that will not change again. If projection or
     * viewport change, thier setup must be in render function.
     */
    function initPipline() {
        gl.clearColor(.95, .95, .95, 1);

        // Backface culling.
        gl.frontFace(gl.CCW);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        // Depth(Z)-Buffer.
        gl.enable(gl.DEPTH_TEST);

        // Polygon offset of rastered Fragments.
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(0.5, 0);

        // Set viewport.
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        // Init camera.
        // Set projection aspect ratio.
        camera.aspect = gl.viewportWidth / gl.viewportHeight;
    }

    function initShaderProgram() {
        // Init vertex shader.
        var vs = initShader(gl.VERTEX_SHADER, "vertexshader");
        // Init fragment shader.
        var fs = initShader(gl.FRAGMENT_SHADER, "fragmentshader");
        // Link shader into a shader program.
        prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.bindAttribLocation(prog, 0, "aPosition");
        gl.linkProgram(prog);
        gl.useProgram(prog);
    }

    /**
     * Create and init shader from source.
     * 
     * @parameter shaderType: openGL shader type.
     * @parameter SourceTagId: Id of HTML Tag with shader source.
     * @returns shader object.
     */
    function initShader(shaderType, SourceTagId) {
        var shader = gl.createShader(shaderType);
        var shaderSource = document.getElementById(SourceTagId).text;
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log(SourceTagId + ": " + gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    function initUniforms() {
        // Projection Matrix.
        prog.pMatrixUniform = gl.getUniformLocation(prog, "uPMatrix");

        // Model-View-Matrix.
        prog.mvMatrixUniform = gl.getUniformLocation(prog, "uMVMatrix");

        // Normal Matrix.
        prog.nMatrixUniform = gl.getUniformLocation(prog, "uNMatrix");

        // Color.
        prog.colorUniform = gl.getUniformLocation(prog, "uColor");

        // Light.
        prog.ambientLightUniform = gl.getUniformLocation(prog,
                "ambientLight");
        // Array for light sources uniforms.
        prog.lightUniform = [];
        // Loop over light sources.
        for (var j = 0; j < illumination.light.length; j++) {
            var lightNb = "light[" + j + "]";
            // Store one object for every light source.
            var l = {};
            l.isOn = gl.getUniformLocation(prog, lightNb + ".isOn");
            l.position = gl.getUniformLocation(prog, lightNb + ".position");
            l.color = gl.getUniformLocation(prog, lightNb + ".color");
            prog.lightUniform[j] = l;
        }

        // Material.
        prog.materialKaUniform = gl.getUniformLocation(prog, "material.ka");
        prog.materialKdUniform = gl.getUniformLocation(prog, "material.kd");
        prog.materialKsUniform = gl.getUniformLocation(prog, "material.ks");
        prog.materialKeUniform = gl.getUniformLocation(prog, "material.ke");
    }

    /**
     * @paramter material : objekt with optional ka, kd, ks, ke.
     * @retrun material : objekt with ka, kd, ks, ke.
     */
    function createPhongMaterial(material) {
        material = material || {};
        // Set some default values,
        // if not defined in material paramter.
        material.ka = material.ka || [ 0.3, 0.3, 0.3 ];
        material.kd = material.kd || [ 0.6, 0.6, 0.6 ];
        material.ks = material.ks || [ 0.8, 0.8, 0.8 ];
        material.ke = material.ke || 10.;

        return material;
    }

    function updateDisplayedVariables(preInit = false, init = false) {
        if (preInit || init) {
            window.k = Number.parseInt(document.getElementById('k').value);
            window.n = Number.parseInt(document.getElementById('n').value);
            window.r = Number.parseFloat(document.getElementById('r').value);
            window.z = Number.parseInt(document.getElementById('z').value);
            window.p = Number.parseFloat(document.getElementById('p').value);

            document.getElementById('n-output').value = window.n;
            document.getElementById('r-output').value = window.r;
            document.getElementById('z-output').value = window.z;
            document.getElementById('p-output').value = window.p;
        }

        window.g = window.n - window.k;

        document.getElementById('k').value = window.k;
        document.getElementById('k-output').innerText = window.k;
        document.getElementById('g').value = window.g;
        document.getElementById('g-output').innerText = window.g;

        if (preInit) {
            document.getElementById('submit').disabled = window.g < 0;
        }
    }

    function initModels() {
        updateDisplayedVariables(false, true);

        // fillstyle
        var fs = "fill";

        // Create some default material.
        var mDefault = createPhongMaterial();
        window.mRed = createPhongMaterial({kd:[1.,0.,0.]});
        window.mGreen = createPhongMaterial({kd:[0.,1.,0.]});
        var mBlue = createPhongMaterial({kd:[0.,0.,1.]});
        var mWhite = createPhongMaterial({ka:[1.,1.,1.], kd:[.5,.5,.5],
            ks:[0.,0.,0.]});

        /*
        createModel("torus", fs, [1,1,1,1], [0,.75,0], [0,0,0,0], [1,1,1,1],
            mRed);
        createModel("sphere", fs, [1,1,1,1], [-1.25,.5,0], [0,0,0,0], [.5,.5,.5],
            mGreen);
        createModel("sphere", fs, [1,1,1,1], [1.25,.5,0], [0,0,0,0], [.5,.5,.5],
            mBlue);
        createModel("plane", fs, [1,1,1,1], [0,0,0,0], [0,0,0,0], [1,1,1,1],
            mWhite);
         */

        createModel("cube", fs, [1,1,1,1], [0,0,0,0], [0,0,0,0], [2,2,2,2],
            mWhite);

        let generatedUnhealthy = 0;
        for (let i = 0; i < window.n; i++) {
            let material;

            let unhealthy = false;
            if (generatedUnhealthy < window.k) {
                material = window.mRed;
                unhealthy = true;
                generatedUnhealthy++;
            } else {
                material = window.mGreen;
            }

            let x = Math.random() * 2.8 - 1.4;
            let y = Math.random() * 2.8 - 1.4;
            let z = Math.random() * 2.8 - 1.4;

            createModel("sphere", fs, [1,1,1,1], [x,y,z], [0,0,0,0], [window.r,window.r,window.r],
                material, unhealthy);
        }

        // Select one model that can be manipulated interactively by user.
        interactiveModel = models[0];
    }

    /**
     * Create model object, fill it and push it in models array.
     * 
     * @parameter geometryname: string with name of geometry.
     * @parameter fillstyle: wireframe, fill, fillwireframe.
     */
    function createModel(geometryname, fillstyle, color, translate, rotate,
            scale, material, unhealthy) {
        var model = {};
        model.fillstyle = fillstyle;
        model.color = color;
        initDataAndBuffers(model, geometryname);
        initTransformations(model, translate, rotate, scale);
        model.material = material;

        models.push(model);

        if (geometryname === 'sphere') {
            spheres.push(model);
            updateSphereSpeed(model);

            model.unhealthy = unhealthy;
            model.unhealthyTicks = window.z * unhealthy;

            model.audio = new Audio('effect.mp3');
            model.audio.volume = 0.1;
        }
    }

    /**
     * Set scale, rotation and transformation for model.
     */
    function initTransformations(model, translate, rotate, scale) {
        // Store transformation vectors.
        model.translate = translate;
        model.rotate = rotate;
        model.scale = scale;

        // Create and initialize Model-Matrix.
        model.mMatrix = glMatrix.mat4.create();

        // Create and initialize Model-View-Matrix.
        model.mvMatrix = glMatrix.mat4.create();

        // Create and initialize Normal Matrix.
        model.nMatrix = glMatrix.mat3.create();
    }

    /**
     * Init data and buffers for model object.
     * 
     * @parameter model: a model object to augment with data.
     * @parameter geometryname: string with name of geometry.
     */
    function initDataAndBuffers(model, geometryname) {
        // Provide model object with vertex data arrays.
        // Fill data arrays for Vertex-Positions, Normals, Index data:
        // vertices, normals, indicesLines, indicesTris;
        // Pointer this refers to the window.
        this[geometryname]['createVertexData'].apply(model);

        // Setup position vertex buffer object.
        model.vboPos = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
        // Bind vertex buffer to attribute variable.
        prog.positionAttrib = gl.getAttribLocation(prog, 'aPosition');
        gl.enableVertexAttribArray(prog.positionAttrib);

        // Setup normal vertex buffer object.
        model.vboNormal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
        gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);
        // Bind buffer to attribute variable.
        prog.normalAttrib = gl.getAttribLocation(prog, 'aNormal');
        gl.enableVertexAttribArray(prog.normalAttrib);

        // Setup lines index buffer object.
        model.iboLines = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines,
                gl.STATIC_DRAW);
        model.iboLines.numberOfElements = model.indicesLines.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // Setup triangle index buffer object.
        model.iboTris = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris,
                gl.STATIC_DRAW);
        model.iboTris.numberOfElements = model.indicesTris.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    function initEventHandler() {
        // Rotation step for models.
        var deltaRotate = Math.PI / 36;
        var deltaTranslate = 0.05;

        window.onkeydown = function(evt) {
            var key = evt.which ? evt.which : evt.keyCode;
            var c = String.fromCharCode(key);
            // console.log(evt);
            // Use shift key to change sign.
            var sign = evt.shiftKey ? -1 : 1;
            // Rotate interactiveModel.
            switch (c) {
            case ('X'):
                interactiveModel.rotate[0] += sign * deltaRotate;
                break;
            case ('Y'):
                interactiveModel.rotate[1] += sign * deltaRotate;
                break;
            case ('Z'):
                interactiveModel.rotate[2] += sign * deltaRotate;
                break;
            }
            // Change projection of scene.
            switch (c) {
            case ('O'):
                camera.projectionType = "ortho";
                camera.lrtb = 2;
                break;
            case ('F'):
                camera.projectionType = "frustum";
                camera.lrtb = 1.2;
                break;
            case ('P'):
                camera.projectionType = "perspective";
                break;
            }
            // Camera move and orbit.
            switch (c) {
            case ('C'):
                // Orbit camera.
                camera.zAngle += sign * deltaRotate;
                break;
            case ('H'):
                // Move camera up and down.
                camera.eye[1] += sign * deltaTranslate;
                break;
            case ('D'):
                // Camera distance to center.
                camera.distance += sign * deltaTranslate;
                break;
            case ('V'):
                // Camera fovy in radian.
                camera.fovy += sign * 5 * Math.PI / 180;
                break;
            case ('B'):
                // Camera near plane dimensions.
                camera.lrtb += sign * 0.1;
                break;
            }
            // Light Sources
            switch (c) {
                case ('I'):
                    illumination.light.forEach(light => light.zAngle -= deltaRotate)
                    break;
                case ('L'):
                    illumination.light.forEach(light => light.zAngle += deltaRotate)
                    break;
            }
            // Render the scene again on any key pressed.
            //render();
        };
    }

    function updateUnhealthyStates() {
        let unhealthy = 0;

        for (let i = 0; i < spheres.length; i++) {
            let sphere = spheres[i];

            if (sphere.unhealthy) {
                sphere.unhealthyTicks--;
            } else {
                continue;
            }

            if (sphere.unhealthyTicks <= 0) {
                sphere.unhealthy = false;
                sphere.unhealthyTicks = 0;
                sphere.material = window.mGreen;
            } else {
                sphere.material = window.mRed;
            }

            unhealthy += sphere.unhealthy;
        }

        window.k = unhealthy;
    }

    function updateChart() {
        window.chart.data.datasets[0].data = [window.k, window.g];
        window.chart.update();
    }

    /**
     * Run the rendering pipeline.
     */
    function render() {
        // Clear framebuffer and depth-/z-buffer.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        setProjection();

        updateUnhealthyStates()

        calculateCameraOrbit();
        calculateNewSpherePositions();

        updateDisplayedVariables();
        updateChart();

        // Set view matrix depending on camera.
        glMatrix.mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);

        // NEW
        // Set light uniforms.
        gl.uniform3fv(prog.ambientLightUniform, illumination.ambientLight);
        // Loop over light sources.
        for (var j = 0; j < illumination.light.length; j++) {
            // bool is transferred as integer.
            gl.uniform1i(prog.lightUniform[j].isOn,
                    illumination.light[j].isOn);
            // Transform orbit
            lightSourceOrbit(j);
            // Tranform light postion in eye coordinates.
            // Copy current light position into a new array.
            var lightPos = [].concat(illumination.light[j].localPosition);
            // Add homogenious coordinate for transformation.
            lightPos.push(1.0);
            glMatrix.vec4.transformMat4(lightPos, lightPos, camera.vMatrix);
            // Remove homogenious coordinate.
            lightPos.pop();
            gl.uniform3fv(prog.lightUniform[j].position, lightPos);
            gl.uniform3fv(prog.lightUniform[j].color,
                    illumination.light[j].color);
        }

        // Loop over models.
        for (var i = 0; i < models.length; i++) {
            // Update modelview for model.
            updateTransformations(models[i]);

            // Set uniforms for model.
            //
            // Transformation matrices.
            gl.uniformMatrix4fv(prog.mvMatrixUniform, false,
                    models[i].mvMatrix);
            gl.uniformMatrix3fv(prog.nMatrixUniform, false,
                    models[i].nMatrix);
            // Color (not used with lights).
            gl.uniform4fv(prog.colorUniform, models[i].color);
            // NEW
            // Material.
            gl.uniform3fv(prog.materialKaUniform, models[i].material.ka);
            gl.uniform3fv(prog.materialKdUniform, models[i].material.kd);
            gl.uniform3fv(prog.materialKsUniform, models[i].material.ks);
            gl.uniform1f(prog.materialKeUniform, models[i].material.ke);

            draw(models[i]);
        }
    }

    function calculateCameraOrbit() {
        // Calculate x,z position/eye of camera orbiting the center.
        var x = 0, z = 2;
        camera.eye[x] = camera.center[x];
        camera.eye[z] = camera.center[z];
        camera.eye[x] += camera.distance * Math.sin(camera.zAngle);
        camera.eye[z] += camera.distance * Math.cos(camera.zAngle);
    }

    function calculateNewSpherePositions() {
        for (let i = 0; i < spheres.length; i++) {
            let sphere = spheres[i];

            let x = sphere.translate[0] + sphere.speed[0];
            let y = sphere.translate[1] + sphere.speed[1];
            let z = sphere.translate[2] + sphere.speed[2];

            if (Math.abs(x) >= 2) {
                let xDim = x > 0 ? 1 : -1;
                x -= 4 * xDim;
            }

            if (Math.abs(y) >= 2) {
                let yDim = y > 0 ? 1 : -1;
                y -= 4 * yDim;
            }

            if (Math.abs(z) >= 2) {
                let zDim = z > 0 ? 1 : -1;
                z -= 4 * zDim;
            }

            sphere.newTranslate = [
                x, y, z,
            ];
        }

        let collisions = new Array(spheres.length);
        for (let i = 0; i < spheres.length; i++) {
            collisions[i] = new Array(spheres.length);

            for (let j = 0; j < spheres.length; j++) {
                collisions[i][j] = Number.MAX_SAFE_INTEGER;
            }
        }

        for (let i = 0; i < spheres.length; i++) {
            let sphere1 = spheres[i];

            for (let j = 0; j <spheres.length; j++) {
                if (i === j) {
                    continue;
                }

                let min = Math.min(i, j);
                let max = Math.max(i, j);
                if (collisions[min][max] !== Number.MAX_SAFE_INTEGER) {
                    continue;
                }

                let sphere2 = spheres[j];

                collisions[min][max] = glMatrix.vec3.distance(sphere1.newTranslate, sphere2.newTranslate);
            }
        }

        for (let i = 0; i < spheres.length; i++) {
            let minDistance = Number.MAX_SAFE_INTEGER;
            let minSphere = i;

            for (let j = 0; j < spheres.length; j++) {
                if (i === j) {
                    continue;
                }

                let distance = collisions[i][j];

                if (distance < minDistance) {
                    minDistance = distance;
                    minSphere = j;
                }
            }

            let sphere1 = spheres[i];
            if (minDistance <= (window.r * 2)) {
                let sphere2 = spheres[minSphere];

                let distanceToRemove = (window.r * 2) - minDistance;

                let length1 = glMatrix.vec3.length(sphere1.speed);
                let length2 = glMatrix.vec3.length(sphere2.speed);

                let speedFactor1;
                let speedFactor2;
                if (length1 > length2) {
                    speedFactor1 = length2 / length1;
                    speedFactor2 = 1 - speedFactor1;
                } else {
                    speedFactor2 = length1 / length2;
                    speedFactor1 = 1 - speedFactor2;
                }

                let reduceFactor1 = 1 - distanceToRemove * speedFactor1 / length1;
                let reduceFactor2 = 1 - distanceToRemove * speedFactor2 / length2;

                let newSpeed1 = [];
                glMatrix.vec3.scale(newSpeed1, sphere1.speed, reduceFactor1);

                let newSpeed2 = [];
                glMatrix.vec3.scale(newSpeed2, sphere2.speed, reduceFactor2);

                glMatrix.vec3.add(sphere1.newTranslate, sphere1.translate, newSpeed1);
                glMatrix.vec3.add(sphere2.newTranslate, sphere2.translate, newSpeed2);

                let normal = [];
                glMatrix.vec3.subtract(normal, sphere2.newTranslate, sphere1.newTranslate);
                glMatrix.vec3.normalize(normal, normal);
                sphere2.speed = calcReflectionVector(sphere2.speed, normal);

                glMatrix.vec3.subtract(normal, sphere1.newTranslate, sphere2.newTranslate);
                glMatrix.vec3.normalize(normal, normal);
                sphere1.speed = calcReflectionVector(sphere1.speed, normal);

                if (sphere1.unhealthy && !sphere2.unhealthy && Math.random() < window.p) {
                    sphere2.unhealthy = true;
                    sphere2.unhealthyTicks = window.z;
                    sphere2.material = mRed;
                    window.k++;
                } else if (sphere2.unhealthy && !sphere1.unhealthy && Math.random() < window.p) {
                    sphere1.unhealthy = true;
                    sphere1.unhealthyTicks = window.z;
                    sphere1.material = mRed;
                    window.k++;
                }

                sphere1.audio.play();
            }

            sphere1.translate = sphere1.newTranslate;
        }
    }

    function calcReflectionVector(speed, normal) {
        let dotTimesTwo = glMatrix.vec3.dot(speed, normal) * 2;

        let nTimesDotTwo = [];
        glMatrix.vec3.scale(nTimesDotTwo, normal, dotTimesTwo);

        let result = [];
        glMatrix.vec3.subtract(result, speed, nTimesDotTwo);

        return result;
    }

    function updateSphereSpeed(sphere) {
        if (!sphere.speed) {
            sphere.speed = [
                Math.random() * .05 - .1,
                Math.random() * .05 - .1,
                Math.random() * .05 - .1,
            ]
        }
    }

    function lightSourceOrbit(i) {
        // Calculate x,z position/eye of light source orbiting the center.
        let light = illumination.light[i];
        let distance = Math.sqrt(light.position[0] * light.position[0] + light.position[1] * light.position[1] + light.position[2] * light.position[2]);
        light.localPosition = [].concat(light.position);
        light.localPosition[0] += distance * Math.sin(light.zAngle);
        light.localPosition[2] += distance * Math.cos(light.zAngle);
    }

    function setProjection() {
        // Set projection Matrix.
        switch (camera.projectionType) {
        case ("ortho"):
            var v = camera.lrtb;
            glMatrix.mat4.ortho(camera.pMatrix, -v, v, -v, v, -10, 100);
            break;
        case ("frustum"):
            var v = camera.lrtb;
            glMatrix.mat4.frustum(camera.pMatrix, -v / 2, v / 2, -v / 2, v / 2,
                    1, 10);
            break;
        case ("perspective"):
            glMatrix.mat4.perspective(camera.pMatrix, camera.fovy, camera.aspect, 1,
                    10);
            break;
        }
        // Set projection uniform.
        gl.uniformMatrix4fv(prog.pMatrixUniform, false, camera.pMatrix);
    }

    /**
     * Update model-view matrix for model.
     */
    function updateTransformations(model) {

        // Use shortcut variables.
        var mMatrix = model.mMatrix;
        var mvMatrix = model.mvMatrix;

        // Reset matrices to identity.
        glMatrix.mat4.identity(mMatrix);
        glMatrix.mat4.identity(mvMatrix);

        // Translate.
        glMatrix.mat4.translate(mMatrix, mMatrix, model.translate);
        // Rotate.
        glMatrix.mat4.rotateX(mMatrix, mMatrix, model.rotate[0]);
        glMatrix.mat4.rotateY(mMatrix, mMatrix, model.rotate[1]);
        glMatrix.mat4.rotateZ(mMatrix, mMatrix, model.rotate[2]);
        // Scale
        glMatrix.mat4.scale(mMatrix, mMatrix, model.scale);

        // Combine view and model matrix
        // by matrix multiplication to mvMatrix.
        glMatrix.mat4.multiply(mvMatrix, camera.vMatrix, mMatrix);

        // Calculate normal matrix from model matrix.
        glMatrix.mat3.normalFromMat4(model.nMatrix, mvMatrix);
    }

    function draw(model) {
        // Setup position VBO.
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
        gl.vertexAttribPointer(prog.positionAttrib, 3, gl.FLOAT,
                    false, 0, 0);

        // Setup normal VBO.
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
        gl.vertexAttribPointer(prog.normalAttrib, 3, gl.FLOAT, false, 0, 0);

        // Setup rendering tris.
        var fill = (model.fillstyle.search(/fill/) != -1);
        if (fill) {
            gl.enableVertexAttribArray(prog.normalAttrib);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
            gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements,
                    gl.UNSIGNED_SHORT, 0);
        }

        // Setup rendering lines.
        var wireframe = (model.fillstyle.search(/wireframe/) != -1);
        if (wireframe) {
            gl.uniform4fv(prog.colorUniform, [ 0., 0., 0., 1. ]);
            gl.disableVertexAttribArray(prog.normalAttrib);
            gl.vertexAttrib3f(prog.normalAttrib, 0, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
            gl.drawElements(gl.LINES, model.iboLines.numberOfElements,
                    gl.UNSIGNED_SHORT, 0);
        }
    }

    // App interface.
    return {
        start : start,
        updateDisplayedVariables: updateDisplayedVariables
    };

}());
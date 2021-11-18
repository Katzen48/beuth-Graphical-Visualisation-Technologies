var icosphere = ( function() {

	function createVertexData() {
		var scale = 0.75
		var r = 1 * scale;
		var recursions = window.sphereVertices || 0;

		// Positions.
		var icoVertices = getIcosahedronVertices(r);

		var iboLines = [];
		var normalVertices = [];
		let trisIndices = [];
		let triangles = [
			[2, 0, 1],
			[5, 2, 1],
			[3, 0, 2],
			[5, 3, 2],
			[4, 0, 3],
			[5, 4, 3],
			[1, 0, 4],
			[5, 1, 4],
		];

		if (recursions < 1) {
			iboLines = [
				0, 1,
				0, 2,
				0, 3,
				0, 4,

				1, 2,
				2, 3,
				3, 4,
				1, 4,

				1, 5,
				2, 5,
				3, 5,
				4, 5,
			];

			triangles.forEach(triangle => trisIndices.push(...triangle));
		} else {
			let triangleVertices = [];
			let triangleIndices = [];

			triangles.forEach(triangle => {

				let x1 = icoVertices[triangle[0] * 3];
				let y1 = icoVertices[triangle[0] * 3 + 1];
				let z1 = icoVertices[triangle[0] * 3 + 2];
				let x2 = icoVertices[triangle[1] * 3];
				let y2 = icoVertices[triangle[1] * 3 + 1];
				let z2 = icoVertices[triangle[1] * 3 + 2];
				let x3 = icoVertices[triangle[2] * 3];
				let y3 = icoVertices[triangle[2] * 3 + 1];
				let z3 = icoVertices[triangle[2] * 3 + 2];

				let returnValue = subdivideSurface(x1, y1, z1, x2, y2, z2, x3, y3, z3, r, recursions);
				returnValue[0].map(index => index + triangleVertices.length / 3).forEach(index => triangleIndices.push(index));
				returnValue[2].map(index => index + triangleVertices.length / 3).forEach(index => trisIndices.push(index));
				returnValue[1].forEach(vertex => triangleVertices.push(vertex));
			});

			icoVertices = triangleVertices;
			iboLines = triangleIndices;
		}

		for (var i = 0; i < trisIndices.length / 3; i++) {
			var p1 = trisIndices[i * 3];
			var p2 = trisIndices[i * 3 + 1];
			var p3 = trisIndices[i * 3 + 2];

			var x1 = icoVertices[p1 * 3];
			var y1 = icoVertices[p1 * 3 + 1];
			var z1 = icoVertices[p1 * 3 + 2];
			var x2 = icoVertices[p2 * 3];
			var y2 = icoVertices[p2 * 3 + 1];
			var z2 = icoVertices[p2 * 3 + 2];
			var x3 = icoVertices[p3 * 3];
			var y3 = icoVertices[p3 * 3 + 1];
			var z3 = icoVertices[p3 * 3 + 2];

			var ux = x2 - x1;
			var uy = y2 - y1;
			var uz = z2 - z1;

			var vx = x3 - x1;
			var vy = y3 - y1;
			var vz = z3 - z1;

			var vecU = glMatrix.vec3.fromValues(ux, uy, uz);
			var vecV = glMatrix.vec3.fromValues(vx, vy, vz);
			var normalVec = glMatrix.vec3.create();
			glMatrix.vec3.cross(normalVec, vecU, vecV);
			glMatrix.vec3.normalize(normalVec, normalVec);

			normalVertices.push(
				normalVec[0],
				normalVec[1],
				normalVec[2]
			);
		}

		this.vertices = new Float32Array(icoVertices.length);
		var vertices = this.vertices;
		this.indicesLines = new Uint16Array(iboLines.length);
		var indicesLines = this.indicesLines;
		this.normals = new Float32Array(normalVertices.length);
		var normals = this.normals;
		this.indicesTris  = new Uint16Array(trisIndices.length);
		var indicesTris = this.indicesTris;

		vertices.set(icoVertices);
		indicesLines.set(iboLines);
		normals.set(normalVertices);

		indicesTris.set(trisIndices);
	}

	function subdivideSurface(x1, y1, z1, x2, y2, z2, x3, y3, z3, r, subDivLeft = 0) {
		if (subDivLeft < 1) {
			return [];
		}

		let vec1 = glMatrix.vec3.fromValues(x1, y1, z1);
		let vec2 = glMatrix.vec3.fromValues(x2, y2, z2);
		let vec3 = glMatrix.vec3.fromValues(x3, y3, z3);

		let vertices = [];
		let indices = [];
		let trisIndices = [];

		// add one subdivision for every corner
		addSubdivided(vec1, vec2, vec3, vertices, indices, trisIndices, r, subDivLeft);
		addSubdivided(vec2, vec3, vec1, vertices, indices, trisIndices, r, subDivLeft);
		addSubdivided(vec3, vec1, vec2, vertices, indices, trisIndices, r, subDivLeft);

		// add middle subdivision
		addSubdivided(vec1, vec2, vec3, vertices, indices, trisIndices, r, subDivLeft, true);

		return [
			indices,
			vertices,
			trisIndices,
		];
	}

	function addSubdivided(vec1, vec2, vec3, vertices, indices, trisIndices, r, subDivLeft = 0, middle = false) {
		let returnValue = middle ? getOrSubdivideMiddle(vec1, vec2, vec3, r, subDivLeft) : getOrSubdivide(vec1, vec2, vec3, r, subDivLeft);
		returnValue[0].map(value => value + vertices.length / 3).forEach(index => indices.push(index));
		returnValue[2].map(value => value + vertices.length / 3).forEach(index => trisIndices.push(index));
		returnValue[1].forEach(vertex => vertices.push(vertex));
	}

	function getOrSubdivideMiddle(edgeVec1, edgeVec2, edgeVec3, r, subDivLeft = 0) {
		let interVec1 = glMatrix.vec3.create();
		glMatrix.vec3.add(interVec1, edgeVec1, edgeVec2);
		glMatrix.vec3.scale(interVec1, interVec1, 0.5);
		glMatrix.vec3.normalize(interVec1, interVec1);
		glMatrix.vec3.scale(interVec1, interVec1, r);

		let interVec2 = glMatrix.vec3.create();
		glMatrix.vec3.add(interVec2, edgeVec2, edgeVec3);
		glMatrix.vec3.scale(interVec2, interVec2, 0.5);
		glMatrix.vec3.normalize(interVec2, interVec2);
		glMatrix.vec3.scale(interVec2, interVec2, r);

		let interVec3 = glMatrix.vec3.create();
		glMatrix.vec3.add(interVec3, edgeVec3, edgeVec1);
		glMatrix.vec3.scale(interVec3, interVec3, 0.5);
		glMatrix.vec3.normalize(interVec3, interVec3);
		glMatrix.vec3.scale(interVec3, interVec3, r);

		if ((subDivLeft - 1) > 0) {
			return subdivideSurface(interVec1[0], interVec1[1], interVec1[2], interVec2[0], interVec2[1], interVec2[2], interVec3[0], interVec3[1], interVec3[2], r, subDivLeft - 1);
		}

		return [
			[
				0, 1,
				1, 2,
				2, 0,
			],
			[
				interVec1[0], interVec1[1], interVec1[2], interVec2[0], interVec2[1], interVec2[2], interVec3[0], interVec3[1], interVec3[2],
			],
			[
				2, 1, 0,
				0, 2, 1,
				1, 0, 2,
				0, 1, 2,
				2, 0, 1,
				1, 2, 0,
			],
		];
	}

	function getOrSubdivide(edgeVec1, edgeVec2, edgeVec3, r, subDivLeft = 0) {
		let interVec1 = glMatrix.vec3.create();
		glMatrix.vec3.add(interVec1, edgeVec1, edgeVec2);
		glMatrix.vec3.scale(interVec1, interVec1, 0.5);

		let interVec2 = glMatrix.vec3.create();
		glMatrix.vec3.add(interVec2, edgeVec1, edgeVec3);
		glMatrix.vec3.scale(interVec2, interVec2, 0.5);

		glMatrix.vec3.normalize(interVec1, interVec1);
		glMatrix.vec3.scale(interVec1, interVec1, r);
		glMatrix.vec3.normalize(interVec2, interVec2);
		glMatrix.vec3.scale(interVec2, interVec2, r);

		let vertices = [
			interVec1[0], interVec1[1], interVec1[2],
			interVec2[0], interVec2[1], interVec2[2],
			edgeVec1[0], edgeVec1[1], edgeVec1[2],
		];

		if ((subDivLeft - 1) > 0) {
			return subdivideSurface(interVec1[0], interVec1[1], interVec1[2], interVec2[0], interVec2[1], interVec2[2], edgeVec1[0], edgeVec1[1], edgeVec1[2], r, subDivLeft - 1);
		}

		return [
			[
				0, 1,
				1, 2,
				2, 0,
			],
			vertices,
			[
				2, 1, 0,
				0, 2, 1,
				1, 0, 2,
				0, 1, 2,
				2, 0, 1,
				1, 2, 0,
			],
		];
	}

	function getIcosahedronVertices(r) {
		return [
			0, r, 0,  // top
			0, 0, r,  // middle front
			r, 0, 0,  // middle right
			0, 0, -r, // middle back
			-r, 0, 0, // middle left
			0, -r, 0, // bottom
		];
	}

	return {
		createVertexData : createVertexData
	}
}());

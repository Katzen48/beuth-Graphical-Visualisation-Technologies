var cube = ( function() {

	function createVertexData() {
		// Positions.
		this.vertices = new Float32Array(3 * 8);
		var vertices = this.vertices;
		// Normals.
		this.normals = new Float32Array(3 * 6 * 4);
		var normals = this.normals;
		// Index data.
		this.indicesLines = new Uint16Array(2 * 4 * 6);
		var indicesLines = this.indicesLines;
		this.indicesTris = new Uint16Array(3 * 2 * 6);
		var indicesTris = this.indicesTris;

		vertices.set([
			// front
			 1, -1,  1,   // 0
			 1,  1,  1,   // 1
			-1,  1,  1,   // 2
			-1, -1,  1,   // 3
			// back
			-1, -1, -1,   // 4
			-1,  1, -1,   // 5
			 1,  1, -1,   // 6
			 1, -1, -1,	  // 7
		]);

		for (let i = 0; i < vertices.length / 3; i++) {
			let x = vertices[i * 3];
			let y = vertices[i * 3 + 1];
			let z = vertices[i * 3 + 2];

			let vertexLength = Math.sqrt(x * x + y * y + z * z);
			normals[i * 3] = x / vertexLength;
			normals[i * 3 + 1] = y / vertexLength;
			normals[i * 3 + 2] = z / vertexLength;
		}

		indicesLines.set([
			// front
			0, 1,
			1, 2,
			2, 3,
			3, 0,
			// right
			7, 6,
			6, 1,
			1, 0,
			0, 7,
			// back
			4, 5,
			5, 6,
			6, 7,
			7, 4,
			// left
			3, 2,
			2, 5,
			5, 4,
			4, 3,
			// bottom
			4, 7,
			7, 0,
			0, 3,
			3, 4,
			// top
			1, 6,
			6, 5,
			5, 2,
			2, 1,
		]);

		let indexTris = 0;
		for (let i = 0; i < indicesLines.length; i += 4) {
			indicesTris[indexTris++] = indicesLines[i + 3];
			indicesTris[indexTris++] = indicesLines[i + 1];
			indicesTris[indexTris++] = indicesLines[i];
		}
	}

	return {
		createVertexData : createVertexData
	}

}());

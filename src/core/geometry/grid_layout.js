// =====================================================================================
// ==================================  grid_layout.js  =================================
// =====================================================================================
// SINGLE source of truth for cell geometry. Both pattern.js (grid build / dimensions /
// index<->xy) and baseShape.js (cell center) must consult this, so square and hex stay
// consistent. Pure JS: no p5 dependency (returns plain {x,y}).
//
// Grid types: "square" (default, current behaviour), "hex_pointy", "hex_flat".
// cell_size = the current engine cellSize (square edge). For hex, the circumradius R is
// derived as cell_size/2 so a hex fits within the same cell box.
"use strict";

const GridLayout = class {
	constructor(type, cell_size) {
		this.type = (type == undefined) ? "square" : type;
		this.setCellSize(cell_size);
	} // constructor()

	setCellSize(cell_size) {
		this.cellSize = cell_size;
		this.R = cell_size / 2;                 // hex circumradius
		if (this.type == "hex_pointy") {
			this.hstep = Math.sqrt(3) * this.R; // horizontal center-to-center
			this.vstep = 1.5 * this.R;          // vertical center-to-center
		}
		else if (this.type == "hex_flat") {
			this.hstep = 1.5 * this.R;
			this.vstep = Math.sqrt(3) * this.R;
		}
		else { // square
			this.hstep = cell_size;
			this.vstep = cell_size;
		}
	} // setCellSize()

	// how many columns / rows fit in the canvas
	dimensions(canvas_w, canvas_h) {
		let cols, rows;
		if (this.type == "hex_pointy") {
			cols = Math.floor((canvas_w - this.hstep / 2) / this.hstep);
			rows = Math.floor((canvas_h - this.R / 2) / this.vstep);
		}
		else if (this.type == "hex_flat") {
			cols = Math.floor((canvas_w - this.R / 2) / this.hstep);
			rows = Math.floor((canvas_h - this.vstep / 2) / this.vstep);
		}
		else {
			cols = Math.floor(canvas_w / this.cellSize);
			rows = Math.floor(canvas_h / this.cellSize);
		}
		return { columns: Math.max(cols, 1), rows: Math.max(rows, 1) };
	} // dimensions()

	// (col,row) -> pixel center, relative to grid origin (add x_offset/y_offset outside)
	cellCenter(col, row) {
		if (this.type == "hex_pointy") {
			let x = this.hstep * col + (row & 1) * (this.hstep / 2) + this.hstep / 2;
			let y = this.vstep * row + this.R;
			return { x: x, y: y };
		}
		if (this.type == "hex_flat") {
			let x = this.hstep * col + this.R;
			let y = this.vstep * row + (col & 1) * (this.vstep / 2) + this.vstep / 2;
			return { x: x, y: y };
		}
		return { x: col * this.cellSize + this.cellSize / 2,
		         y: row * this.cellSize + this.cellSize / 2 };
	} // cellCenter()

	// pixel -> (col,row). Correct inverse of cellCenter (rounded to nearest cell).
	colRowFromXY(x, y) {
		if (this.type == "hex_pointy") {
			let row = Math.round((y - this.R) / this.vstep);
			let col = Math.round((x - (row & 1) * (this.hstep / 2) - this.hstep / 2) / this.hstep);
			return { column: col, row: row };
		}
		if (this.type == "hex_flat") {
			let col = Math.round((x - this.R) / this.hstep);
			let row = Math.round((y - (col & 1) * (this.vstep / 2) - this.vstep / 2) / this.vstep);
			return { column: col, row: row };
		}
		return { column: Math.floor(x / this.cellSize), row: Math.floor(y / this.cellSize) };
	} // colRowFromXY()

	// outline polygon of a cell centered at (cx,cy) — for drawCellGrid()
	cellPolygon(cx, cy) {
		if (this.type == "square") {
			let h = this.cellSize / 2;
			return [ {x:cx-h,y:cy-h}, {x:cx+h,y:cy-h}, {x:cx+h,y:cy+h}, {x:cx-h,y:cy+h} ];
		}
		// hexagon: pointy-top starts at -90deg, flat-top at 0deg
		let start = (this.type == "hex_pointy") ? -Math.PI / 2 : 0;
		let pts = [];
		for (let i = 0; i < 6; i++) {
			let a = start + i * Math.PI / 3;
			pts.push({ x: cx + this.R * Math.cos(a), y: cy + this.R * Math.sin(a) });
		}
		return pts;
	} // cellPolygon()
}; // GridLayout class

export { GridLayout };

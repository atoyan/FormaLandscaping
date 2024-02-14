import { Footprint } from "forma-embedded-view-sdk/geometry";

/** Bounding box for one site */
export type SiteBoundingBox = {
  minMaxX: number[];
  minMaxY: number[];
  footprint: Footprint;
};

/** Return Min/max for a bounding box around the footprint polygon */
export function getFootprintMinMax(footprint: Footprint, axis: "x" | "y"): number[] {
  const index = axis === "x" ? 0 : 1;
  const { coordinates } = footprint;
  return coordinates.reduce(
    (acc: number[], curr: number[]) => {
      acc[0] = Math.min(acc[0], curr[index]);
      acc[1] = Math.max(acc[1], curr[index]);
      return acc;
    },
    [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
  );
}

/** Returns the bounding box of a single footprint polygon */
export function getFootprintBoundingBox(footprint: Footprint): SiteBoundingBox {
  const [minX, maxX] = getFootprintMinMax(footprint, "x");
  const [minY, maxY] = getFootprintMinMax(footprint, "y");
  return {
    minMaxX: [minX, maxX],
    minMaxY: [minY, maxY],
    footprint,
  };
}

export function decimalAdjust(type: "round" | "floor" | "ceil", value: number, exp: number): number {
  // type = String(type);
  if (!["round", "floor", "ceil"].includes(type)) {
    throw new TypeError("The type of decimal adjustment must be one of 'round', 'floor', or 'ceil'.");
  }
  // exp = Number(exp);
  // value = Number(value);
  if (exp % 1 !== 0 || Number.isNaN(value)) {
    return NaN;
  }
  if (exp === 0) {
    return Math[type](value);
  }
  const [magnitude, exponent = 0] = value.toString().split("e");
  const adjustedValue: number = Math[type](+`${magnitude}e${+exponent - exp}`);
  // Shift back
  const [newMagnitude, newExponent = 0] = adjustedValue.toString().split("e");
  return Number(`${newMagnitude}e${+newExponent + exp}`);
}

decimalAdjust("ceil", 1.698, -1); // ?

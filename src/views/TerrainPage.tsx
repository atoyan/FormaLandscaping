import React, { useRef, useState } from "react";
import { Forma } from "forma-embedded-view-sdk/auto";
import { Button } from "@mui/material";
import * as THREE from "three";
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
import { AnalysisGroundGrid } from "forma-embedded-view-sdk/analysis";
import { Footprint } from "forma-embedded-view-sdk/geometry";
import useFootprint from "../hooks/useFootprint";
// @ts-ignore Speed up raycasting using https://github.com/gkjohnson/three-mesh-bvh
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
// @ts-ignore Speed up raycasting using https://github.com/gkjohnson/three-mesh-bvh
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
// @ts-ignore Speed up raycasting using https://github.com/gkjohnson/three-mesh-bvh
THREE.Mesh.prototype.raycast = acceleratedRaycast;
// @ts-ignore Using Ray caster to find intersecting elements
const raycaster = new THREE.Raycaster();
// @ts-ignore For this analysis we only need the first hit, which is faster to compute
raycaster.firstHitOnly = true;

type PolygonLimits = {
  minMaxX: number[];
  minMaxY: number[];
  minZ: number;
  coordinates: number[][];
};

export function TerrainPage(): JSX.Element {
  const [urn, setUrn] = useState<string>();
  const sites = useFootprint(urn, "site_limit");
  const minZRef = useRef<number>(0);
  const SCALE = 0.5;
  const steepness = 4;

  function pointInPolygon(polygon: number[][], point: number[]): boolean {
    // A point is in a polygon if a line from the point to infinity crosses the polygon an odd number of times
    let odd = false;
    // For each edge (In this case for each point of the polygon and the previous one)
    for (let i = 0, j = polygon.length - 1; i < polygon.length; i++) {
      // If a line from the point into infinity crosses this edge
      if (
        polygon[i][1] > point[1] !== polygon[j][1] > point[1] && // One point needs to be above, one below our y coordinate
        // ...and the edge doesn't cross our Y coordinate before our x coordinate (but between our x coordinate and infinity)
        point[0] <
          ((polygon[j][0] - polygon[i][0]) * (point[1] - polygon[i][1])) / (polygon[j][1] - polygon[i][1]) +
            polygon[i][0]
      ) {
        // Invert odd
        odd = !odd;
      }
      j = i;
    }
    // If the number of crossings was odd, the point is in the polygon
    return odd;
  }

  const getScene = (triangles: Float32Array): THREE.Scene => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(triangles, 3));
    const material = new THREE.MeshBasicMaterial();
    material.side = THREE.DoubleSide;

    // @ts-ignore Creates a bounding tree for the geometry
    geometry.computeBoundsTree();
    const mesh = new THREE.Mesh(geometry, material);
    const scene = new THREE.Scene();
    const copy = mesh.clone();
    scene.add(mesh);
    console.log("🚀 ~ triangles:", triangles);
    return scene;
  };

  const createTerrainScene = async (): Promise<THREE.Scene> => {
    const [terrain] = await Forma.geometry.getPathsByCategory({
      category: "terrain",
    });

    const terrainTriangles = await Forma.geometry.getTriangles({
      path: terrain,
    });

    return getScene(terrainTriangles);
  };

  const getTerrainMask = async (coordinates: number[][]): Promise<Float32Array | null> => {
    if (!sites?.siteLimits?.length) {
      return null;
    }
    const scene = await createTerrainScene();
    const direction = new THREE.Vector3(0, 0, -1);
    const origin = new THREE.Vector3(0, 0, 10000);
    const threshold = Math.atan2(1, steepness);
    const { height, width, siteLimits, minX, maxY } = sites;
    const mask: Float32Array = new Float32Array(width * height).fill(NaN);

    for (let rowIndex = 0; rowIndex < height; rowIndex++) {
      origin.y = maxY - SCALE / 2 - SCALE * rowIndex;
      for (let columnIndex = 0; columnIndex < width; columnIndex++) {
        origin.x = minX + SCALE / 2 + SCALE * columnIndex;
        raycaster.set(origin, direction);
        const intersection = raycaster.intersectObjects(scene.children)[0];

        if (intersection != null) {
          const { normal } = intersection!.face!;
          const slope = Math.abs(Math.PI / 2 - Math.atan(normal.z / Math.sqrt(normal.x ** 2 + normal.y ** 2)));
          if (pointInPolygon(coordinates, [origin.x, origin.y])) {
            // console.log("🚀 ~ intersection!.face!:", intersection!.face!);
            mask[rowIndex * width + columnIndex] = slope > threshold ? 0 : 1;
          }
          //   siteLimits.forEach((limit) => {
          //     const { footprint } = limit;
          //     if (pointInPolygon(footprint.coordinates, [origin.x, origin.y])) {
          //       // Areas that are above a given threshold
          //       mask[rowIndex * width + columnIndex] = slope > threshold ? 0 : 1;
          //     }
          //   });
        }
      }
    }
    return mask;
  };

  const createCanvasFromSlope = async (
    width: number,
    height: number,
    position: THREE.Vector3,
    mask: Float32Array,
  ): Promise<void> => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    // const { red, green } = colors;

    mask.forEach((point, i) => {
      const x = Math.floor(i % width);
      const y = Math.floor(i / width);
      if (Number.isNaN(point)) {
        //     const x = Math.floor(i % width);
        //     const y = Math.floor(i / width);
        ctx!.fillStyle = "#FFff00";
        ctx!.fillRect(x, y, Math.round(SCALE), Math.round(SCALE));

        //     ctx!.fillRect(x, y, Math.round(SCALE), Math.round(SCALE));
        return;
      }

      ctx!.fillStyle = point === 0 ? "red" : "green";

      ctx!.fillRect(x, y, Math.round(SCALE), Math.round(SCALE));
    });

    // if (isTextureAddedRef.current) {
    //   await Forma.terrain.groundTexture.updateTextureData({
    //     name: "TERRAIN",
    //     canvas,
    //   });
    //   return;
    // }
    await Forma.terrain.groundTexture.remove({ name: "TERRAIN" });

    await Forma.terrain.groundTexture.add({
      name: "TERRAIN",
      canvas,
      position,
      scale: { x: SCALE, y: SCALE },
    });
  };

  const calculateSteepness = async (coordinates: number[][]): Promise<AnalysisGroundGrid | null> => {
    if (!sites?.siteLimits?.length) {
      return null;
    }

    const { height, width, position, minX, maxY } = sites;
    const mask = await getTerrainMask(coordinates);
    if (mask == null) {
      return null;
    }
    const pos = new THREE.Vector3(position[0], position[1], position[2]);

    await createCanvasFromSlope(width, height, pos, mask);
    // if (!checkboxRef?.current?.checked) {
    //   onMaskChanged(null);
    //   return;
    // }
    // TODO - Create an AnalysisGroundGrid and pass it to the event handler
    const analysis: AnalysisGroundGrid = {
      grid: mask,
      width,
      height,
      x0: minX,
      y0: maxY,
      resolution: 0.5,
      scale: { x: 0.5, y: 0.5 },
    };

    return analysis;
  };

  /** Return Min/max for a bounding box around the footprint polygon */
  function getFootprintMinMax(footprint: Footprint, axis: "x" | "y"): number[] {
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

  const drawBuildingPoly = async (poly: PolygonLimits): Promise<void> => {
    const width = (poly.minMaxX[1] - poly.minMaxX[0]) / SCALE;
    const height = (poly.minMaxY[1] - poly.minMaxY[0]) / SCALE;
    const mask = new Float32Array(width * height).fill(NaN);
    const x = poly.minMaxX[0] + (width * SCALE) / 2;
    const y = poly.minMaxY[1] - (height * SCALE) / 2;
    // await createCanvasFromSlope(width, height, new THREE.Vector3(x, y, 100), mask);
  };

  const getBuildingPoly = async (): Promise<PolygonLimits> => {
    const selectedElements = await Forma.selection.getSelection();
    const triangles = await Forma.geometry.getTriangles({ path: selectedElements[0] });
    const coordsX = triangles.filter((_, index) => index % 3 === 0);
    const coordsY = triangles.filter((_, index) => index % 3 === 1);
    const minZ = Math.min(...triangles.filter((_, index) => index % 3 === 2));
    const minX = Math.min(...coordsX);
    const maxX = Math.max(...coordsX);
    const minY = Math.min(...coordsY);
    const maxY = Math.max(...coordsY);
    const coordinates = [
      [minX, maxY],
      [maxX, maxY],
      [maxX, minY],
      [minX, minY],
      [minX, maxY],
    ];
    const limits = {
      minMaxX: [minX, maxX],
      minMaxY: [minY, maxY],
      minZ,
      coordinates,
    };
    minZRef.current = minZ;
    await drawBuildingPoly(limits);
    return limits;
    //     return triangles.reduce((acc, coord, index) => {
    //       if (index % 3 === 0) {
    //         return { ...acc, lowestZ: Math.min(acc.lowestZ, coord) };
    //       }
    //       return acc;
    //     }, result);
  };

  const handleTerrainClicked = async (): Promise<void> => {
    setUrn(await Forma.proposal.getRootUrn());
    if (sites == null) {
      return;
    }
    const buildingPoly = await getBuildingPoly();
    const analysis = await calculateSteepness(buildingPoly.coordinates);
  };

  return (
    <div>
      <Button onClick={handleTerrainClicked}>Get Terrain</Button>
    </div>
  );
}

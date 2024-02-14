import { Forma } from "forma-embedded-view-sdk/auto";
import { useEffect, useState } from "react";
import { Footprint } from "forma-embedded-view-sdk/geometry";
import { SiteBoundingBox, getFootprintBoundingBox } from "../utils/FootprintHelpers";

/** Bounding box for all sites */
type SitesBoundingBox = {
  width: number;
  height: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  position: number[];
  siteLimits: SiteBoundingBox[];
};

// category can be site_limit, building etc.
export default function useFootprint(urn: string | undefined, category: string): SitesBoundingBox | null {
  const [geometry, setGeometry] = useState<SitesBoundingBox | null>();
  const SCALE = 0.5;

  useEffect(() => {
    if (!urn) {
      return;
    }

    async function getFootprints(): Promise<void> {
      const paths = await Forma.geometry.getPathsByCategory({ urn, category });
      const promises: Promise<Footprint>[] = [];
      paths.forEach((sitePath) => {
        const promise = Forma.geometry.getFootprint({ path: sitePath, urn });
        if (promise != null) {
          promises.push(promise as Promise<Footprint>);
        }
      });

      const results = await Promise.all(promises);
      const siteLimits = results.filter((fp) => fp != null).map((fp) => getFootprintBoundingBox(fp));
      const coordsX = siteLimits.reduce((acc: number[], limit) => [...acc, ...limit.minMaxX], []);
      const coordsY = siteLimits.reduce((acc: number[], limit) => [...acc, ...limit.minMaxY], []);

      const maxX = Math.ceil(Math.max(...coordsX));
      const minX = Math.floor(Math.min(...coordsX));
      const maxY = Math.ceil(Math.max(...coordsY));
      const minY = Math.floor(Math.min(...coordsY));
      const siteWidth = (maxX - minX) / SCALE;
      const siteHeight = (maxY - minY) / SCALE;
      const x = minX + (siteWidth * SCALE) / 2;
      const y = maxY - (siteHeight * SCALE) / 2;
      const position: number[] = [x, y, 29];

      setGeometry({
        height: siteHeight,
        width: siteWidth,
        maxX,
        minX,
        maxY,
        minY,
        siteLimits,
        position,
      });
    }

    getFootprints();
  }, [urn, category]);

  return geometry ?? null;
}

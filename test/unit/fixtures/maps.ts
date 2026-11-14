import maps from "../../fixtures/book-maps.json";
import { ResolvedMapSchema } from "../../../src/schema";
export const resolvedMaps = () =>
  maps.map(({ id, map }) => ({ id, map: ResolvedMapSchema.parse(map) }));

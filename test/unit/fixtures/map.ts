import fixture from "../../fixtures/map.json";
import { ResolvedMapSchema } from "../../../src/schema";
export const resolvedFixture = () =>
  ResolvedMapSchema.parse(structuredClone(fixture));

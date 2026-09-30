import { describe, expect, it } from "vitest";
import { readSentence } from "@/lib/reports/imagingParser";
import { REGIONS } from "@/lib/medical/report";

const read = (s: string) => readSentence(s, 1, "t")?.finding ?? null;
const where = (s: string) => {
  const f = read(s);
  return f ? { structures: f.anatomicalStructures, region: f.location?.region ?? null, negated: !!f.negated } : null;
};

describe("X-ray text: bones (Sections 107, 111, 113)", () => {
  it("places a statement on the named bone and side", () => {
    expect(where("Fracture of the shaft of the right femur.")).toEqual({ structures: ["right_femur"], region: "right_femur_shaft", negated: false });
    expect(where("Undisplaced fracture of the left distal radius.")).toEqual({ structures: ["left_radius"], region: "left_radius_distal", negated: false });
    expect(where("Right femoral neck fracture.")).toEqual({ structures: ["right_femur"], region: "right_femur_proximal", negated: false });
    expect(where("Fracture of the left 7th rib.")).toEqual({ structures: ["left_seventh_rib"], region: null, negated: false });
    expect(where("Fracture at the base of the right 5th metatarsal.")).toEqual({ structures: ["right_fifth_metatarsal_bone"], region: null, negated: false });
    expect(where("Left clavicle: displaced fracture of the middle third.")?.structures).toEqual(["left_clavicle"]);
  });

  it("never swaps left and right for bones", () => {
    expect(where("Left tibia: fracture of the shaft.")!.structures).toEqual(["left_tibia"]);
    expect(where("Right tibia: fracture of the shaft.")!.structures).toEqual(["right_tibia"]);
  });

  it("no side: both bones, no region", () => {
    expect(where("Fracture of the femur, distal end.")).toEqual({ structures: ["left_femur", "right_femur"], region: null, negated: false });
  });

  it("two ends named: no region is guessed", () => {
    expect(where("Right humerus: proximal and distal fractures.")).toEqual({ structures: ["right_humerus"], region: null, negated: false });
  });

  it("negated bone findings are listed, never marked", () => {
    expect(where("No fracture of the left tibia.")).toEqual({ structures: [], region: null, negated: true });
    expect(read("No fracture or dislocation.")).toBeNull();
  });

  it("vertebrae: one named level with spine context", () => {
    expect(where("Wedge compression fracture of D12 vertebral body.")!.structures).toEqual(["twelfth_thoracic_vertebra"]);
    expect(where("Lumbar spine: anterior wedging of L1.")!.structures).toEqual(["first_lumbar_vertebra"]);
    expect(where("Collapse of the fourth lumbar vertebra.")!.structures).toEqual(["fourth_lumbar_vertebra"]);
  });

  it("vertebrae: a level range or a code without spine context is not placed", () => {
    expect(read("Lumbar spine: L4-L5 disc space narrowing.")).toBeNull();
    expect(read("Lumbar spine: L4-5 disc space narrowing.")).toBeNull();
    expect(read("Lumbar spine: L5-S1 disc space narrowing.")).toBeNull();
    // "T4" in a thyroid line is a hormone, not a vertebra.
    expect(read("T4 prominent, thyroid nodule noted.")).toBeNull();
  });

  it("words shared with vessels, nerves or sinuses do not point to a bone", () => {
    expect(read("Femoral artery calcification.")).toBeNull();
    expect(read("Maxillary sinus mucosal thickening.")).toBeNull();
  });

  it("chest X-ray: heart and lung zones", () => {
    expect(where("Cardiac shadow is enlarged.")!.structures).toEqual(["heart"]);
    expect(where("Haziness in the right lower zone.")).toEqual({ structures: ["right_lung"], region: null, negated: false });
  });

  it("every long-bone region is a displayable overlay on its own bone", () => {
    for (const b of ["femur", "tibia", "fibula", "humerus", "radius", "ulna"])
      for (const side of ["left", "right"])
        for (const part of ["proximal", "shaft", "distal"]) {
          const r = REGIONS[`${side}_${b}_${part}`];
          expect(r, `${side}_${b}_${part}`).toBeTruthy();
          expect(r!.parentStructure).toBe(`${side}_${b}`);
        }
  });
});

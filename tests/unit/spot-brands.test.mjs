import test from "node:test";
import assert from "node:assert/strict";
import brands from "../../brand-utils.js";

const joint = { brand: "chiikawa", additionalBrands: ["chiikawa_sushi"] };

test("explicit cohosted series retain the main popup and match either filter once", () => {
  assert.deepEqual(brands.getSpotBrands(joint), ["chiikawa", "chiikawa_sushi"]);
  assert.equal(brands.matchesBrand(joint, "chiikawa"), true);
  assert.equal(brands.matchesBrand(joint, "chiikawa_sushi"), true);
  assert.equal(brands.matchesAnyBrand(joint, new Set(["chiikawa", "chiikawa_sushi"])), true);
  assert.equal(brands.matchesAnyBrand(joint, new Set()), false);
});

test("sushi wording and Kura Sushi do not imply membership in the existing sushi series", () => {
  for (const name of ["くら寿司×ちいかわ", "むちゃうま!!ちいかわ寿司"]) {
    assert.equal(brands.matchesBrand({ name, brand: "chiikawa" }, "chiikawa_sushi"), false);
  }
  assert.equal(brands.matchesBrand({ brand: "chiikawa_sushi" }, "chiikawa_sushi"), true);
  assert.equal(brands.matchesBrand(joint, ""), true);
});

test("the existing sushi filter remains selectable with zero current venues and across history loads", () => {
  assert.deepEqual(brands.getFilterBrands([]), ["chiikawa_sushi"]);
  const values = brands.getFilterBrands([joint, { brand: "chiikawa_sushi" }, { brand: "chiikawaland" }]);
  assert.equal(values.filter(value => value === "chiikawa_sushi").length, 1);
  assert.equal(values.includes("chiikawa"), true);
  assert.equal(values.includes("chiikawaland"), true);
});

test("additional series must use distinct existing keys and cannot repeat the main brand", () => {
  const allowed = new Set(["chiikawa", "chiikawa_sushi"]);
  assert.equal(brands.validAdditionalBrands(joint, allowed), true);
  assert.equal(brands.validAdditionalBrands({ brand: "chiikawa" }, allowed), true);
  for (const extra of [null, [], "chiikawa_sushi", ["chiikawa"], ["chiikawa_sushi", "chiikawa_sushi"], ["kura_sushi"]]) {
    assert.equal(brands.validAdditionalBrands({ brand: "chiikawa", additionalBrands: extra }, allowed), false);
  }
});

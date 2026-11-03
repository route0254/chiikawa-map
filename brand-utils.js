(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SpotBrands = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // This existing series stays discoverable even when current venues are empty.
  const persistentBrands = ["chiikawa_sushi"];
  function getSpotBrands(spot) {
    return [...new Set([spot.brand || "other",
      ...(Array.isArray(spot.additionalBrands) ? spot.additionalBrands : [])])];
  }
  function getFilterBrands(spots) {
    return [...new Set([...persistentBrands, ...spots.flatMap(getSpotBrands)])];
  }
  function matchesBrand(spot, brand) {
    return !brand || getSpotBrands(spot).includes(brand);
  }
  function matchesAnyBrand(spot, brands) {
    return !brands || getSpotBrands(spot).some(brand => brands.has(brand));
  }
  function validAdditionalBrands(spot, allowedBrands) {
    if (!Object.hasOwn(spot, "additionalBrands")) return true;
    const extra = spot.additionalBrands;
    return Array.isArray(extra) && extra.length > 0 &&
      new Set(extra).size === extra.length &&
      extra.every(brand => typeof brand === "string" &&
        allowedBrands.has(brand) && brand !== spot.brand);
  }
  return { getSpotBrands, getFilterBrands, matchesBrand, matchesAnyBrand, validAdditionalBrands };
});

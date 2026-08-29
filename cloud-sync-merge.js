"use strict";

(function initializeCloudMerge(
  root,
  factory
) {
  const api = factory();

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.ChiikatsuCloudMerge = api;
  }
})(
  typeof globalThis === "object"
    ? globalThis
    : this,
  () => {
    function chooseNewestRecord(
      first,
      second
    ) {
      if (!first) {
        return second || null;
      }
      if (!second) {
        return first;
      }
      if (
        first.updatedAt !==
          second.updatedAt
      ) {
        return first.updatedAt >
          second.updatedAt
          ? first
          : second;
      }
      return first.deviceId >=
        second.deviceId
        ? first
        : second;
    }


    function mergeRecordMaps(
      first,
      second
    ) {
      const ids =
        new Set([
          ...Object.keys(first),
          ...Object.keys(second)
        ]);

      return Object.fromEntries(
        Array.from(ids)
          .sort()
          .map(
            id => [
              id,
              chooseNewestRecord(
                first[id],
                second[id]
              )
            ]
          )
      );
    }


    function mergePayloads(
      first,
      second
    ) {
      return {
        favorites:
          mergeRecordMaps(
            first.favorites,
            second.favorites
          ),
        visited:
          mergeRecordMaps(
            first.visited,
            second.visited
          ),
        visitDetails:
          mergeRecordMaps(
            first.visitDetails,
            second.visitDetails
          ),
        plan:
          chooseNewestRecord(
            first.plan,
            second.plan
          )
      };
    }


    return {
      chooseNewestRecord,
      mergePayloads,
      mergeRecordMaps
    };
  }
);

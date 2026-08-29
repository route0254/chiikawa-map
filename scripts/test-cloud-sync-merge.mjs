import assert from "node:assert/strict";
import mergeApi from "../cloud-sync-merge.js";


const {
  chooseNewestRecord,
  mergePayloads
} = mergeApi;


function record(
  value,
  updatedAt,
  deviceId
) {
  return {
    value,
    updatedAt,
    deviceId
  };
}


function payload(
  values = {}
) {
  return {
    favorites:
      values.favorites || {},
    visited:
      values.visited || {},
    visitDetails:
      values.visitDetails || {},
    plan:
      values.plan || null
  };
}


{
  const cloud = payload({
    favorites: {
      "cloud-only":
        record(
          true,
          100,
          "device-a"
        )
    },
    visited: {
      "visited-cloud":
        record(
          true,
          110,
          "device-a"
        )
    }
  });
  const emptyDevice = payload();
  const merged =
    mergePayloads(
      emptyDevice,
      cloud
    );

  assert.deepEqual(
    merged,
    cloud,
    "空の2台目でクラウド記録を消さない"
  );
}


{
  const firstDevice = payload({
    favorites: {
      "first-only":
        record(
          true,
          100,
          "device-a"
        )
    }
  });
  const secondDevice = payload({
    favorites: {
      "second-only":
        record(
          true,
          0,
          "device-b"
        )
    }
  });
  const merged =
    mergePayloads(
      secondDevice,
      firstDevice
    );

  assert.deepEqual(
    Object.keys(
      merged.favorites
    ),
    [
      "first-only",
      "second-only"
    ],
    "別端末の異なる記録を追加統合する"
  );
}


{
  const earlier =
    record(
      true,
      100,
      "device-a"
    );
  const laterDeletion =
    record(
      false,
      200,
      "device-b"
    );

  assert.equal(
    chooseNewestRecord(
      earlier,
      laterDeletion
    ),
    laterDeletion,
    "同じ項目だけは新しい変更を優先する"
  );
}


{
  const firstDevice = payload({
    favorites: {
      "favorite-a":
        record(
          true,
          100,
          "device-a"
        )
    },
    visited: {
      "visited-a":
        record(
          true,
          150,
          "device-a"
        )
    }
  });
  const secondDevice = payload({
    favorites: {
      "favorite-a":
        record(
          false,
          200,
          "device-b"
        )
    },
    visited: {
      "visited-b":
        record(
          true,
          210,
          "device-b"
        )
    }
  });
  const merged =
    mergePayloads(
      firstDevice,
      secondDevice
    );

  assert.equal(
    merged.favorites["favorite-a"]
      .value,
    false,
    "同じ行きたい項目の後の解除を反映する"
  );
  assert.equal(
    merged.visited["visited-a"]
      .value,
    true,
    "別の訪問記録は保持する"
  );
  assert.equal(
    merged.visited["visited-b"]
      .value,
    true,
    "2台目の訪問記録を追加する"
  );
}


{
  const earlierPlan =
    record(
      ["a", "b"],
      100,
      "device-a"
    );
  const laterPlan =
    record(
      ["b", "a", "c"],
      200,
      "device-b"
    );
  const merged =
    mergePayloads(
      payload({
        plan: earlierPlan
      }),
      payload({
        plan: laterPlan
      })
    );

  assert.equal(
    merged.plan,
    laterPlan,
    "順序付きの今日のプランは最後の編集全体を優先する"
  );
}


console.log(
  "Cloud sync merge tests passed."
);

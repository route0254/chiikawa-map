const allowedStatuses = new Set([
  "managed",
  "hold",
  "excluded"
]);


export function auditSpecialSeries(
  catalog,
  source
) {
  const errors = [];
  const entries =
    catalog.entries || [];
  const sourceKeys = new Set(
    (source.series || []).map(
      series => series.key
    )
  );
  const catalogKeys = new Set();
  const mappedSourceKeys = new Set();

  entries.forEach(entry => {
    if (!entry.key) {
      errors.push(
        "台帳に key のない項目があります"
      );
      return;
    }

    if (catalogKeys.has(entry.key)) {
      errors.push(
        `台帳の key が重複しています: ${entry.key}`
      );
    }
    catalogKeys.add(entry.key);

    if (!allowedStatuses.has(entry.status)) {
      errors.push(
        `未対応の status です: ${entry.key} (${entry.status})`
      );
    }

    const sourceKey = entry.sourceKey;

    if (entry.status === "managed") {
      if (!sourceKey) {
        errors.push(
          `managed 項目に sourceKey がありません: ${entry.key}`
        );
      } else if (!sourceKeys.has(sourceKey)) {
        errors.push(
          `原本にない sourceKey です: ${entry.key} -> ${sourceKey}`
        );
      } else if (mappedSourceKeys.has(sourceKey)) {
        errors.push(
          `sourceKey が複数項目に割り当てられています: ${sourceKey}`
        );
      } else {
        mappedSourceKeys.add(sourceKey);
      }
    } else {
      if (!entry.reason) {
        errors.push(
          `${entry.status} 項目に理由がありません: ${entry.key}`
        );
      }

      if (sourceKey) {
        errors.push(
          `${entry.status} 項目には sourceKey を設定できません: ${entry.key}`
        );
      }
    }

    if (
      !Array.isArray(entry.sourceUrls) ||
      !entry.sourceUrls.length
    ) {
      errors.push(
        `公式URLがありません: ${entry.key}`
      );
    } else {
      entry.sourceUrls.forEach(url => {
        try {
          new URL(url);
        } catch {
          errors.push(
            `公式URLの形式が不正です: ${entry.key} (${url})`
          );
        }
      });
    }
  });

  const unmappedSourceKeys =
    [...sourceKeys].filter(
      key => !mappedSourceKeys.has(key)
    );

  unmappedSourceKeys.forEach(key => {
    errors.push(
      `原本の系列が台帳にありません: ${key}`
    );
  });

  const statusCounts = Object.fromEntries(
    [...allowedStatuses].map(status => [
      status,
      entries.filter(
        entry => entry.status === status
      ).length
    ])
  );

  return {
    valid: errors.length === 0,
    errors,
    statusCounts,
    pending: entries.filter(
      entry => entry.status === "hold"
    ),
    excluded: entries.filter(
      entry => entry.status === "excluded"
    ),
    sourceSeriesCount: sourceKeys.size,
    mappedSourceSeriesCount:
      mappedSourceKeys.size
  };
}

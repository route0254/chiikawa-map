const configUrl =
  new URL(
    "./firebase-config.json",
    import.meta.url
  );

try {
  const response =
    await fetch(
      configUrl,
      {
        cache: "no-store"
      }
    );

  if (response.ok) {
    const config =
      await response.json();

    const enabledHosts =
      Array.isArray(
        config.enabledHosts
      )
        ? config.enabledHosts
        : [];
    const hostIsEnabled =
      enabledHosts.length === 0 ||
      enabledHosts.includes(
        window.location.hostname
      );
    const localDebugIsEnabled =
      [
        "localhost",
        "127.0.0.1"
      ].includes(
        window.location.hostname
      ) &&
      window.localStorage.getItem(
        "chiikawa-map-firebase-debug-v1"
      ) === "1";

    if (
      config.enabled &&
      (
        hostIsEnabled ||
        localDebugIsEnabled
      )
    ) {
      window.__CHIIKATSU_FIREBASE_CONFIG__ =
        config;
      const syncModuleUrl =
        new URL(
          "./cloud-sync.js",
          import.meta.url
        );

      if (config.version) {
        syncModuleUrl.searchParams.set(
          "v",
          config.version
        );
      }

      await import(
        syncModuleUrl.href
      );
    }
  }
} catch (error) {
  console.warn(
    "クラウド保存の設定を確認できませんでした。",
    error
  );
}

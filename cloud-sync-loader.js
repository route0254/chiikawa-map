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

    if (config.enabled) {
      window.__CHIIKATSU_FIREBASE_CONFIG__ =
        config;
      await import(
        new URL(
          "./cloud-sync.js",
          import.meta.url
        ).href
      );
    }
  }
} catch (error) {
  console.warn(
    "クラウド保存の設定を確認できませんでした。",
    error
  );
}

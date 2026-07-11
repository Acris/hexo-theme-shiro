;(() => {
    'use strict';

    // Shared client helpers for feature bootstraps. Built by concatenating
    // source/js/_src/runtime/*.js → source/js/runtime.min.js (see tools/build-assets.js).
    // Namespace: window.__shiro.runtime (flat window.__shiroRuntime kept as alias).
    // Config lives on window.__shiro bare keys only; read via runtime.get (not bag.get).
    const root = (window.__shiro = window.__shiro || {});
    if (window.__shiroRuntime || root.runtime) return;

    const assetTimeout = 12000;
    const featureReadyTimeout = 8000;
    // In-flight loadAsset promises keyed by selector (or tag:src/href).
    const assetInflight = new Map();
    // Feature readiness channels: script onload ≠ usable; wait for featureReady/Abort.
    const featureChannels = new Map();

import { generateSW } from "workbox-build";

const { count, size, warnings } = await generateSW({
  globDirectory: "dist",
  globPatterns: ["**/*.{html,js,css,png,svg,ico,webmanifest,woff2}", "map/fonts/**/*.pbf"],
  globIgnores: ["sw.js", "workbox-*.js"],
  navigateFallback: "/index.html",
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  swDest: "dist/sw.js",
});

console.log(`Precached ${count} files, ${(size / 1024).toFixed(1)} KiB`);

if (warnings.length > 0) {
  console.error(warnings.join("\n"));
  process.exit(1);
}

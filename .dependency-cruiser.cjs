/** Module boundaries from docs/architecture.md, enforced in CI via `npm run depcheck`. */

const modules = ["shared", "engine", "game", "commentary", "i18n", "platform", "ui"];

const allowed = {
  shared: [],
  engine: ["shared"],
  game: ["engine", "shared"],
  i18n: ["shared"],
  commentary: ["engine", "i18n", "shared"],
  platform: ["shared", "game"],
  ui: ["game", "engine", "commentary", "i18n", "platform", "shared"],
};

const boundaryRules = modules.map((name) => {
  const forbidden = modules.filter((m) => m !== name && !allowed[name].includes(m));
  return {
    name: `${name}-allowed-dependencies`,
    comment: `src/${name} may only import: ${allowed[name].join(", ") || "nothing from src"}.`,
    severity: "error",
    from: { path: `^src/${name}/` },
    to: { path: `^src/(${forbidden.join("|")})/`, pathNot: `^src/${name}/` },
  };
});

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    ...boundaryRules.filter((r) => !r.to.path.includes("()")),
    {
      name: "ui-uses-public-index-only",
      comment: "ui talks to engine and game only through their public index.ts.",
      severity: "error",
      from: { path: "^src/ui/" },
      to: { path: "^src/(engine|game)/", pathNot: "^src/(engine|game)/index\\.ts$" },
    },
    {
      name: "only-composition-root-imports-ui",
      comment: "Only main.tsx (and ui itself) may import src/ui.",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/(ui/|main\\.tsx$)" },
      to: { path: "^src/ui/" },
    },
    {
      name: "only-ui-and-root-import-platform",
      comment: "Only ui and the composition root import platform.",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/(ui/|platform/|main\\.tsx$)" },
      to: { path: "^src/platform/" },
    },
    {
      name: "engine-game-no-browser-packages",
      comment: "engine and game stay pure: no React or DOM-bound packages.",
      severity: "error",
      from: { path: "^src/(engine|game)/" },
      to: { path: "node_modules/(react|react-dom|three)/" },
    },
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
  ],
  options: {
    parser: "swc",
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.tsx?$" },
  },
};

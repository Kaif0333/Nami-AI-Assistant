import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";

const manifestPath = process.argv[2] ?? "src-tauri/Cargo.toml";
const args = ["check", "--manifest-path", manifestPath];

const cargoPath = findCargo();

if (!cargoPath) {
  console.error(
    "Cargo was not found. Install Rust with rustup and ensure Cargo is available on PATH."
  );
  process.exit(1);
}

const result = spawnSync(cargoPath, args, {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);

function findCargo() {
  const executableName = process.platform === "win32" ? "cargo.exe" : "cargo";
  const pathCandidates = (process.env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean)
    .map((entry) => join(entry, executableName));

  const rustupCandidates = [
    process.env.CARGO_HOME ? join(process.env.CARGO_HOME, "bin", executableName) : null,
    process.env.USERPROFILE ? join(process.env.USERPROFILE, ".cargo", "bin", executableName) : null,
    process.env.HOME ? join(process.env.HOME, ".cargo", "bin", executableName) : null,
  ].filter(Boolean);

  return [...pathCandidates, ...rustupCandidates].find((candidate) => existsSync(candidate));
}

import { dirname, delimiter, join } from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/with-cargo-env.mjs <command> [...args]");
  process.exit(1);
}

const cargoPath = findCargo();

if (!cargoPath) {
  console.error(
    "Cargo was not found. Install Rust with rustup and ensure Cargo is available on PATH."
  );
  process.exit(1);
}

const cargoBin = dirname(cargoPath);
const env = {
  ...process.env,
  PATH: `${cargoBin}${delimiter}${process.env.PATH ?? ""}`,
};

const result = spawnSync(command, args, {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
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

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$rootPackage = Get-Content -Raw -LiteralPath (Join-Path $repoRoot "package.json") | ConvertFrom-Json
$version = $rootPackage.version
$releaseDir = Join-Path $repoRoot "release"
$stagingRoot = Join-Path $releaseDir "mcp-server-package"
$stagingDir = Join-Path $stagingRoot "deskatom-mcp-server"
$zipPath = Join-Path $releaseDir "deskatom-mcp-server-v$version.zip"
$sourceDir = Join-Path $repoRoot "mcp-server"

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
if (Test-Path $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}
if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

$files = @(
  "mcpServer.js",
  "taskStore.js",
  "aiService.js",
  "package.json",
  "package-lock.json",
  "README.md"
)

foreach ($file in $files) {
  $source = Join-Path $sourceDir $file
  if (Test-Path $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $stagingDir $file)
  }
}

Compress-Archive -LiteralPath $stagingDir -DestinationPath $zipPath -Force
Remove-Item -LiteralPath $stagingRoot -Recurse -Force

Write-Host "Created $zipPath"

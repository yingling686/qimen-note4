param([string]$Destination='\\192.168.110.2\docker\qimen-note4')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$resolvedDestination=[IO.Path]::GetFullPath($Destination)
if($resolvedDestination.TrimEnd('\') -notin @('\\192.168.110.2\home\qimen-note4','\\192.168.110.2\docker\qimen-note4')) {
  throw 'Only the configured NAS qimen-note4 project destinations are allowed.'
}
New-Item -ItemType Directory -Path $resolvedDestination -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $resolvedDestination 'data') -Force | Out-Null
$backupStamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$roots=@('node','engine','src','tests','tools','diagnostics','vendor\zectrix-local-push-sdk')
$files=@('Cargo.toml','Cargo.lock','package.json','package-lock.json','Dockerfile','compose.yaml','.dockerignore','.gitignore','.env.example','README.md','SDK_PATCH.md','VERIFICATION.md')
foreach($relativeRoot in $roots) {
  $absoluteRoot=Join-Path $projectRoot $relativeRoot
  foreach($entry in Get-ChildItem -LiteralPath $absoluteRoot -File -Recurse -Force) {
    $relative=$entry.FullName.Substring($projectRoot.Length+1)
    if($relative -match '(?:^|[\\/])(?:\.git|target|node_modules|outputs|data)(?:[\\/]|$)'){continue}
    $files+=$relative
  }
}
foreach($relative in $files) {
  $source=Join-Path $projectRoot $relative
  $target=Join-Path $resolvedDestination $relative
  if(Test-Path -LiteralPath $target) {
    if((Get-FileHash -LiteralPath $source).Hash -eq (Get-FileHash -LiteralPath $target).Hash){continue}
    $backup=Join-Path $resolvedDestination ('.backups\'+$backupStamp+'\'+$relative)
    New-Item -ItemType Directory -Path (Split-Path -Parent $backup) -Force | Out-Null
    Copy-Item -LiteralPath $target -Destination $backup
  }
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  Copy-Item -LiteralPath $source -Destination $target
}
$envFile=Join-Path $resolvedDestination '.env'
if(!(Test-Path -LiteralPath $envFile)) {
  $localEnv=Join-Path $projectRoot '.env'
  if(Test-Path -LiteralPath $localEnv){Copy-Item -LiteralPath $localEnv -Destination $envFile}
}
Write-Output "Source synced to $resolvedDestination. Existing .env and data preserved."
Write-Output 'On the NAS, run: sudo sh tools/install-nas.sh'

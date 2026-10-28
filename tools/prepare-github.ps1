param()
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$destination=Join-Path $projectRoot 'outputs\github-upload'
if(Test-Path -LiteralPath $destination){throw 'Upload directory already exists; preserve it and choose a fresh directory.'}
New-Item -ItemType Directory -Path $destination | Out-Null
$files=@('Cargo.toml','Cargo.lock','package.json','package-lock.json','Dockerfile','compose.yaml','.dockerignore','.gitignore','.env.example','README.md','SDK_PATCH.md','VERIFICATION.md')
foreach($folder in @('node','engine','src','tests','tools','diagnostics','vendor')) {
  foreach($entry in Get-ChildItem -LiteralPath (Join-Path $projectRoot $folder) -File -Recurse -Force) {
    $relative=$entry.FullName.Substring($projectRoot.Length+1)
    if($relative -match '(?:^|[\\/])(?:\.git|target|node_modules|outputs|data|\.backups)(?:[\\/]|$)' -or $entry.Name -like '*.log' -or ($entry.Name -like '.env*' -and $entry.Name -ne '.env.example')){continue}
    $files+=$relative
  }
}
foreach($relative in $files) {
  $target=Join-Path $destination $relative
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $projectRoot $relative) -Destination $target
}
git -C $destination init -b main
if($LASTEXITCODE -ne 0){throw 'git init failed'}
git -C $destination add --all
if($LASTEXITCODE -ne 0){throw 'git add failed'}
git -C $destination commit -m 'Initial NAS Qimen Note4 application'
if($LASTEXITCODE -ne 0){throw 'git commit failed'}
Write-Output "Prepared independent repository: $destination"

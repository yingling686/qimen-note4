param([string]$Port='COM7',[int]$Seconds=45,[int]$Baud=115200)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$output=Join-Path $projectRoot 'outputs\note4-serial.log'
New-Item -ItemType Directory -Path (Split-Path -Parent $output) -Force | Out-Null
$serial=[System.IO.Ports.SerialPort]::new($Port,$Baud,[System.IO.Ports.Parity]::None,8,[System.IO.Ports.StopBits]::One)
$serial.DtrEnable=$false
$serial.RtsEnable=$false
$serial.ReadTimeout=100
$serial.Encoding=[System.Text.Encoding]::UTF8
$writer=[System.IO.StreamWriter]::new($output,$false,[System.Text.UTF8Encoding]::new($false))
try {
  $serial.Open()
  Write-Output "Read-only serial capture started on $Port (DTR/RTS disabled)."
  $deadline=[DateTime]::UtcNow.AddSeconds($Seconds)
  $count=0
  while([DateTime]::UtcNow -lt $deadline) {
    $chunk=$serial.ReadExisting()
    if($chunk.Length -gt 0){$writer.Write($chunk);$writer.Flush();$count+=$chunk.Length}
    Start-Sleep -Milliseconds 50
  }
  Write-Output "Captured $count characters to $output. Nothing was written to the device."
} finally {$serial.Dispose();$writer.Dispose()}

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ps = "powershell.exe"

$action1 = New-ScheduledTaskAction -Execute $ps `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$root\scripts\start-server.ps1`""
$trigger1 = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings1 = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
Register-ScheduledTask -TaskName "FreebieRadar Server" `
  -Action $action1 -Trigger $trigger1 -Settings $settings1 `
  -Description "Start freebie-radar local server at logon" -Force | Out-Null

$action2 = New-ScheduledTaskAction -Execute $ps `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$root\scripts\run-daily.ps1`""
$trigger2 = New-ScheduledTaskTrigger -Daily -At "08:30"
$settings2 = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName "FreebieRadar Daily" `
  -Action $action2 -Trigger $trigger2 -Settings $settings2 `
  -Description "Send freebie-radar daily digest to PushPlus at 08:30" -Force | Out-Null

Get-ScheduledTask -TaskName "FreebieRadar Server", "FreebieRadar Daily" |
  Select-Object TaskName, State | Format-Table -AutoSize
